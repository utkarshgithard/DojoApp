import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';

const POSTS_PER_PAGE = 10;
const MEMBERS_PER_PAGE = 20;

// ── Validation helper ─────────────────────────────────────────────────────────
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

// ── Create Community ──────────────────────────────────────────────────────────
export const createCommunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name, slug, description, visibility, avatarUrl, bannerUrl } = req.body as {
      name: string;
      slug: string;
      description?: string;
      visibility?: 'public' | 'private' | 'invite_only';
      avatarUrl?: string;
      bannerUrl?: string;
    };

    if (!name?.trim() || !slug?.trim()) {
      res.status(400).json({ error: 'Name and slug are required' });
      return;
    }

    if (!isValidSlug(slug)) {
      res.status(400).json({
        error: 'Slug must be lowercase letters/numbers/hyphens, 3–50 characters',
      });
      return;
    }

    const existing = await prisma.community.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ error: 'A community with this slug already exists' });
      return;
    }

    const community = await prisma.community.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        visibility: visibility || 'public',
        creatorId: userId,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        memberCount: 1,
        members: {
          create: { userId, role: 'creator' },
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, posts: true } },
      },
    });

    res.status(201).json({ community: formatCommunity(community, userId) });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'A community with this slug already exists' });
      return;
    }
    console.error('[createCommunity]', err);
    res.status(500).json({ error: 'Failed to create community' });
  }
};

// ── Get All Communities (Discover) ────────────────────────────────────────────
export const getCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const cursor = req.query.cursor as string | undefined;
    const search = req.query.search as string | undefined;
    const filter = req.query.filter as string | undefined; // 'joined' | 'created'

    const PAGE = 20;

    let whereClause: any = {};

    // Non-authenticated users only see public communities
    if (!userId) {
      whereClause.visibility = 'public';
    } else if (filter === 'joined') {
      whereClause.members = { some: { userId } };
    } else if (filter === 'created') {
      whereClause.creatorId = userId;
    } else {
      // Authenticated users see public + communities they're in
      whereClause.OR = [
        { visibility: 'public' },
        { members: { some: { userId } } },
      ];
    }

    if (search?.trim()) {
      const s = search.trim();
      whereClause.AND = [
        {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { slug: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const communities = await prisma.community.findMany({
      take: PAGE + 1,
      ...(cursor ? { skip: 1, cursor: { slug: cursor } } : {}),
      where: whereClause,
      orderBy: { memberCount: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, posts: true } },
        ...(userId
          ? {
              members: {
                where: { userId },
                select: { userId: true, role: true },
              },
            }
          : {}),
      },
    });

    const hasNextPage = communities.length > PAGE;
    const page = hasNextPage ? communities.slice(0, PAGE) : communities;
    const nextCursor = hasNextPage ? page[page.length - 1].slug : null;

    res.json({
      communities: page.map((c) => formatCommunity(c, userId)),
      nextCursor,
    });
  } catch (err) {
    console.error('[getCommunities]', err);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
};

// ── Get Single Community ──────────────────────────────────────────────────────
export const getCommunityBySlug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const slug = req.params.slug as string;

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, posts: true } },
        ...(userId
          ? {
              members: {
                where: { userId },
                select: { userId: true, role: true },
              },
            }
          : {}),
      },
    });

    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    // Check access for private/invite-only
    if (community.visibility !== 'public' && userId) {
      const isMember = (community as any).members?.length > 0;
      if (!isMember && community.creatorId !== userId) {
        res.status(403).json({ error: 'This community is private' });
        return;
      }
    } else if (community.visibility !== 'public' && !userId) {
      res.status(403).json({ error: 'This community is private' });
      return;
    }

    res.json({ community: formatCommunity(community, userId) });
  } catch (err) {
    console.error('[getCommunityBySlug]', err);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
};

// ── Update Community ──────────────────────────────────────────────────────────
export const updateCommunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;
    const { name, description, visibility, avatarUrl, bannerUrl } = req.body;

    const community = await prisma.community.findUnique({
      where: { slug },
      include: { members: { where: { userId }, select: { role: true } } },
    });

    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    const userRole = (community as any).members?.[0]?.role;
    const canEdit = userRole === 'creator' || userRole === 'moderator';
    if (!canEdit) {
      res.status(403).json({ error: 'Only the creator or moderators can edit this community' });
      return;
    }

    const updated = await prisma.community.update({
      where: { slug },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(visibility ? { visibility } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(bannerUrl !== undefined ? { bannerUrl } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, posts: true } },
        members: { where: { userId }, select: { userId: true, role: true } },
      },
    });

    res.json({ community: formatCommunity(updated, userId) });
  } catch (err) {
    console.error('[updateCommunity]', err);
    res.status(500).json({ error: 'Failed to update community' });
  }
};

