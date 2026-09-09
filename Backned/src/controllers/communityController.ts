import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import { checkAndSyncAvatar } from '../utils/avatarSync.js';
import { createNotification } from '../utils/notificationHelper.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

// Calculate the Hacker News style hot score: (upvotes - downvotes) / (age_in_hours + 2)^gravity
export const calculateHotScore = (likeCount: number, createdAt: Date): number => {
  const gravity = 1.8; // Standard Hacker News gravity constant
  const ageInHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

  // We use (likeCount + 1) instead of just likeCount so that posts with 0 likes 
  // still get a positive score that decays over time, rather than all being exactly 0.
  const upvotes = likeCount;
  const downvotes = 0; // App currently only supports likes

  return (upvotes - downvotes + 1) / Math.pow(ageInHours + 2, gravity);
};

const POSTS_PER_PAGE = 10;
const COMMENTS_CACHE_TTL = 60;

// ── Mentions ──────────────────────────────────────────────────────────────────

export interface MentionUser {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

const MENTION_TOKEN_RE = /@([A-Za-z][A-Za-z0-9_]{2,19})/g;

/** Extract unique @mention tokens (handles) from a piece of text. */
const extractMentionTokens = (content: string): string[] => {
  const tokens = new Set<string>();
  for (const match of content.matchAll(MENTION_TOKEN_RE)) {
    tokens.add(match[1]);
  }
  return Array.from(tokens);
};

/**
 * Resolve @mention tokens found in the given contents to real users.
 * Matches by username (exact, case-insensitive) or single-word display name.
 * Returns a map keyed by lowercase handle (username or name) → user.
 */
const resolveMentionedUsers = async (contents: string[]): Promise<Map<string, MentionUser>> => {
  const map = new Map<string, MentionUser>();
  const tokens = Array.from(new Set(contents.flatMap(extractMentionTokens)));
  if (tokens.length === 0) return map;
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { in: tokens.map((t) => t.toLowerCase()) } },
          { name: { in: tokens, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true },
      take: 100,
    });
    for (const user of users) {
      if (user.username) map.set(user.username.toLowerCase(), user);
      map.set(user.name.toLowerCase(), user);
    }
  } catch (err) {
    console.error('[resolveMentionedUsers]', err);
  }
  return map;
};

/** Deduped list of users mentioned in a single comment body. */
const buildCommentMentions = (content: string, mentionMap: Map<string, MentionUser>): MentionUser[] => {
  const seen = new Set<string>();
  const mentions: MentionUser[] = [];
  for (const token of extractMentionTokens(content)) {
    const user = mentionMap.get(token.toLowerCase());
    if (user && !seen.has(user.id)) {
      seen.add(user.id);
      mentions.push(user);
    }
  }
  return mentions;
};

// ── User search (for @mentions autocomplete) ─────────────────────────────────

