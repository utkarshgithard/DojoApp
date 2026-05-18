import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';

const scheduleRouter = express.Router();

// POST /api/schedule
scheduleRouter.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { weeklySchedule } = req.body as {
      weeklySchedule: Record<string, Array<{ subjectName: string; time: string }>>;
    };
    const userId = req.userId!;

    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
      res.status(400).json({ message: 'Invalid or missing schedule' });
      return;
    }

    // Get or create the Schedule record for this user
    let schedule = await prisma.schedule.findUnique({ where: { userId } });
    if (!schedule) {
      schedule = await prisma.schedule.create({ data: { userId } });
    }

    // Process each day
    for (const day in weeklySchedule) {
      const subjects = weeklySchedule[day];

      for (const subjectData of subjects) {
        const normalizedName = subjectData.subjectName.trim().toUpperCase();

        // Find existing subject with same name and time for this user
        let existingSubject = await prisma.subject.findFirst({
          where: { userId, name: normalizedName, time: subjectData.time },
        });

        if (existingSubject) {
          // Add the day if not already there
          if (!existingSubject.days.includes(day)) {
            existingSubject = await prisma.subject.update({
              where: { id: existingSubject.id },
              data: { days: { push: day } },
            });
          }
        } else {
          // Create new subject
          existingSubject = await prisma.subject.create({
            data: {
              name: normalizedName,
              time: subjectData.time,
              days: [day],
              userId,
            },
          });
        }

        // Create schedule entry if it doesn't already exist
        const existingEntry = await prisma.scheduleEntry.findFirst({
          where: { scheduleId: schedule.id, subjectId: existingSubject.id, day },
        });
        if (!existingEntry) {
          await prisma.scheduleEntry.create({
            data: { scheduleId: schedule.id, subjectId: existingSubject.id, day },
          });
        }
      }
    }

    res.status(201).json({ message: '✅ Schedule and subjects saved successfully!' });
  } catch (err) {
    console.error('❌ Error saving schedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/schedule/calender
scheduleRouter.get('/calender', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const scheduleDoc = await prisma.schedule.findUnique({
      where: { userId },
      include: {
        entries: {
          include: { subject: true },
        },
      },
    });

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (!scheduleDoc) {
      const emptySchedule: Record<string, any[]> = {};
      days.forEach((d) => (emptySchedule[d] = []));
      res.status(200).json({ schedule: emptySchedule });
      return;
    }

    // Group entries by day to match the old Mongoose shape
    const schedule: Record<string, typeof scheduleDoc.entries[0]['subject'][]> = {};
    days.forEach((d) => (schedule[d] = []));

    scheduleDoc.entries.forEach((entry) => {
      if (schedule[entry.day]) {
        schedule[entry.day].push(entry.subject);
      }
    });

    res.json({ ...scheduleDoc, schedule });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/schedule/:subjectId/:day
scheduleRouter.delete('/:subjectId/:day', async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectId = req.params['subjectId'] as string;
    const day = req.params['day'] as string;

    // Remove schedule entries for this subject+day
    await prisma.scheduleEntry.deleteMany({
      where: { subjectId, day },
    });

    // Remove the day from subject's days array
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (subject) {
      const updatedDays = subject.days.filter((d) => d !== day);
      if (updatedDays.length === 0) {
        // Delete subject entirely if no days left
        await prisma.subject.delete({ where: { id: subjectId } });
      } else {
        await prisma.subject.update({
          where: { id: subjectId },
          data: { days: updatedDays },
        });
      }
    }

    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('Error deleting subject:', err);
    res.status(500).json({ message: 'Server error', error: (err as Error).message });
  }
});

export default scheduleRouter;
