import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authmiddleware.js';
import prisma from '../lib/prisma.js';

/**
 * GET /api/calendar
 * Returns all calendar tasks for the authenticated user.
 */
export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tasks = await prisma.calendarTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error('[getTasks]', err);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
};

/**
 * POST /api/calendar
 * Adds a single calendar task.
 */
export const addTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { date, text, difficulty, isPracticeTest } = req.body as {
      date: string;
      text: string;
      difficulty?: string;
      isPracticeTest?: boolean;
    };

    if (!date || !text) {
      res.status(400).json({ error: 'Missing date or text' });
      return;
    }

    const task = await prisma.calendarTask.create({
      data: {
        userId,
        date,
        text,
        difficulty: difficulty || 'None',
        isPracticeTest: isPracticeTest || false,
      },
    });

    res.json(task);
  } catch (err) {
    console.error('[addTask]', err);
    res.status(500).json({ error: 'Failed to create calendar task' });
  }
};

/**
 * PUT /api/calendar/:id/toggle
 * Toggles a task's check status.
 */
export const toggleTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const task = await prisma.calendarTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updated = await prisma.calendarTask.update({
      where: { id },
      data: { isChecked: !task.isChecked },
    });

    res.json(updated);
  } catch (err) {
    console.error('[toggleTask]', err);
    res.status(500).json({ error: 'Failed to toggle calendar task' });
  }
};

/**
 * DELETE /api/calendar/:id
 * Deletes a single calendar task.
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const task = await prisma.calendarTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.calendarTask.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('[deleteTask]', err);
    res.status(500).json({ error: 'Failed to delete calendar task' });
  }
};

/**
 * POST /api/calendar/import-ai
 * Imports AI revision plan in bulk.
 */
export const importAIPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { plan } = req.body as { plan: any };

    if (!plan || !plan.weeks) {
      res.status(400).json({ error: 'Invalid plan schema' });
      return;
    }

    const tasksToCreate: any[] = [];
    const timestamp = Date.now();

    plan.weeks.forEach((week: any) => {
      week.days.forEach((day: any) => {
        const dateStr = day.date; // YYYY-MM-DD
        day.isPracticeTest = !!day.isPracticeTest;

        day.tasks.forEach((t: any, idx: number) => {
          tasksToCreate.push({
            id: `ai-${timestamp}-${idx}-${Math.random()}`,
            userId,
            date: dateStr,
            text: t.text,
            difficulty: t.difficulty || 'None',
            isPracticeTest: day.isPracticeTest,
            isChecked: false,
          });
        });
      });
    });

    if (tasksToCreate.length > 0) {
      await prisma.calendarTask.createMany({
        data: tasksToCreate,
        skipDuplicates: true,
      });
    }

    // Return the newly fetched list
    const allTasks = await prisma.calendarTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(allTasks);
  } catch (err) {
    console.error('[importAIPlan]', err);
    res.status(500).json({ error: 'Failed to import AI plan' });
  }
};

/**
 * POST /api/calendar/clear-ai
 * Deletes all AI tasks.
 */
export const clearAITasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    await prisma.calendarTask.deleteMany({
      where: {
        userId,
        id: { startsWith: 'ai-' },
      },
    });
    res.json({ success: true, message: 'AI tasks cleared' });
  } catch (err) {
    console.error('[clearAITasks]', err);
    res.status(500).json({ error: 'Failed to clear AI tasks' });
  }
};

/**
 * POST /api/calendar/clear-all
 * Deletes all calendar tasks for the user.
 */
export const clearCalendar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    await prisma.calendarTask.deleteMany({
      where: { userId },
    });
    res.json({ success: true, message: 'All calendar tasks cleared' });
  } catch (err) {
    console.error('[clearCalendar]', err);
    res.status(500).json({ error: 'Failed to clear calendar' });
  }
};