export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q ?? '').replace(/^@+/, '').trim();
    if (!q) {
      res.json({ users: [] });
      return;
    }
    const safeLimit = Math.min(parseInt(String(req.query.limit ?? '')) || 8, 20);
    const users = await prisma.user.findMany({
      where: {
        verified: true,
        OR: [
          { username: { startsWith: q.toLowerCase() } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true },
      take: safeLimit * 3,
    });
    // Username prefix matches are most relevant for @mentions.
    const lower = q.toLowerCase();
    users.sort((a, b) => {
      const aStarts = a.username?.startsWith(lower) ? 0 : 1;
      const bStarts = b.username?.startsWith(lower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return (a.username ?? a.name).toLowerCase().localeCompare((b.username ?? b.name).toLowerCase());
    });
    res.json({ users: users.slice(0, safeLimit) });
  } catch (err) {
    console.error('[searchUsers]', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

const getCommentsCacheVersion = async (postId: string): Promise<string> =>
  (await cacheGet(`community:comments:version:${postId}`)) || '0';

const invalidateCommentsCache = async (postId: string): Promise<void> => {
  await cacheSet(
    `community:comments:version:${postId}`,
    Date.now().toString(),
    86400,
  );
};

const canViewCommunity = async (communityId: string, visibility: string, userId?: string) => {
  if (visibility === 'public') return true;
  if (!userId) return false;
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { userId: true },
  });
  return !!membership;
};

// ── Feed ─────────────────────────────────────────────────────────────────────

export const getPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const cursor = req.query.cursor as string | undefined;

    // Get the IDs of people the current user follows (only if logged in)
    let followingIds = new Set<string>();
    let joinedCommunityIds: string[] = [];
    if (userId) {
      const [followingRecords, memberships] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        }),
        prisma.communityMember.findMany({
          where: { userId },
          select: { communityId: true },
        }),
      ]);
      followingIds = new Set(followingRecords.map((f) => f.followingId));
      joinedCommunityIds = memberships.map((m) => m.communityId);
    }

    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: userId ? {
        OR: [
          { communityId: null },
          { communityId: { in: joinedCommunityIds } },
        ]
      } : {
        communityId: null,
      },
      orderBy: [
        { hotScore: 'desc' },
        { id: 'desc' }
      ],
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        media: { orderBy: { order: 'asc' } },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId }, select: { userId: true } } : undefined,
        community: {
          select: { id: true, name: true, slug: true, avatarUrl: true, visibility: true }
        }
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
          author: {
            ...post.author,
            avatarUrl,
          },
          media: post.media,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          likedByMe: userId ? (post.likes && post.likes.length > 0) : false,
          followedByMe: userId ? followingIds.has(post.author.id) : false,
          community: post.community,
        };
      })
    );

    // Boost followed-user posts slightly, but keep hotScore order primarily
    // We remove the strict "all followed posts on top" logic to respect the hot feed
    const sortedFormatted = formatted;

    res.json({ posts: sortedFormatted, nextCursor });
  } catch (err) {
    console.error('[getPosts]', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const getPostById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const id = req.params.id as string;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        media: { orderBy: { order: 'asc' } },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId }, select: { userId: true } } : undefined,
        community: {
          select: { id: true, name: true, slug: true, avatarUrl: true, visibility: true }
        }
      },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.community && !(await canViewCommunity(post.community.id, post.community.visibility, userId))) {
      res.status(403).json({ error: 'You must be a member to view this community post' });
      return;
    }

    let followedByMe = false;
    if (userId) {
      const followRecord = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: post.author.id,
          },
        },
      });
      followedByMe = !!followRecord;
    }

    const avatarUrl = await checkAndSyncAvatar(post.author);

    res.json({
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          ...post.author,
          avatarUrl,
        },
        media: post.media,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likedByMe: userId ? (post.likes && post.likes.length > 0) : false,
        followedByMe,
        community: post.community,
      },
    });
  } catch (err) {
    console.error('[getPostById]', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};


// ── Create Post ───────────────────────────────────────────────────────────────

export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content, media, communityId } = req.body as {
      content: string;
      media?: { url: string; type: 'image' | 'video'; thumbnailUrl?: string }[];
      communityId?: string;
    };

    if (!content?.trim() && (!media || media.length === 0)) {
      res.status(400).json({ error: 'Post must have text or media' });
      return;
    }

    if (content && content.length > 500) {
      res.status(400).json({ error: 'Content exceeds 500 characters' });
      return;
    }

    if (media && media.length > 5) {
      res.status(400).json({ error: 'Maximum 5 media attachments per post' });
      return;
    }

    // If posting to a community, verify membership and visibility
    let communityData: { id: string; name: string; slug: string; avatarUrl: string | null } | null = null;
    if (communityId) {
      const community = await prisma.community.findUnique({
        where: { id: communityId },
        include: {
          members: { where: { userId }, select: { userId: true } },
        },
      });
      if (!community) {
        res.status(404).json({ error: 'Community not found' });
        return;
      }
      const isMember = (community as any).members?.length > 0;
      if (!isMember) {
        res.status(403).json({ error: 'You must be a member to post in this community' });
        return;
      }
      communityData = { id: community.id, name: community.name, slug: community.slug, avatarUrl: community.avatarUrl };
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: content?.trim() ?? '',
        communityId: communityId || null,
        hotScore: calculateHotScore(0, new Date()), // Initialize hotScore
        media: media && media.length > 0
          ? {
            create: media.map((m, idx) => ({
              url: m.url,
              type: m.type,
              thumbnailUrl: m.thumbnailUrl ?? null,
              order: idx,
            })),
          }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        media: { orderBy: { order: 'asc' } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const avatarUrl = await checkAndSyncAvatar(post.author);

    res.status(201).json({
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          ...post.author,
          avatarUrl,
        },
        media: post.media,
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        followedByMe: false,
        community: communityData,
      },
    });
  } catch (err) {
    console.error('[createPost]', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};


// ── Edit Post ─────────────────────────────────────────────────────────────────

export const editPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      res.status(400).json({ error: 'Post must have text' });
      return;
    }

    if (content.length > 500) {
      res.status(400).json({ error: 'Content exceeds 500 characters' });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.userId !== userId) {
      res.status(403).json({ error: 'Not authorised to edit this post' });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { content: content.trim() },
    });

    res.json({ success: true, post: updatedPost });
  } catch (err) {
    console.error('[editPost]', err);
    res.status(500).json({ error: 'Failed to edit post' });
  }
};


