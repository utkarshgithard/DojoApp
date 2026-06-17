import express, { Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';

const subjectRouter = express.Router();

// GET /api/subject?date=YYYY-MM-DD
subjectRouter.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query as { date?: string };
    console.log(date);

    if (!date) {
      res.status(400).json({ message: 'Date is required in query' });
      return;
    }

    const userId = req.userId!;
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 1. Get subjects scheduled for that day
    const subjects = await prisma.subject.findMany({
      where: {
        userId,
        days: { has: dayName },
      },
    });

    // 2. Get attendance records for that day
    const attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date } },
      include: { entries: true },
    });

    const markedSubjects = attendanceRecord?.entries.map((entry) => ({
      subject: entry.subject,
      status: entry.status,
    })) ?? [];

    const markedSet = new Set(attendanceRecord?.entries.map((e) => e.subject) ?? []);

    const unmarkedSubjects = subjects
      .filter((subject) => !markedSet.has(subject.name))
      .map((subject) => ({
        id: subject.id,
        subject: subject.name,
        time: subject.time,
      }));

    res.status(200).json({ unmarkedSubjects, markedSubjects });
  } catch (err) {
    console.error('Error fetching subjects for today:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/subject/stats
subjectRouter.get('/stats', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Get all subjects for this user
    const existingSubjects = await prisma.subject.findMany({
      where: { userId },
      select: { name: true },
    });

    const subjectSet = new Set(existingSubjects.map((s) => s.name.trim().toUpperCase()));

    // Fetch all attendance records with entries
    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      include: { entries: true },
    });

    const grouped: Record<string, { subject: string; attended: number; missed: number; cancelled: number }> = {};

    records.forEach((record) => {
      record.entries.forEach((entry) => {
        const subjectName = entry.subject.trim().toUpperCase();
        if (!subjectSet.has(subjectName)) return;

        if (!grouped[subjectName]) {
          grouped[subjectName] = { subject: subjectName, attended: 0, missed: 0, cancelled: 0 };
        }

        if (entry.status === 'attended') grouped[subjectName].attended++;
        if (entry.status === 'missed') grouped[subjectName].missed++;
        if (entry.status === 'cancelled') grouped[subjectName].cancelled++;
      });
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// DELETE /api/subject/stats/:subjectName
subjectRouter.delete('/stats/:subjectName', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { subjectName } = req.params;

    if (!subjectName) {
      res.status(400).json({ error: 'Subject name is required' });
      return;
    }

    // Find all attendance records for this user
    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      select: { id: true }
    });

    if (records.length === 0) {
      res.json({ success: true, message: 'No records found to delete' });
      return;
    }

    const recordIds = records.map(r => r.id);

    const subjectNameStr = subjectName as string;

    const entriesToDelete = await prisma.attendanceEntry.findMany({
      where: {
        attendanceRecordId: { in: recordIds },
        subject: { equals: subjectNameStr, mode: 'insensitive' }
      },
      select: { id: true }
    });

    const entryIds = entriesToDelete.map(e => e.id);

    const deletedEntries = await prisma.attendanceEntry.deleteMany({
      where: {
        id: { in: entryIds }
      }
    });

    // Cleanup: find any AttendanceRecords that now have 0 entries and delete them
    // This is optional but keeps the database clean.
    const emptyRecords = await prisma.attendanceRecord.findMany({
      where: {
        id: { in: recordIds },
        entries: { none: {} }
      },
      select: { id: true }
    });

    if (emptyRecords.length > 0) {
      await prisma.attendanceRecord.deleteMany({
        where: { id: { in: emptyRecords.map(r => r.id) } }
      });
    }

    res.json({ success: true, message: 'Statistics deleted successfully', deletedCount: deletedEntries.count });
  } catch (err) {
    console.error('Error deleting subject stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default subjectRouter;
