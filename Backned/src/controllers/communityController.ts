import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import { checkAndSyncAvatar } from '../utils/avatarSync.js';

const POSTS_PER_PAGE = 10;

// ── Feed ─────────────────────────────────────────────────────────────────────

export const getPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const cursor = req.query.cursor as string | undefined;

    // Get the IDs of people the current user follows (only if logged in)
    let followingIds = new Set<string>();
    if (userId) {
      const followingRecords = await prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      followingIds = new Set(followingRecords.map((f) => f.followingId));
    }

    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
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
          author: {
            ...post.author,
            avatarUrl,
          },
          media: post.media,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          likedByMe: userId ? (post.likes && post.likes.length > 0) : false,
          followedByMe: userId ? followingIds.has(post.author.id) : false,
        };
      })
    );

    // Boost followed-user posts to top, preserving recency order within each group (only if logged in)
    let sortedFormatted = formatted;
    if (userId) {
      const followedPosts = formatted.filter((p) => p.followedByMe && p.author.id !== userId);
      const otherPosts = formatted.filter((p) => !p.followedByMe || p.author.id === userId);
      sortedFormatted = [...followedPosts, ...otherPosts];
    }

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
      },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
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
    const { content, media } = req.body as {
      content: string;
      media?: { url: string; type: 'image' | 'video'; thumbnailUrl?: string }[];
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

    const post = await prisma.post.create({
      data: {
        userId,
        content: content?.trim() ?? '',
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
      },
    });
  } catch (err) {
    console.error('[createPost]', err);
    res.status(500).json({ error: 'Failed to create post' });
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

    const canDelete = post.userId === userId;

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

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId, userId } } });
    } else {
      await prisma.postLike.create({ data: { postId, userId } });
    }

    const likeCount = await prisma.postLike.count({ where: { postId } });
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
      await prisma.userFollow.delete({ where: { followerId_followingId: { followerId, followingId } } });
      const followerCount = await prisma.userFollow.count({ where: { followingId } });
      res.json({ following: false, followerCount });
    } else {
      await prisma.userFollow.create({ data: { followerId, followingId } });
      const followerCount = await prisma.userFollow.count({ where: { followingId } });
      res.json({ following: true, followerCount });
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

// ── My Network (friends + follow counts) ──────────────────────────────────────

export const getMyNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [friendData, followingData, followerData] = await Promise.all([
      // Friends (bidirectional)
      prisma.userFriend.findMany({
        where: { userId },
        include: {
          friend: { select: { id: true, name: true, avatarUrl: true, friendCode: true } },
        },
      }),
      // Following (people I follow)
      prisma.userFollow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          following: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      // Followers (people who follow me)
      prisma.userFollow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          follower: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
    ]);

    const friends = await Promise.all(
      friendData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.friend);
        return { id: f.friend.id, name: f.friend.name, avatarUrl, friendCode: f.friend.friendCode };
      })
    );

    const following = await Promise.all(
      followingData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.following);
        return { id: f.following.id, name: f.following.name, avatarUrl, since: f.createdAt };
      })
    );

    const followers = await Promise.all(
      followerData.map(async (f) => {
        const avatarUrl = await checkAndSyncAvatar(f.follower);
        // Does the current user follow them back?
        const followsBack = followingData.some((fw) => fw.followingId === f.follower.id);
        return { id: f.follower.id, name: f.follower.name, avatarUrl, followsBack, since: f.createdAt };
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
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    const formatted = await Promise.all(
      comments.map(async (c) => {
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

    res.json({ comments: formatted });
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

    const postExists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!postExists) {
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
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const avatarUrl = await checkAndSyncAvatar(comment.author);

    res.status(201).json({
      comment: {
        ...comment,
        author: {
          ...comment.author,
          avatarUrl,
        },
      },
    });
  } catch (err) {
    console.error('[addComment]', err);
    res.status(500).json({ error: 'Failed to add comment' });
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

    const [posts, followRecord] = await Promise.all([
      prisma.post.findMany({
        where: { userId: targetUserId },
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
        };
      })
    );

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error('[getUserPosts]', err);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

