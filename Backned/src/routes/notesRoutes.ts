import { Router } from 'express';
import { verifyToken } from '../middleware/authmiddleware.js';
import { getNote, upsertNote } from '../controllers/notesController.js';

const router = Router();

router.get('/:date', verifyToken, getNote);
router.put('/:date', verifyToken, upsertNote);

export default router;
