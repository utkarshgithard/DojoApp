import express from 'express';
import Schedule from '../models/schedule.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const scheduleRouter = express.Router();

scheduleRouter.post('/', verifyToken, async (req, res) => {
  const { schedule: newSchedule } = req.body;

  try {
    const existing = await Schedule.findOne({ userId: req.userId });

    if (existing) {
      // For each day in new schedule
      for (const day in newSchedule) {
        const newSubjects = newSchedule[day]; // array of new subjects

        // Existing subjects for that day or empty array
        const existingSubjects = existing.schedule[day] || [];

        // Build a map of existing subjects by subject name for quick lookup
        const subjectMap = new Map();
        for (const subj of existingSubjects) {
          subjectMap.set(subj.subject, subj);
        }

        // Merge new subjects:
        // - if subject exists, replace it
        // - else add new subject
        for (const newSubj of newSubjects) {
          subjectMap.set(newSubj.subject, newSubj);
        }

        // Convert map back to array and update day schedule
        existing.schedule[day] = Array.from(subjectMap.values());
      }

      await existing.save();
      return res.json({ message: 'Schedule updated successfully with merged subjects' });
    }

    // If schedule doesn't exist yet
    await Schedule.create({ userId: req.userId, schedule: newSchedule });
    res.status(201).json({ message: 'Schedule created successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving schedule' });
  }
});



// Get full weekly schedule
scheduleRouter.get('/', verifyToken, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.userId });
    res.json(schedule?.schedule || {});
  } catch (err) {
    res.status(500).json({ error: 'Error fetching schedule' });
  }
});

// Get today’s subjects
scheduleRouter.get('/today', verifyToken, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.userId });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    res.json({ day: today, subjects: schedule.schedule[today] || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get today’s subjects' });
  }
});

export default scheduleRouter;
