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

export default attendanceRouter;
