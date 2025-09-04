// routes/subjectRouter.js
import express from 'express';
import Subject from '../models/Subject.js';
import MarkedSubject from '../models/MarkedSubject.js'; // assuming this is your attendance model
import { verifyToken } from '../middleware/authmiddleware.js';

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

subjectRouter.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all subjects currently existing for the user
    const existingSubjects = await Subject.find({ userId }).select('name');
    const subjectSet = new Set(
      existingSubjects.map(s => s.name.trim().toUpperCase())
    );
    // Fetch all marked subjects for this user
    // Fetch all marked subjects for this user
    const records = await MarkedSubject.find({ userId });

    const grouped = {};

    records.forEach(record => {
      record.subjects.forEach(s => {
        const subjectName = s.subject.trim().toUpperCase(); // normalize

        // Skip if this subject no longer exists
        if (!subjectSet.has(subjectName)) return;

        if (!grouped[subjectName]) {
          grouped[subjectName] = {
            subject: subjectName,
            attended: 0,
            missed: 0,
            cancelled: 0
          };
        }

        if (s.status === 'attended') grouped[subjectName].attended++;
        if (s.status === 'missed') grouped[subjectName].missed++;
        if (s.status === 'cancelled') grouped[subjectName].cancelled++;
      });
    });
    res.json({ success: true, data: Object.values(grouped) });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



export default subjectRouter;
