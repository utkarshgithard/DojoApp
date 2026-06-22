import express, { Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';
import { checkAndSyncAvatar } from '../utils/avatarSync.js';

const notificationRouter = express.Router();

// GET /api/notifications — Retrieve notifications for the current user
notificationRouter.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // limit to last 50 notifications
    });

    // Format sender avatars
    const formattedNotifications = await Promise.all(
      notifications.map(async (n) => {
        const avatarUrl = await checkAndSyncAvatar(n.sender);
        return {
          ...n,
          sender: {
            ...n.sender,
            avatarUrl,
          },
        };
      })
    );

    res.json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all — Mark all notifications as read
notificationRouter.put('/read-all', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[PUT /api/notifications/read-all]', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PUT /api/notifications/:id/read — Mark a specific notification as read
notificationRouter.put('/:id/read', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ success: true, notification: updated });
  } catch (err) {
    console.error('[PUT /api/notifications/:id/read]', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default notificationRouter;