// ── Delete Community ──────────────────────────────────────────────────────────
export const deleteCommunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    if (community.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can delete this community' });
      return;
    }

    await prisma.community.delete({ where: { slug } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[deleteCommunity]', err);
    res.status(500).json({ error: 'Failed to delete community' });
  }
};

// ── Join / Leave Community ────────────────────────────────────────────────────
export const joinOrLeaveCommunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    if (community.creatorId === userId) {
      res.status(400).json({ error: 'Creator cannot leave their own community' });
      return;
    }

    const existing = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    });

    if (existing) {
      // Leave
      await prisma.$transaction([
        prisma.communityMember.delete({
          where: { communityId_userId: { communityId: community.id, userId } },
        }),
        prisma.community.update({
          where: { id: community.id },
          data: { memberCount: { decrement: 1 } },
        }),
      ]);
      res.json({ joined: false, memberCount: community.memberCount - 1 });
    } else {
      // For invite-only communities, check if user has an accepted invite
      if (community.visibility === 'invite_only') {
        const invite = await prisma.communityInvite.findUnique({
          where: { communityId_invitedId: { communityId: community.id, invitedId: userId } },
        });
        if (!invite || !invite.accepted) {
          res.status(403).json({ error: 'This community is invite-only. You need an invite to join.' });
          return;
        }
      }

      // Join
      await prisma.$transaction([
        prisma.communityMember.create({
          data: { communityId: community.id, userId, role: 'member' },
        }),
        prisma.community.update({
          where: { id: community.id },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
      res.json({ joined: true, memberCount: community.memberCount + 1 });
    }
  } catch (err: any) {
    console.error('[joinOrLeaveCommunity]', err);
    res.status(500).json({ error: 'Failed to update membership' });
  }
};

// ── Update Member Role (promote to moderator, demote) ────────────────────────
export const updateMemberRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;
    const memberId = req.params.memberId as string;
    const { role } = req.body as { role: 'moderator' | 'member' };

    if (!['moderator', 'member'].includes(role)) {
      res.status(400).json({ error: 'Role must be "moderator" or "member"' });
      return;
    }

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    if (community.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can change member roles' });
      return;
    }

    if (memberId === userId) {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    await prisma.communityMember.update({
      where: { communityId_userId: { communityId: community.id, userId: memberId } },
      data: { role },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[updateMemberRole]', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// ── Remove Member ─────────────────────────────────────────────────────────────
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;
    const memberId = req.params.memberId as string;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    const userRole = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
      select: { role: true },
    });

    const canRemove = userRole?.role === 'creator' || userRole?.role === 'moderator';
    if (!canRemove) {
      res.status(403).json({ error: 'Only moderators or the creator can remove members' });
      return;
    }

    if (memberId === community.creatorId) {
      res.status(400).json({ error: 'Cannot remove the creator' });
      return;
    }

    await prisma.$transaction([
      prisma.communityMember.delete({
        where: { communityId_userId: { communityId: community.id, userId: memberId } },
      }),
      prisma.community.update({
        where: { id: community.id },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[removeMember]', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// ── Get Members ───────────────────────────────────────────────────────────────
export const getCommunityMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const cursor = req.query.cursor as string | undefined;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    const members = await prisma.communityMember.findMany({
      take: MEMBERS_PER_PAGE + 1,
      ...(cursor ? { skip: 1, cursor: { communityId_userId: { communityId: community.id, userId: cursor } } } : {}),
      where: { communityId: community.id },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const hasNextPage = members.length > MEMBERS_PER_PAGE;
    const page = hasNextPage ? members.slice(0, MEMBERS_PER_PAGE) : members;
    const nextCursor = hasNextPage ? page[page.length - 1].userId : null;

    res.json({
      members: page.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      nextCursor,
    });
  } catch (err) {
    console.error('[getCommunityMembers]', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

// ── Get Community Posts ───────────────────────────────────────────────────────
export const getCommunityPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { checkAndSyncAvatar } = await import('../utils/avatarSync.js');
    const userId = req.userId;
    const slug = req.params.slug as string;
    const cursor = req.query.cursor as string | undefined;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    // Check access for private/invite-only
    if (community.visibility !== 'public') {
      if (!userId) {
        res.status(403).json({ error: 'Login required to view this community' });
        return;
      }
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId } },
      });
      if (!membership) {
        res.status(403).json({ error: 'You must be a member to view this community' });
        return;
      }
    }

    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { communityId: community.id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        media: { orderBy: { order: 'asc' } },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId }, select: { userId: true } } : undefined,
      },
    });

    const hasNextPage = posts.length > POSTS_PER_PAGE;
    const page = hasNextPage ? posts.slice(0, POSTS_PER_PAGE) : posts;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    const formatted = await Promise.all(
      page.map(async (post) => {
        const avatarUrl = await checkAndSyncAvatar(post.author);
        return {
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: { ...post.author, avatarUrl },
          media: post.media,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          likedByMe: userId ? (post.likes && post.likes.length > 0) : false,
          community: {
            id: community.id,
            name: community.name,
            slug: community.slug,
            avatarUrl: community.avatarUrl,
          },
        };
      })
    );

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error('[getCommunityPosts]', err);
    res.status(500).json({ error: 'Failed to fetch community posts' });
  }
};

