import express from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/authmiddleware.js';
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

// ── Posts ─────────────────────────────────────────────────────────────────────
communityRouter.get('/posts', optionalVerifyToken, getPosts);
communityRouter.get('/posts/:id', optionalVerifyToken, getPostById);
communityRouter.post('/posts', verifyToken, createPost);
communityRouter.delete('/posts/:id', verifyToken, deletePost);
communityRouter.get('/users/:userId/posts', optionalVerifyToken, getUserPosts);

// ── Likes ─────────────────────────────────────────────────────────────────────
communityRouter.post('/posts/:id/like', verifyToken, toggleLike);

// ── Share ─────────────────────────────────────────────────────────────────────
communityRouter.post('/posts/:id/share', verifyToken, sharePost);
communityRouter.get('/shared-with-me', verifyToken, getSharedWithMe);
communityRouter.post('/shares/:shareId/read', verifyToken, markShareAsViewed);

// ── Comments ──────────────────────────────────────────────────────────────────
communityRouter.get('/posts/:id/comments', optionalVerifyToken, getComments);
communityRouter.post('/posts/:id/comments', verifyToken, addComment);
communityRouter.delete('/comments/:commentId', verifyToken, deleteComment);

// ── Follow ────────────────────────────────────────────────────────────────────
communityRouter.post('/users/:userId/follow', verifyToken, toggleFollow);
communityRouter.get('/users/:userId/follow-status', optionalVerifyToken, getFollowStatus);
communityRouter.get('/users/:userId/followers', verifyToken, getFollowers);
communityRouter.get('/users/:userId/following', verifyToken, getFollowing);
communityRouter.get('/my-network', verifyToken, getMyNetwork);

// ── Media upload signing ──────────────────────────────────────────────────────
communityRouter.post('/media/sign', verifyToken, getSignedUploadUrl);

export default communityRouter;

