import express from 'express';
import { verifyToken } from '../middleware/authmiddleware.js';
import {
  getPosts,
  getPostById,
  createPost,
  deletePost,
  getUserPosts,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  toggleFollow,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getMyNetwork,
  sharePost,
  getSharedWithMe,
  markShareAsViewed,
} from '../controllers/communityController.js';
import { getSignedUploadUrl } from '../controllers/mediaController.js';

const communityRouter = express.Router();

// All community routes require authentication
communityRouter.use(verifyToken);

// ── Posts ─────────────────────────────────────────────────────────────────────
communityRouter.get('/posts', getPosts);
communityRouter.get('/posts/:id', getPostById);
communityRouter.post('/posts', createPost);
communityRouter.delete('/posts/:id', deletePost);
communityRouter.get('/users/:userId/posts', getUserPosts);

// ── Likes ─────────────────────────────────────────────────────────────────────
communityRouter.post('/posts/:id/like', toggleLike);

// ── Share ─────────────────────────────────────────────────────────────────────
communityRouter.post('/posts/:id/share', sharePost);
communityRouter.get('/shared-with-me', getSharedWithMe);
communityRouter.post('/shares/:shareId/read', markShareAsViewed);

// ── Comments ──────────────────────────────────────────────────────────────────
communityRouter.get('/posts/:id/comments', getComments);
communityRouter.post('/posts/:id/comments', addComment);
communityRouter.delete('/comments/:commentId', deleteComment);

// ── Follow ────────────────────────────────────────────────────────────────────
communityRouter.post('/users/:userId/follow', toggleFollow);
communityRouter.get('/users/:userId/follow-status', getFollowStatus);
communityRouter.get('/users/:userId/followers', getFollowers);
communityRouter.get('/users/:userId/following', getFollowing);
communityRouter.get('/my-network', getMyNetwork);

// ── Media upload signing ──────────────────────────────────────────────────────
communityRouter.post('/media/sign', getSignedUploadUrl);

export default communityRouter;
