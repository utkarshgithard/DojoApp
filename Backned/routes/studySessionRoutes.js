import { Router } from "express";
import { verifyToken } from "../middleware/authmiddleware.js";
import {
  createSession,
  getMySessions,
  getMyInvites,
  respondInvite,
  cancelSession
} from "../controllers/studySessionController.js";

const router = Router();

router.post("/", verifyToken, createSession);
router.get("/mine", verifyToken, getMySessions);
router.get("/invites", verifyToken, getMyInvites);
router.post("/:id/respond", verifyToken, respondInvite);
router.post("/:id/cancel", verifyToken, cancelSession);

export default router;
