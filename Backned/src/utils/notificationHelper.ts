import prisma from '../lib/prisma.js';
import { sendPushToUser } from './pushService.js';
import { checkAndSyncAvatar } from './avatarSync.js';

export interface NotificationPayload {
  id: string;
  userId: string;
  senderId: string;
  type: string;
  postId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

/**
 * Creates a notification in the database, emits it in real-time over socket, and fires a Web Push notification.
 */
export async function createNotification(
  userId: string,
  senderId: string,
  type: string,
  postId?: string,
  commentId?: string,
  io?: any
): Promise<NotificationPayload | null> {
  // Guard: Do not notify oneself
  if (userId === senderId) return null;

  try {
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        senderId,
        type,
        postId: postId || null,
        commentId: commentId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 2. Sync sender avatar URL
    const avatarUrl = await checkAndSyncAvatar(notification.sender);
    const formattedNotification: NotificationPayload = {
      ...notification,
      sender: {
        ...notification.sender,
        avatarUrl,
      },
    };

    // 3. Emit real-time socket event
    if (io) {
      io.to(userId).emit('newNotification', formattedNotification);
      console.log(`📡 Socket: Emitted newNotification to user ${userId}`);
    } else {
      console.warn(`⚠️ Socket: io server instance not passed, skipped socket emit for user ${userId}`);
    }

    // 4. Send Web Push Notification
    let pushTitle = 'New Update';
    let pushBody = '';
    let pushUrl = '/community';

    if (type === 'like') {
      pushTitle = 'New Like! ❤️';
      pushBody = `${notification.sender.name} liked your post.`;
      if (postId) pushUrl = `/community/post/${postId}`;
    } else if (type === 'comment') {
      pushTitle = 'New Comment! 💬';
      if (commentId) {
        const comment = await prisma.postComment.findUnique({
          where: { id: commentId },
          select: { content: true },
        });
        pushBody = `${notification.sender.name} commented: "${
          comment?.content && comment.content.length > 40
            ? comment.content.substring(0, 37) + '...'
            : comment?.content || ''
        }"`;
      } else {
        pushBody = `${notification.sender.name} commented on your post.`;
      }
      if (postId) pushUrl = `/community/post/${postId}`;
    }

    await sendPushToUser(userId, {
      title: pushTitle,
      body: pushBody,
      url: pushUrl,
    });

    return formattedNotification;
  } catch (err) {
    console.error('❌ [createNotification] failed:', err);
    return null;
  }
}
