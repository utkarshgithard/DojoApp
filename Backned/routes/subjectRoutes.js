// routes/subjectRouter.js
import express from 'express';
import Subject from '../models/Subject.js';
import MarkedSubject from '../models/MarkedSubject.js'; // assuming this is your attendance model
import { verifyToken } from '../middleware/authMiddleware.js';

const subjectRouter = express.Router();

// GET /subject?date=YYYY-MM-DD
subjectRouter.get('/', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    console.log(date)
    if (!date) {
      return res.status(400).json({ message: 'Date is required in query' });
    }

    const userId = req.userId;
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 1. Get all subjects scheduled for today for this user
    const subjects = await Subject.find({
      userId,
      day: dayName
    });

    // 2. Get all marked subjects (attendance) for that day
    const attendanceRecords = await MarkedSubject.find({
      userId,
      date
    });

    const markedSubjects = attendanceRecords.map(record => ({
      subject: record.subjects,
      time: record.time,
      status: record.status
    }));

    // 3. Get subject names of marked subjects
    const markedSet = new Set(attendanceRecords.map(record => record.subjects));

    const unmarkedSubjects = subjects
      .filter(subject => !markedSet.has(subject.name))
      .map(subject => ({
        _id: subject._id,
        subject: subject.name,
        time: subject.time
      }));

    res.status(200).json({
      unmarkedSubjects,
      markedSubjects
    });
  } catch (err) {
    console.error('Error fetching subjects for today:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default subjectRouter;
