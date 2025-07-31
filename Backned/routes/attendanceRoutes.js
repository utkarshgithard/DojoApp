import express from 'express';
import Attendance from '../models/Attendance.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const attendanceRouter = express.Router();
// Save or update attendance
attendanceRouter.post('/mark', verifyToken, async (req, res) => {
  const { date, status } = req.body;

  try {
    const existing = await Attendance.findOne({ userId: req.userId, date });

    if (existing) {
      existing.status = status; // replace for the date
      await existing.save();
      return res.json({ message: '✅ Attendance updated.' });
    }

    await Attendance.create({ userId: req.userId, date, status });
    res.status(201).json({ message: '✅ Attendance saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Error saving attendance' });
  }
});

attendanceRouter.get('/summary', verifyToken, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.userId });

    const subjectSummary = {};

    for (const record of records) {
      for (const item of record.status) {
        const subject = item.subject;

        if (!subjectSummary[subject]) {
          subjectSummary[subject] = {
            attended: 0,
            missed: 0,
            cancelled: 0
          };
        }

        const status = item.attendance;
        if (['attended', 'missed', 'cancelled'].includes(status)) {
          subjectSummary[subject][status]++;
        }
      }
    }

    res.json({ summary: subjectSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Error fetching subject-wise summary' });
  }
});



export default attendanceRouter
