import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';

/**
 * GET /api/exam-prep
 * Fetch all exam deadlines, course plans, and resource links for the user.
 */
const router = Router();

// All routes require authentication
router.use(verifyToken);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  try {
    const [exams, courses, resources] = await Promise.all([
      prisma.examDeadline.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.coursePlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.resourceLink.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    res.json({ exams, courses, resources });
  } catch (err) {
    console.error('GET /exam-prep error:', err);
    res.status(500).json({ error: 'Failed to fetch exam prep data' });
  }
});

// ─── Exam Deadlines ────────────────────────────────────────────────────────────

/**
 * POST /api/exam-prep/exams
 * Create a new exam deadline.
 */
router.post('/exams', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const { name, date } = req.body as { name: string; date: string };
  if (!name || !date) {
    res.status(400).json({ error: 'name and date are required' });
    return;
  }
  try {
    const exam = await prisma.examDeadline.create({
      data: { userId, name, date },
    });
    res.status(201).json(exam);
  } catch (err) {
    console.error('POST /exam-prep/exams error:', err);
    res.status(500).json({ error: 'Failed to create exam deadline' });
  }
});

/**
 * DELETE /api/exam-prep/exams/:id
 * Delete an exam deadline.
 */
router.delete('/exams/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const id = req.params.id as string;
  try {
    await prisma.examDeadline.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /exam-prep/exams error:', err);
    res.status(500).json({ error: 'Failed to delete exam deadline' });
  }
});

// ─── Course Plans ─────────────────────────────────────────────────────────────

/**
 * POST /api/exam-prep/courses
 * Create a new course plan.
 */
router.post('/courses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const { name, totalLectures, completedLectures } = req.body as {
    name: string;
    totalLectures: number;
    completedLectures: number;
  };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  try {
    const course = await prisma.coursePlan.create({
      data: {
        userId,
        name,
        totalLectures: totalLectures ?? 0,
        completedLectures: completedLectures ?? 0,
      },
    });
    res.status(201).json(course);
  } catch (err) {
    console.error('POST /exam-prep/courses error:', err);
    res.status(500).json({ error: 'Failed to create course plan' });
  }
});

/**
 * PATCH /api/exam-prep/courses/:id
 * Update course lecture progress.
 */
router.patch('/courses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const id = req.params.id as string;
  const { completedLectures, totalLectures } = req.body as {
    completedLectures?: number;
    totalLectures?: number;
  };
  try {
    const course = await prisma.coursePlan.updateMany({
      where: { id, userId },
      data: {
        ...(completedLectures !== undefined && { completedLectures }),
        ...(totalLectures !== undefined && { totalLectures }),
      },
    });
    res.json({ success: true, count: course.count });
  } catch (err) {
    console.error('PATCH /exam-prep/courses error:', err);
    res.status(500).json({ error: 'Failed to update course plan' });
  }
});

/**
 * DELETE /api/exam-prep/courses/:id
 * Delete a course plan.
 */
router.delete('/courses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const id = req.params.id as string;
  try {
    await prisma.coursePlan.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /exam-prep/courses error:', err);
    res.status(500).json({ error: 'Failed to delete course plan' });
  }
});

// ─── Resource Links ───────────────────────────────────────────────────────────

/**
 * POST /api/exam-prep/resources
 * Create a new resource link.
 */
router.post('/resources', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const { title, url } = req.body as { title: string; url: string };
  if (!title || !url) {
    res.status(400).json({ error: 'title and url are required' });
    return;
  }
  try {
    const resource = await prisma.resourceLink.create({
      data: { userId, title, url },
    });
    res.status(201).json(resource);
  } catch (err) {
    console.error('POST /exam-prep/resources error:', err);
    res.status(500).json({ error: 'Failed to create resource link' });
  }
});

/**
 * DELETE /api/exam-prep/resources/:id
 * Delete a resource link.
 */
router.delete('/resources/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const id = req.params.id as string;
  try {
    await prisma.resourceLink.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /exam-prep/resources error:', err);
    res.status(500).json({ error: 'Failed to delete resource link' });
  }
});

export default router;
