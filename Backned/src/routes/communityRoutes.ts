import express from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/authmiddleware.js';
import {
  getPosts,
  getPostById,
  createPost,
  editPost,
  deletePost,
  getUserPosts,
  toggleLike,
  getComments,
  addComment,
  editComment,
  deleteComment,
  toggleFollow,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getMyNetwork,
  getSuggestedUsers,
  sharePost,
  getSharedWithMe,
  markShareAsViewed,
} from '../controllers/communityController.js';
import { getSignedUploadUrl } from '../controllers/mediaController.js';
import { uploadCompressedVideo } from '../controllers/mediaController.js';
import multer from 'multer';

const communityRouter = express.Router();
const videoUpload = multer({
  dest: 'tmp/dojo-video-uploads',
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith('video/'));
  },
});

// ── Posts ─────────────────────────────────────────────────────────────────────
communityRouter.get('/posts', optionalVerifyToken, getPosts);
communityRouter.get('/posts/:id', optionalVerifyToken, getPostById);
communityRouter.post('/posts', verifyToken, createPost);
communityRouter.put('/posts/:id', verifyToken, editPost);
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
communityRouter.put('/comments/:commentId', verifyToken, editComment);
communityRouter.delete('/comments/:commentId', verifyToken, deleteComment);

// ── Follow ────────────────────────────────────────────────────────────────────
communityRouter.post('/users/:userId/follow', verifyToken, toggleFollow);
communityRouter.get('/users/:userId/follow-status', optionalVerifyToken, getFollowStatus);
communityRouter.get('/users/:userId/followers', verifyToken, getFollowers);
communityRouter.get('/users/:userId/following', verifyToken, getFollowing);
communityRouter.get('/my-network', verifyToken, getMyNetwork);
communityRouter.get('/suggested-users', verifyToken, getSuggestedUsers);

// ── Media upload signing ──────────────────────────────────────────────────────
communityRouter.post('/media/sign', verifyToken, getSignedUploadUrl);
communityRouter.post('/media/video', verifyToken, videoUpload.single('video'), uploadCompressedVideo);

export default communityRouter;