// ── Delete Post ───────────────────────────────────────────────────────────────

export const deletePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const canDelete = post.userId === userId || isAdmin;

    if (!canDelete) {
      res.status(403).json({ error: 'Not authorised to delete this post' });
      return;
    }

    await prisma.post.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[deletePost]', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// ── Like / Unlike ─────────────────────────────────────────────────────────────

export const toggleLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const postId = req.params.id as string;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, createdAt: true },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId, userId } } });
      // Remove corresponding notification
      await prisma.notification.deleteMany({
        where: {
          userId: post.userId,
          senderId: userId,
          type: 'like',
          postId,
        },
      });
    } else {
      await prisma.postLike.create({ data: { postId, userId } });
      // Trigger notification (if liking someone else's post)
      if (post.userId !== userId) {
        const io = req.app.get('io');
        await createNotification(post.userId, userId, 'like', postId, undefined, io);
      }
    }

    const likeCount = await prisma.postLike.count({ where: { postId } });

    // Recalculate hot score
    const newScore = calculateHotScore(likeCount, post.createdAt);
    await prisma.post.update({
      where: { id: postId },
      data: { hotScore: newScore }
    });

    // Broadcast interaction
    const io = req.app.get('io');
    if (io) {
      io.emit('post_interaction', { postId, likeCount });
    }

    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error('[toggleLike]', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

export const toggleFollow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.userId!;
    const followingId = req.params.userId as string;
    const io = req.app.get('io');

    if (followerId === followingId) {
      res.status(400).json({ error: 'You cannot follow yourself' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      // 1. Delete follow record
      await prisma.userFollow.delete({ where: { followerId_followingId: { followerId, followingId } } });

      // 2. Dissolve mutual friendship if they were friends
      await prisma.userFriend.deleteMany({
        where: {
          OR: [
            { userId: followerId, friendId: followingId },
            { userId: followingId, friendId: followerId },
          ]
        }
      });

      const followerCount = await prisma.userFollow.count({ where: { followingId } });
      res.json({ following: false, followerCount, isFriend: false });
    } else {
      // 1. Create follow record
      await prisma.userFollow.create({ data: { followerId, followingId } });

      // 2. Check if mutual follow exists
      const mutualFollow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: followingId, // B follows A
            followingId: followerId, // A follows B
          }
        }
      });

      let isFriend = false;
      if (mutualFollow) {
        // Automatically become friends!
        await prisma.userFriend.createMany({
          data: [
            { userId: followerId, friendId: followingId },
            { userId: followingId, friendId: followerId },
          ],
          skipDuplicates: true,
        });
        isFriend = true;

        // Trigger real-time mutual friendship notification
        await createNotification(followingId, followerId, 'friendship_mutual', undefined, undefined, io);
      } else {
        // Trigger real-time follow request notification
        await createNotification(followingId, followerId, 'follow_request', undefined, undefined, io);
      }

      const followerCount = await prisma.userFollow.count({ where: { followingId } });
      res.json({ following: true, followerCount, isFriend });
    }
  } catch (err) {
    console.error('[toggleFollow]', err);
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

export const getFollowStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.userId;
    const followingId = req.params.userId as string;

    const [followRecord, followerCount, followingCount] = await Promise.all([
      followerId
        ? prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId, followingId } },
        })
        : null,
      prisma.userFollow.count({ where: { followingId } }),
      prisma.userFollow.count({ where: { followerId: followingId } }),
    ]);

    res.json({
      following: !!followRecord,
      followerCount,
      followingCount,
    });
  } catch (err) {
    console.error('[getFollowStatus]', err);
    res.status(500).json({ error: 'Failed to fetch follow status' });
  }
};

