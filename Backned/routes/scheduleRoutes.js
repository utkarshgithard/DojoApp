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

     const normalizedName = subject.subjectName.trim().toUpperCase();
    // Check if subject already exists for user with same name and time
    let existingSubject = await Subject.findOne({
      userId,
      name: normalizedName,
      time: subject.time,
    });

    if (existingSubject) {
      // Add the day if not already included
      if (!existingSubject.day.includes(day)) {
        existingSubject.day.push(day);
        await existingSubject.save();
      }
      subjectIds.push(existingSubject._id);
    } else {
      // Create new subject if doesn't exist
      const newSubject = new Subject({
        name: normalizedName,
        time: subject.time,
        day: [day],
        userId,
      });
      await newSubject.save();
      subjectIds.push(newSubject._id);
    }
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

scheduleRouter.get("/calender",  verifyToken , async (req, res) => {
  try {
    const  userId  = req.userId;

    // Find schedule for the user
    const scheduleDoc = await Schedule.findOne({ userId }).populate({
      path: "schedule.monday schedule.tuesday schedule.wednesday schedule.thursday schedule.friday schedule.saturday schedule.sunday",
      model: "Subject"
    });

    if (!scheduleDoc) return res.status(404).json({ message: "Schedule not found" });

    res.json(scheduleDoc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

scheduleRouter.delete("/:subjectId/:day", async (req, res) => {
  try {
    const { subjectId, day } = req.params;

    // 1. Remove from Subject collection
    await Subject.findByIdAndDelete(subjectId);

    // 2. Remove from Schedule collection (any user's schedule)
    await Schedule.updateMany(
      { [`schedule.${day}`]: subjectId },
      { $pull: { [`schedule.${day}`]: subjectId } }
    );

    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


export default scheduleRouter;