// ── Delete Post (moderation) ──────────────────────────────────────────────────
export const moderateDeletePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;
    const postId = req.params.postId as string;

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
      select: { role: true },
    });

    const canModerate = membership?.role === 'creator' || membership?.role === 'moderator';
    if (!canModerate) {
      res.status(403).json({ error: 'Only moderators can remove posts from this community' });
      return;
    }

    const post = await prisma.post.findFirst({
      where: { id: postId, communityId: community.id },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found in this community' });
      return;
    }

    await prisma.post.delete({ where: { id: postId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[moderateDeletePost]', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// ── Send Invite ───────────────────────────────────────────────────────────────
export const sendInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug as string;
    const { invitedUserId } = req.body;

    if (!invitedUserId) {
      res.status(400).json({ error: 'invitedUserId is required' });
      return;
    }

    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    // Only members can invite to invite-only; anyone can invite to public/private
    const senderMembership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    });
    if (!senderMembership) {
      res.status(403).json({ error: 'You must be a member to send invites' });
      return;
    }

    // Check if already a member
    const alreadyMember = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: invitedUserId } },
    });
    if (alreadyMember) {
      res.status(409).json({ error: 'User is already a member' });
      return;
    }

    const invite = await prisma.communityInvite.upsert({
      where: { communityId_invitedId: { communityId: community.id, invitedId: invitedUserId } },
      create: {
        communityId: community.id,
        invitedById: userId,
        invitedId: invitedUserId,
        accepted: false,
      },
      update: { invitedById: userId, accepted: false },
    });

    res.status(201).json({ invite });
  } catch (err) {
    console.error('[sendInvite]', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
};

// ── Accept Invite ─────────────────────────────────────────────────────────────
export const acceptInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const inviteId = req.params.inviteId as string;

    const invite = await prisma.communityInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.invitedId !== userId) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.accepted) {
      res.status(409).json({ error: 'Invite already accepted' });
      return;
    }

    await prisma.$transaction([
      prisma.communityInvite.update({
        where: { id: inviteId },
        data: { accepted: true },
      }),
      prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        create: { communityId: invite.communityId, userId, role: 'member' },
        update: {},
      }),
      prisma.community.update({
        where: { id: invite.communityId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[acceptInvite]', err);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

// ── Decline Invite ─────────────────────────────────────────────────────────────
export const declineInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const inviteId = req.params.inviteId as string;

    const invite = await prisma.communityInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.invitedId !== userId) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    await prisma.communityInvite.delete({ where: { id: inviteId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[declineInvite]', err);
    res.status(500).json({ error: 'Failed to decline invite' });
  }
};

// ── Get My Invites ────────────────────────────────────────────────────────────
export const getMyInvites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const invites = await prisma.communityInvite.findMany({
      where: { invitedId: userId, accepted: false },
      include: {
        community: { select: { id: true, name: true, slug: true, avatarUrl: true, memberCount: true } },
        invitedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ invites });
  } catch (err) {
    console.error('[getMyInvites]', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

// ── Get My Joined Communities ─────────────────────────────────────────────────
export const getMyJoinedCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: {
        community: {
          include: {
            creator: { select: { id: true, name: true, avatarUrl: true } },
            _count: { select: { members: true, posts: true } },
          },
        },
      },
    });

    const communities = memberships.map((m) => ({
      ...formatCommunity(m.community as any, userId),
      myRole: m.role,
    }));

    res.json({ communities });
  } catch (err) {
    console.error('[getMyJoinedCommunities]', err);
    res.status(500).json({ error: 'Failed to fetch your communities' });
  }
};

// ── Format helper ─────────────────────────────────────────────────────────────
function formatCommunity(c: any, userId?: string | null) {
  const myMembership = c.members?.[0]; // only set when `members: { where: { userId } }` was used
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    avatarUrl: c.avatarUrl,
    bannerUrl: c.bannerUrl,
    visibility: c.visibility,
    memberCount: c.memberCount,
    postCount: c._count?.posts ?? 0,
    createdAt: c.createdAt,
    creator: c.creator,
    joined: !!myMembership,
    myRole: myMembership?.role ?? null,
  };
}
