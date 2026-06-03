import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { SessionStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import { Server as SocketServer } from 'socket.io';

function getIO(req: AuthenticatedRequest): SocketServer {
  return req.app.get('io') as SocketServer;
}

// POST /api/study-session
export async function createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  const io = getIO(req);
  const {
    subject,
    date,
    time,
    duration,
    note = '',
    visibility = 'private',
    invitedFriends = [],
  } = req.body as {
    subject: string;
    date: string;
    time: string;
    duration: number;
    note?: string;
    visibility?: 'private' | 'friends';
    invitedFriends?: string[];
  };

  const startAt = new Date(`${date}T${time}`);
  const creatorId = req.userId!;

  // Resolve friendCodes → user IDs
  const invitedUsers = await prisma.user.findMany({
    where: { friendCode: { in: invitedFriends } },
    select: { id: true, name: true },
  });
  const invitedUserIds = invitedUsers.map((u) => u.id);

  // Create session with creator as accepted + invited friends
  const doc = await prisma.studySession.create({
    data: {
      creatorId,
      subject,
      startAt,
      duration: parseInt(String(duration), 10),
      note,
      visibility,
      status: invitedUserIds.length > 0 ? 'pending' : 'scheduled',
      participants: {
        create: [
          {
            userId: creatorId,
            status: 'accepted',
            invitedAt: new Date(),
            respondedAt: new Date(),
          },
          ...invitedUserIds.map((friendId) => ({
            userId: friendId,
            status: 'invited' as const,
            invitedAt: new Date(),
          })),
        ],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  console.log('Created session:', doc);

  // Emit realtime invites to each invited user
  invitedUserIds.forEach((friendId) => {
    console.log(`📤 Emitting invite to user: ${friendId}`);
    io.to(String(friendId)).emit('receiveInvite', {
      id: doc.id,
      from: creatorId,
      name: req.user?.name || 'A friend',
      subject: doc.subject,
      startAt: doc.startAt,
      duration: doc.duration,
      note: doc.note,
      creator: creatorId,
      participants: doc.participants,
      status: doc.status,
    });
  });

  // Emit to creator
  io.to(String(creatorId)).emit('sessionCreated', { sessionId: doc.id, sessionDetails: doc });

  res.status(201).json(doc);
}

// GET /api/study-session/mine?status=active
export async function getMySessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { status } = req.query as { status?: string };

    // When status=active, only return sessions that are still relevant
    const activeStatuses: SessionStatus[] = [
      SessionStatus.scheduled,
      SessionStatus.pending,
      SessionStatus.in_progress,
    ];
    const statusFilter = status === 'active' ? { status: { in: activeStatuses } } : {};

    const sessions = await prisma.studySession.findMany({
      where: {
        ...statusFilter,
        OR: [
          { creatorId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
      orderBy: { startAt: 'asc' },
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

// GET /api/study-session/invites
export async function getMyInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const INVITE_TTL_MS = 15 * 60 * 1000;
    const invites = await prisma.studySession.findMany({
      where: {
        status: { in: ['pending', 'scheduled', 'in_progress'] },
        participants: {
          some: { 
            userId, 
            status: 'invited',
            invitedAt: { gte: new Date(Date.now() - INVITE_TTL_MS) }
          },
        },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    const formattedInvites = invites.map((session) => ({
      ...session,
      from: session.creator.id,
      name: session.creator.name,
    }));

    res.json(formattedInvites);
  } catch (err) {
    console.error('Error fetching invites:', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
}

// POST /api/study-session/:id/respond
export async function respondInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const io = getIO(req);
  const id = req.params['id'] as string;
  const { action } = req.body as { action: 'accept' | 'decline' };
  const userId = req.userId!;

  try {
    const newStatus: 'accepted' | 'declined' = action === 'accept' ? 'accepted' : 'declined';

    // Update participant status
    await prisma.participant.updateMany({
      where: { sessionId: id, userId },
      data: { status: newStatus, respondedAt: new Date() },
    });

    // Fetch updated session
    const session = await prisma.studySession.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (action === 'accept') {
      const hasAccepted = session.participants.some((p) => p.status === 'accepted');
      if (hasAccepted && session.status === 'pending') {
        await prisma.studySession.update({
          where: { id },
          data: { status: 'scheduled' },
        });
      }

      const acceptedParticipantIds = session.participants
        .filter((p) => p.status === 'accepted')
        .map((p) => p.userId);

      acceptedParticipantIds.forEach((uid) => {
        io.to(uid).emit('sessionScheduled', {
          sessionId: id,
          roomId: `session_${id}`,
          sessionDetails: session,
          message: 'Session is scheduled! You can now join.',
        });
      });

      io.to(session.creator.id).emit('inviteAccepted', {
        by: userId,
        name: req.user?.name || 'Someone',
        sessionDetails: session,
        sessionId: id,
        roomId: `session_${id}`,
      });
    } else {
      io.to(session.creator.id).emit('inviteDeclined', {
        by: userId,
        name: req.user?.name || 'Someone',
        sessionId: id,
        sessionDetails: session,
      });
    }

    io.to(userId).emit('session:updated', session);
    res.json({ ok: true, session });
  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({ error: 'Failed to respond to invite' });
  }
}

// POST /api/study-session/:id/cancel
export async function cancelSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  const io = getIO(req);
  const id = req.params['id'] as string;
  const userId = req.userId!;

  try {
    const session = await prisma.studySession.findFirst({
      where: { id, creatorId: userId },
      include: { participants: true },
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found or not authorized' });
      return;
    }

    const updated = await prisma.studySession.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    const notifyUsers = [session.creatorId, ...session.participants.map((p) => p.userId)];
    notifyUsers.forEach((uid) => {
      io.to(uid).emit('session:cancelled', { sessionId: id, sessionDetails: updated });
    });

    res.json({ ok: true, session: updated });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
}