export const getFollowers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;
    const currentUserId = req.userId!;

    const records = await prisma.userFollow.findMany({
      where: { followingId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        follower: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Check which of these followers the current user also follows
    const ids = records.map((r) => r.followerId);
    const youFollowSet = new Set(
      (await prisma.userFollow.findMany({
        where: { followerId: currentUserId, followingId: { in: ids } },
        select: { followingId: true },
      })).map((r) => r.followingId)
    );

    const formatted = await Promise.all(
      records.map(async (r) => {
        const avatarUrl = await checkAndSyncAvatar(r.follower);
        return {
          id: r.follower.id,
          name: r.follower.name,
          avatarUrl,
          followedByMe: youFollowSet.has(r.follower.id),
          followedSince: r.createdAt,
        };
      })
    );

    res.json({ followers: formatted });
  } catch (err) {
    console.error('[getFollowers]', err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
};

export const getFollowing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;
    const currentUserId = req.userId!;

    const records = await prisma.userFollow.findMany({
      where: { followerId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        following: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Check which of these the current user also follows
    const ids = records.map((r) => r.followingId);
    const youFollowSet = new Set(
      (await prisma.userFollow.findMany({
        where: { followerId: currentUserId, followingId: { in: ids } },
        select: { followingId: true },
      })).map((r) => r.followingId)
    );

    const formatted = await Promise.all(
      records.map(async (r) => {
        const avatarUrl = await checkAndSyncAvatar(r.following);
        return {
          id: r.following.id,
          name: r.following.name,
          avatarUrl,
          followedByMe: youFollowSet.has(r.following.id),
          followedSince: r.createdAt,
        };
      })
    );

    res.json({ following: formatted });
  } catch (err) {
    console.error('[getFollowing]', err);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
};

// ── Suggested Users ────────────────────────────────────────────────────────────

export const getSuggestedUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    // Fetch current user's profile and social graph in parallel
    const [currentUser, myFriendRecords, myFollowRecords, myFollowerRecords, myMemberships] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { collegeCode: true, college: true },
      }),
      prisma.userFriend.findMany({ where: { userId }, select: { friendId: true } }),
      prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.userFollow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
      prisma.communityMember.findMany({ where: { userId }, select: { communityId: true } }),
    ]);

    const myFriendIds = new Set(myFriendRecords.map((f) => f.friendId));
    const myFollowingIds = new Set(myFollowRecords.map((f) => f.followingId));
    const myFollowerIds = new Set(myFollowerRecords.map((f) => f.followerId));
    const myCommunityIds = new Set(myMemberships.map((m) => m.communityId));

    // Users to exclude: self + existing friends + people we already follow
    const excludeIds = new Set([
      userId,
      ...myFriendIds,
      ...myFollowingIds,
    ]);

    // Fetch candidate users with their social graph for scoring
    const candidates = await prisma.user.findMany({
      where: { id: { notIn: Array.from(excludeIds) } },
      orderBy: { createdAt: 'desc' },
      // Fetch a wider pool so same-college users are not missed because of recency.
      take: Math.min(500, (offset + limit) * 20),
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        friendCode: true,
        username: true,
        collegeCode: true,
        college: true,
        communityMemberships: { select: { communityId: true } },
        friends: { select: { friendId: true } },
        followers: { select: { followerId: true } },
      },
    });

    // Score and annotate each candidate using Instagram algorithm weights
    const scored = candidates.map((u) => {
      const theirFriendIds = new Set(u.friends.map((f) => f.friendId));
      const theirFollowerIds = new Set(u.followers.map((f) => f.followerId));
      const theirCommunityIds = new Set(u.communityMemberships.map((m) => m.communityId));

      // Mutual & Social graph signals
      const followsYou = myFollowerIds.has(u.id);
      const mutualFriendCount = [...myFriendIds].filter((id) => theirFriendIds.has(id)).length;
      const mutualFollowerCount = [...myFollowerIds].filter((id) => theirFollowerIds.has(id)).length;
      const sharedCommunityCount = [...myCommunityIds].filter((id) => theirCommunityIds.has(id)).length;
      const sameCollege = Boolean(
        (currentUser?.collegeCode && u.collegeCode && currentUser.collegeCode === u.collegeCode) ||
        (!currentUser?.collegeCode && currentUser?.college && u.college && currentUser.college === u.college)
      );

      // Same-college users get a strong boost while social graph signals still break ties.
      const score =
        (sameCollege ? 30 : 0) +
        (followsYou ? 25 : 0) +
        mutualFriendCount * 15 +
        sharedCommunityCount * 8 +
        mutualFollowerCount * 5;

      return {
        ...u,
        score,
        followsYou,
        mutualFriendCount,
        mutualFollowerCount,
        sharedCommunityCount,
        sameCollege,
        theirFriendIds,
      };
    });

    // Sort by score descending, then slice to limit
    scored.sort((a, b) => b.score - a.score);
    const topSuggestions = scored.slice(offset, offset + limit);

    // Format suggestions with dynamic Instagram-style reason text and avatar previews
    const formatted = await Promise.all(
      topSuggestions.map(async (u) => {
        const avatarUrl = await checkAndSyncAvatar({ id: u.id, name: u.name, avatarUrl: u.avatarUrl } as any);

        // Collect mutual friend details (up to 3 for avatar previews)
        const mutualFriendIds = [...myFriendIds].filter((id) => u.theirFriendIds.has(id)).slice(0, 3);

        let mutualFriendPreviews: { id: string; name: string; avatarUrl: string | null }[] = [];
        if (mutualFriendIds.length > 0) {
          const mutualUsers = await prisma.user.findMany({
            where: { id: { in: mutualFriendIds } },
            select: { id: true, name: true, avatarUrl: true },
          });
          mutualFriendPreviews = await Promise.all(
            mutualUsers.map(async (mu) => ({
              id: mu.id,
              name: mu.name,
              avatarUrl: await checkAndSyncAvatar(mu as any),
            }))
          );
        }

        // Instagram-style human readable reason text
        let reason: string;
        if (u.sameCollege) {
          reason = 'From your college';
        } else if (u.followsYou) {
          reason = 'Follows you';
        } else if (mutualFriendPreviews.length > 0) {
          const firstMutualName = mutualFriendPreviews[0].name.split(' ')[0];
          const remainingCount = u.mutualFriendCount - 1;
          reason = remainingCount > 0
            ? `Followed by ${firstMutualName} + ${remainingCount} other${remainingCount > 1 ? 's' : ''}`
            : `Followed by ${firstMutualName}`;
        } else if (u.sharedCommunityCount > 0) {
          reason = u.sharedCommunityCount === 1
            ? 'In a community together'
            : `${u.sharedCommunityCount} shared communities`;
        } else if (u.mutualFollowerCount > 0) {
          reason = 'Followed by your network';
        } else {
          reason = 'Suggested for you';
        }

        return {
          id: u.id,
          name: u.name,
          avatarUrl,
          friendCode: u.friendCode,
          username: u.username,
          score: u.score,
          followsYou: u.followsYou,
          mutualFriends: u.mutualFriendCount,
          mutualFollowers: u.mutualFollowerCount,
          sharedCommunities: u.sharedCommunityCount,
          sameCollege: u.sameCollege,
          reason,
          mutualFriendPreviews,
        };
      })
    );

    res.json({
      suggestions: formatted,
      hasMore: offset + limit < scored.length,
      nextOffset: offset + formatted.length,
    });
  } catch (err) {
    console.error('[getSuggestedUsers]', err);
    res.status(500).json({ error: 'Failed to fetch suggested users' });
  }
};

