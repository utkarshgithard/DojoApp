import express, { Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';

const attendanceRouter = express.Router();

// POST /api/attendance/mark
attendanceRouter.post('/mark', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date, status } = req.body as {
    date: string;
    status: Array<{ subject: string; status: 'attended' | 'missed' | 'cancelled' }>;
  };
  const userId = req.userId!;

  if (!Array.isArray(status) || status.length === 0) {
    res.status(400).json({ error: 'No status data provided' });
    return;
  }

  try {
    // Find or create the AttendanceRecord for this user+date
    let record = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date } },
      include: { entries: true },
    });

    if (!record) {
      record = await prisma.attendanceRecord.create({
        data: {
          userId,
          date,
          entries: {
            create: status.map((item) => ({
              subject: item.subject,
              status: item.status,
            })),
          },
        },
        include: { entries: true },
      });
    } else {
      // Update or insert each subject entry
      for (const item of status) {
        const existingEntry = record.entries.find((e) => e.subject === item.subject);
        if (existingEntry) {
          await prisma.attendanceEntry.update({
            where: { id: existingEntry.id },
            data: { status: item.status },
          });
        } else {
          await prisma.attendanceEntry.create({
            data: {
              attendanceRecordId: record.id,
              subject: item.subject,
              status: item.status,
            },
          });
        }
      }
    }

    res.json({ message: '✅ Attendance marked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Failed to mark attendance' });
  }
});

// GET /api/attendance/summary?date=YYYY-MM-DD
attendanceRouter.get('/summary', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query as { date?: string };
    const userId = req.userId!;

    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date: date?.toString() ?? '' } },
      include: { entries: true },
    });

    console.log(record);
    const subjectSummary = record?.entries ?? [];

    res.json({ summary: subjectSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Error fetching summary' });
  }
});

// POST /api/attendance/holiday
attendanceRouter.post('/holiday', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date } = req.body as { date: string };
  const userId = req.userId!;

  if (!date) {
    res.status(400).json({ error: 'Date is required' });
    return;
  }

  try {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 1. Find all subjects scheduled for that day
    const subjects = await prisma.subject.findMany({
      where: {
        userId,
        days: { has: dayName },
      },
    });

    if (subjects.length === 0) {
      res.status(200).json({ message: 'No classes scheduled for this day', updatedCount: 0 });
      return;
    }

    // 2. Find or create the AttendanceRecord for this user+date
    let record = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date } },
      include: { entries: true },
    });

    if (!record) {
      record = await prisma.attendanceRecord.create({
        data: {
          userId,
          date,
          entries: {
            create: subjects.map((subj) => ({
              subject: subj.name,
              status: 'cancelled',
            })),
          },
        },
        include: { entries: true },
      });
    } else {
      // Update or insert each subject entry to 'cancelled'
      for (const subj of subjects) {
        const existingEntry = record.entries.find((e) => e.subject === subj.name);
        if (existingEntry) {
          await prisma.attendanceEntry.update({
            where: { id: existingEntry.id },
            data: { status: 'cancelled' },
          });
        } else {
          await prisma.attendanceEntry.create({
            data: {
              attendanceRecordId: record.id,
              subject: subj.name,
              status: 'cancelled',
            },
          });
        }
      }
    }

    res.json({ message: '✅ All classes marked as cancelled successfully', updatedCount: subjects.length });
  } catch (err) {
    console.error('Error marking holiday:', err);
    res.status(500).json({ error: '❌ Failed to mark holiday' });
  }
});

// POST /api/attendance/undo-holiday
attendanceRouter.post('/undo-holiday', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { date } = req.body as { date: string };
  const userId = req.userId!;

  if (!date) {
    res.status(400).json({ error: 'Date is required' });
    return;
  }

  try {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Find all subjects scheduled for that day
    const subjects = await prisma.subject.findMany({
      where: { userId, days: { has: dayName } },
    });

    if (subjects.length === 0) {
      res.status(200).json({ message: 'No classes scheduled for this day', removedCount: 0 });
      return;
    }

    const subjectNames = subjects.map((s) => s.name);

    // Find the AttendanceRecord for this user+date
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date } },
      include: { entries: true },
    });

    if (!record) {
      res.status(200).json({ message: 'No attendance record found for this date', removedCount: 0 });
      return;
    }

    // Delete entries for these subjects that are 'cancelled'
    const deletedResult = await prisma.attendanceEntry.deleteMany({
      where: {
        attendanceRecordId: record.id,
        subject: { in: subjectNames },
        status: 'cancelled',
      },
    });

    // If the record now has no entries, clean it up
    const remaining = await prisma.attendanceEntry.count({
      where: { attendanceRecordId: record.id },
    });
    if (remaining === 0) {
      await prisma.attendanceRecord.delete({ where: { id: record.id } });
    }

    res.json({ message: '↩️ Holiday undone successfully', removedCount: deletedResult.count });
  } catch (err) {
    console.error('Error undoing holiday:', err);
    res.status(500).json({ error: '❌ Failed to undo holiday' });
  }
});

export default attendanceRouter;


