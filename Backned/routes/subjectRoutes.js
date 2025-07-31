import express from 'express';
import Subject from '../models/Subject.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const subjectRouter = express.Router();

// 🔐 Protect all routes
subjectRouter.use(verifyToken);

// ➕ Create new subject
subjectRouter.post('/', async (req, res) => {
  const { name } = req.body;

  try {
    const subject = new Subject({
      name,
      userId: req.userId,
      logs: [],
    });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// 📥 Get all subjects for user
subjectRouter.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.userId });

    const enriched = subjects.map(subject => {
      const total = subject.logs.length;
      const attended = subject.logs.filter(log => log.status === 'attended').length;
      const missed = total - attended;
      const percentage = total === 0 ? 0 : (attended / total) * 100;
      const suggestion =
        percentage >= 75
          ? `✅ Safe to skip ${Math.floor((attended * 100 - 75 * total) / 75)} class(es)`
          : `⚠️ Attend more classes`;

      return {
        ...subject._doc,
        total,
        attended,
        missed,
        percentage: percentage.toFixed(1),
        suggestion,
      };
    });

    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// ➕ Add log (attended/missed) to a subject
subjectRouter.post('/:id/log', async (req, res) => {
  const { date, status } = req.body;

  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.userId });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    subject.logs.push({ date, status });
    await subject.save();

    res.status(200).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add log' });
  }
});

export default subjectRouter;