// ── My Network (friends + follow counts) ──────────────────────────────────────

export const getMyNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [friendData, followingData, followerData] = await Promise.all([
      // Friends (bidirectional)
      prisma.userFriend.findMany({
        where: { userId },
        include: {
          friend: { select: { id: true, name: true, avatarUrl: true, friendCode: true, username: true } },
        },
      }),
      // Following (people I follow)
      prisma.userFollow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          following: { select: { id: true, name: true, avatarUrl: true, username: true } },
        },
      }),
      // Followers (people who follow me)
      prisma.userFollow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          follower: { select: { id: true, name: true, avatarUrl: true, username: true } },
        },
      }),
    ]);

    // ── Mutual connections computation ──────────────────────────────────────
    // For each friend, find which of my OTHER friends are also friends with them.
    const myFriendIds = friendData.map((f) => f.friendId);

    // Fetch each friend's friend list in one batched query
    const friendsOfFriends = await prisma.userFriend.findMany({
      where: {
        userId: { in: myFriendIds },
        friendId: { in: myFriendIds },
      },
      select: { userId: true, friendId: true },
    });

    // Build a map: friendId -> Set of mutual friend IDs (excluding themselves)
    const mutualMap = new Map<string, Set<string>>();
    for (const record of friendsOfFriends) {
      if (record.userId === record.friendId) continue; // skip self
      if (!mutualMap.has(record.userId)) {
        mutualMap.set(record.userId, new Set());
      }
      mutualMap.get(record.userId)!.add(record.friendId);
    }

    // Collect all mutual friend IDs so we can fetch their details in one query
    const allMutualIds = new Set<string>();
    for (const set of mutualMap.values()) {
      for (const id of set) allMutualIds.add(id);
    }

    const mutualUserDetails = await prisma.user.findMany({
      where: { id: { in: Array.from(allMutualIds) } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const mutualDetailsMap = new Map<string, { id: string; name: string; avatarUrl: string | null }>();
    for (const mu of mutualUserDetails) {
      const avatarUrl = await checkAndSyncAvatar(mu as any);
      mutualDetailsMap.set(mu.id, { id: mu.id, name: mu.name, avatarUrl });
    }

    const friends = await Promise.all(
      friendData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.friend);

        // Build mutual connection previews (up to 3 avatars)
        const mutualIds = mutualMap.get(f.friendId);
        const mutualFriendPreviews = mutualIds
          ? Array.from(mutualIds)
            .slice(0, 3)
            .map((id) => mutualDetailsMap.get(id))
            .filter((m): m is { id: string; name: string; avatarUrl: string | null } => !!m)
          : [];

        return {
          id: f.friend.id,
          name: f.friend.name,
          avatarUrl,
          friendCode: f.friend.friendCode,
          username: f.friend.username,
          mutualFriends: mutualIds ? mutualIds.size : 0,
          mutualFriendPreviews,
        };
      })
    );

    const following = await Promise.all(
      followingData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.following);
        return { id: f.following.id, name: f.following.name, avatarUrl, username: f.following.username, since: f.createdAt };
      })
    );

    const followers = await Promise.all(
      followerData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.follower);
        // Does the current user follow them back?
        const followsBack = followingData.some((fw) => fw.followingId === f.follower.id);
        return { id: f.follower.id, name: f.follower.name, avatarUrl, username: f.follower.username, followsBack, since: f.createdAt };
      })
    );

    res.json({ friends, following, followers });
  } catch (err) {
    console.error('[getMyNetwork]', err);
    res.status(500).json({ error: 'Failed to fetch network' });
  }
};


