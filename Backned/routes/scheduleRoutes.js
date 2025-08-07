// routes/scheduleRouter.js
import express from 'express';
import Schedule from '../models/schedule.js';
import Subject from '../models/Subject.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const scheduleRouter = express.Router();

scheduleRouter.post('/', verifyToken, async (req, res) => {
  try {
    const { weeklySchedule } = req.body;
    const userId = req.userId;

    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
      return res.status(400).json({ message: 'Invalid or missing schedule' });
    }

    // Fetch or create schedule for user
    let existingSchedule = await Schedule.findOne({ userId });

    if (!existingSchedule) {
      existingSchedule = new Schedule({
        userId,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
      });
    }

    // Insert subjects and merge into schedule
    for (const day in weeklySchedule) {
      const subjects = weeklySchedule[day];
      const subjectIds = [];

      for (const subject of subjects) {
        const newSubject = new Subject({
          name: subject.subjectName,   // Fixed here
          time: subject.time,
          day: [day],
          userId,
        });
        await newSubject.save();
        subjectIds.push(newSubject._id);
      }

      // Initialize the day if not already
      if (!existingSchedule.schedule[day]) {
        existingSchedule.schedule[day] = [];
      }

      existingSchedule.schedule[day].push(...subjectIds);
    }

    await existingSchedule.save();

    res.status(201).json({ message: '✅ Schedule and subjects saved successfully!' });
  } catch (err) {
    console.error('❌ Error saving schedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default scheduleRouter;
