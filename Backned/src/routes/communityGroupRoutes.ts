import express from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/authmiddleware.js';
import {
  createCommunity,
  getCommunities,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
  joinOrLeaveCommunity,
  updateMemberRole,
  removeMember,
  getCommunityMembers,
  getCommunityPosts,
  moderateDeletePost,
  sendInvite,
  acceptInvite,
  declineInvite,
  getMyInvites,
  getMyJoinedCommunities,
} from '../controllers/communityGroupController.js';
import { getSignedUploadUrl } from '../controllers/mediaController.js';

const communityGroupRouter = express.Router();

// ── Discovery & CRUD ──────────────────────────────────────────────────────────
communityGroupRouter.post('/', verifyToken, createCommunity);
communityGroupRouter.get('/', optionalVerifyToken, getCommunities);
communityGroupRouter.get('/my', verifyToken, getMyJoinedCommunities);
communityGroupRouter.get('/:slug', optionalVerifyToken, getCommunityBySlug);
communityGroupRouter.patch('/:slug', verifyToken, updateCommunity);
communityGroupRouter.delete('/:slug', verifyToken, deleteCommunity);

// ── Membership ────────────────────────────────────────────────────────────────
communityGroupRouter.post('/:slug/join', verifyToken, joinOrLeaveCommunity);
communityGroupRouter.get('/:slug/members', optionalVerifyToken, getCommunityMembers);
communityGroupRouter.patch('/:slug/members/:memberId/role', verifyToken, updateMemberRole);
communityGroupRouter.delete('/:slug/members/:memberId', verifyToken, removeMember);

// ── Posts ─────────────────────────────────────────────────────────────────────
communityGroupRouter.get('/:slug/posts', optionalVerifyToken, getCommunityPosts);
communityGroupRouter.delete('/:slug/posts/:postId', verifyToken, moderateDeletePost);

// ── Invites ───────────────────────────────────────────────────────────────────
communityGroupRouter.get('/invites/mine', verifyToken, getMyInvites);
communityGroupRouter.post('/:slug/invites', verifyToken, sendInvite);
communityGroupRouter.post('/invites/:inviteId/accept', verifyToken, acceptInvite);
communityGroupRouter.delete('/invites/:inviteId', verifyToken, declineInvite);

// ── Media upload signing ──────────────────────────────────────────────────────
communityGroupRouter.post('/media/sign', verifyToken, getSignedUploadUrl);

export default communityGroupRouter;