export const sharePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.userId!;
    const postId = req.params.id as string;
    const { receiverIds } = req.body as { receiverIds: string[] };

    if (!receiverIds || !Array.isArray(receiverIds) || receiverIds.length === 0) {
      res.status(400).json({ error: 'receiverIds must be a non-empty array' });
      return;
    }

    if (receiverIds.length > 10) {
      res.status(400).json({ error: 'Cannot share with more than 10 people at once' });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Verify all receivers are friends of the sender
    const friendships = await prisma.userFriend.findMany({
      where: { userId: senderId, friendId: { in: receiverIds } },
      select: { friendId: true },
    });
    const validReceiverIds = friendships.map((f) => f.friendId);

    if (validReceiverIds.length === 0) {
      res.status(400).json({ error: 'No valid friends found in receiverIds' });
      return;
    }

    await prisma.postShare.createMany({
      data: validReceiverIds.map((receiverId) => ({ postId, senderId, receiverId })),
      skipDuplicates: true,
    });

    res.json({ success: true, sharedWith: validReceiverIds.length });
  } catch (err) {
    console.error('[sharePost]', err);
    res.status(500).json({ error: 'Failed to share post' });
  }
};

// ── Shared With Me ────────────────────────────────────────────────────────────

export const getSharedWithMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const includeViewed = req.query.includeViewed === 'true';
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 5;

    const shares = await prisma.postShare.findMany({
      where: {
        receiverId: userId,
        ...(includeViewed ? {} : { viewed: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        post: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            media: { orderBy: { order: 'asc' } },
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    const hasNextPage = shares.length > limit;
    const page = hasNextPage ? shares.slice(0, limit) : shares;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    const formatted = await Promise.all(
      page.map(async (share) => {
        const [authorAvatar, senderAvatar] = await Promise.all([
          checkAndSyncAvatar(share.post.author),
          checkAndSyncAvatar(share.sender),
        ]);
        return {
          shareId: share.id,
          sharedAt: share.createdAt,
          viewed: share.viewed,
          sender: { ...share.sender, avatarUrl: senderAvatar },
          post: {
            id: share.post.id,
            content: share.post.content,
            createdAt: share.post.createdAt,
            updatedAt: share.post.updatedAt,
            author: { ...share.post.author, avatarUrl: authorAvatar },
            media: share.post.media,
            likeCount: share.post._count.likes,
            commentCount: share.post._count.comments,
            likedByMe: share.post.likes.length > 0,
            followedByMe: false,
          },
        };
      })
    );

    const totalCount = await prisma.postShare.count({ where: { receiverId: userId, viewed: false } });
    res.json({ shares: formatted, nextCursor, totalCount });
  } catch (err) {
    console.error('[getSharedWithMe]', err);
    res.status(500).json({ error: 'Failed to fetch shared posts' });
  }
};

export const markShareAsViewed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;

    const share = await prisma.postShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      res.status(404).json({ error: 'Share record not found' });
      return;
    }

    if (share.receiverId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.postShare.update({
      where: { id: shareId },
      data: { viewed: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[markShareAsViewed]', err);
    res.status(500).json({ error: 'Failed to mark share as viewed' });
  }
};

// ── Comments ──────────────────────────────────────────────────────────────────

export const getComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const postId = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string | undefined;
    const [post, version] = await Promise.all([
      prisma.post.findUnique({
        where: { id: postId },
        select: { community: { select: { id: true, visibility: true } } },
      }),
      getCommentsCacheVersion(postId),
    ]);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    if (post.community && !(await canViewCommunity(post.community.id, post.community.visibility, req.userId))) {
      res.status(403).json({ error: 'You must be a member to view this community post' });
      return;
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const cacheKey = `community:comments:${postId}:${safeLimit}:${cursor || 'first'}:${version}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const topLevelComments = await prisma.postComment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: safeLimit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });

    const hasNextPage = topLevelComments.length > safeLimit;
    const page = hasNextPage ? topLevelComments.slice(0, safeLimit) : topLevelComments;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    const topLevelIds = page.map((c) => c.id);
    const replies = await prisma.postComment.findMany({
      where: { postId, parentId: { in: topLevelIds } },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });

    const allComments = [...page, ...replies].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const formatted = await Promise.all(
      allComments.map(async (c) => {
        const avatarUrl = await checkAndSyncAvatar(c.author);
        return {
          ...c,
          author: {
            ...c.author,
            avatarUrl,
          },
        };
      })
    );

    // Resolve @mentions across all returned comments so the client can render clickable tags.
    const mentionMap = await resolveMentionedUsers(allComments.map((c) => c.content));

    const response = {
      comments: formatted,
      nextCursor,
      mentions: Object.fromEntries(mentionMap),
    };
    await cacheSet(cacheKey, JSON.stringify(response), COMMENTS_CACHE_TTL);
    res.json(response);
  } catch (err) {
    console.error('[getComments]', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const postId = req.params.id as string;
    const { content, parentId } = req.body as { content: string; parentId?: string };

    if (!content?.trim()) {
      res.status(400).json({ error: 'Comment cannot be empty' });
      return;
    }

    if (content.length > 300) {
      res.status(400).json({ error: 'Comment exceeds 300 characters' });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (parentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });
      if (!parentComment || parentComment.postId !== postId) {
        res.status(404).json({ error: 'Parent comment not found' });
        return;
      }
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });

    const avatarUrl = await checkAndSyncAvatar(comment.author);

    const io = req.app.get('io');

    // Notify @mentioned users (including the post author / parent author if they are tagged)
    const mentionMap = await resolveMentionedUsers([comment.content]);
    const mentioned = buildCommentMentions(comment.content, mentionMap);
    const notifiedIds = new Set<string>([userId]);
    for (const mentionedUser of mentioned) {
      if (notifiedIds.has(mentionedUser.id)) continue;
      notifiedIds.add(mentionedUser.id);
      await createNotification(mentionedUser.id, userId, 'mention', postId, comment.id, io);
    }

    // Trigger comment notification (if commenting on someone else's post)
    if (post.userId !== userId && !notifiedIds.has(post.userId)) {
      await createNotification(post.userId, userId, 'comment', postId, comment.id, io);
    }

    // Trigger reply notification (if replying to someone else's comment)
    if (parentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (
        parentComment &&
        parentComment.userId !== userId &&
        parentComment.userId !== post.userId &&
        !notifiedIds.has(parentComment.userId)
      ) {
        await createNotification(parentComment.userId, userId, 'comment', postId, comment.id, io);
      }
    }

    const commentCount = await prisma.postComment.count({ where: { postId } });
    await invalidateCommentsCache(postId);
    if (io) {
      io.emit('post_interaction', { postId, commentCount });
    }

    res.status(201).json({
      comment: {
        ...comment,
        author: {
          ...comment.author,
          avatarUrl,
        },
      },
      mentions: Object.fromEntries(mentionMap),
    });
  } catch (err) {
    console.error('[addComment]', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const editComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const commentId = req.params.commentId as string;
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      res.status(400).json({ error: 'Comment cannot be empty' });
      return;
    }

    if (content.length > 300) {
      res.status(400).json({ error: 'Comment exceeds 300 characters' });
      return;
    }

    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.userId !== userId) {
      res.status(403).json({ error: 'Not authorised to edit this comment' });
      return;
    }

    const updatedComment = await prisma.postComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });

    // Newly tagged users get notified on edit
    const io = req.app.get('io');
    const mentionMap = await resolveMentionedUsers([updatedComment.content]);
    const mentioned = buildCommentMentions(updatedComment.content, mentionMap);
    for (const mentionedUser of mentioned) {
      if (mentionedUser.id === userId) continue;
      await createNotification(mentionedUser.id, userId, 'mention', comment.postId, commentId, io);
    }

    await invalidateCommentsCache(comment.postId);
    res.json({ success: true, comment: updatedComment, mentions: Object.fromEntries(mentionMap) });
  } catch (err) {
    console.error('[editComment]', err);
    res.status(500).json({ error: 'Failed to edit comment' });
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const commentId = req.params.commentId as string;

    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const canDelete = comment.userId === userId;

    if (!canDelete) {
      res.status(403).json({ error: 'Not authorised to delete this comment' });
      return;
    }

    await prisma.postComment.delete({ where: { id: commentId } });

    const commentCount = await prisma.postComment.count({ where: { postId: comment.postId } });
    await invalidateCommentsCache(comment.postId);
    const io = req.app.get('io');
    if (io) {
      io.emit('post_interaction', { postId: comment.postId, commentCount });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteComment]', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

export const getUserPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId as string;
    const cursor = req.query.cursor as string | undefined;
    const visibleCommunityIds = currentUserId
      ? (await prisma.communityMember.findMany({
          where: { userId: currentUserId },
          select: { communityId: true },
        })).map((membership) => membership.communityId)
      : [];

    const [posts, followRecord] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId: targetUserId,
          OR: [
            { communityId: null },
            { community: { visibility: 'public' } },
            ...(visibleCommunityIds.length > 0 ? [{ communityId: { in: visibleCommunityIds } }] : []),
          ],
        },
        take: POSTS_PER_PAGE + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
          media: { orderBy: { order: 'asc' } },
          _count: { select: { likes: true, comments: true } },
          likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : undefined,
          community: {
            select: { id: true, name: true, slug: true, avatarUrl: true }
          }
        },
      }),
      currentUserId
        ? prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
        })
        : null,
    ]);

    const followedByMe = !!followRecord;

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
          author: {
            ...post.author,
            avatarUrl,
          },
          media: post.media,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          likedByMe: currentUserId ? (post.likes && post.likes.length > 0) : false,
          followedByMe,
          community: post.community,
        };
      })
    );

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error('[getUserPosts]', err);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};
