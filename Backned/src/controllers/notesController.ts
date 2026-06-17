import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import prisma from '../lib/prisma.js';

/**
 * GET /api/notes/:date
 * Fetch the authenticated user's note for a specific date.
 * Returns { content: "" } if no note exists yet.
 */
export const getNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  const date = req.params.date as string;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Basic date format validation (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }

  try {
    const note = await prisma.note.findUnique({
      where: { userId_date: { userId, date } },
      select: { content: true, updatedAt: true },
    });

    res.json({ content: note?.content ?? '', updatedAt: note?.updatedAt ?? null });
  } catch (err: any) {
    console.error('[Notes] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
};

/**
 * PUT /api/notes/:date
 * Create or update the authenticated user's note for a specific date.
 * Body: { content: string }
 */
export const upsertNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  const date = req.params.date as string;
  const { content } = req.body;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }

  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content must be a string.' });
    return;
  }

  // Cap note length at 10 000 characters to prevent abuse
  if (content.length > 10_000) {
    res.status(400).json({ error: 'Note is too long. Max 10,000 characters.' });
    return;
  }

  try {
    const note = await prisma.note.upsert({
      where: { userId_date: { userId, date } },
      update: { content },
      create: { userId, date, content },
      select: { content: true, updatedAt: true },
    });

    res.json({ content: note.content, updatedAt: note.updatedAt });
  } catch (err: any) {
    console.error('[Notes] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to save note.' });
  }
};
