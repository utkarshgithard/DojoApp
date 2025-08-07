// routes/attendanceRoutes.js
import express from 'express';
import MarkedSubject from '../models/MarkedSubject.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const attendanceRouter = express.Router();

// POST: Mark attendance
// attendanceRoutes.js
attendanceRouter.post('/mark', verifyToken, async (req, res) => {
  const { date, status } = req.body; // status is array of { subject, status }
  const userId = req.userId;

  if (!Array.isArray(status) || status.length === 0) {
    return res.status(400).json({ error: 'No status data provided' });
  }

  try {
    // Find existing attendance for user & date
    let attendanceRecord = await MarkedSubject.findOne({ userId, date });

    if (!attendanceRecord) {
      // Create new if doesn't exist
      attendanceRecord = new MarkedSubject({
        userId,
        date,
        subjects: status.map(item => ({
          subject: item.subject,
          status: item.status
        }))
      });
    } else {
      // Update existing attendance for that date
      for (const item of status) {
        // Check if subject already exists in array, update status or add
        const existingSubj = attendanceRecord.subjects.find(s => s.subject === item.subject);
        if (existingSubj) {
          existingSubj.status = item.status;
        } else {
          attendanceRecord.subjects.push({
            subject: item.subject,
            status: item.status
          });
        }
      }
    }

    await attendanceRecord.save();

    res.json({ message: '✅ Attendance marked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Failed to mark attendance' });
  }
});




attendanceRouter.get('/summary', verifyToken, async (req, res) => {
  try {
    const {date} = req.query;
    
    const records = await MarkedSubject.find({ userId: req.userId,
      date:date.toString()
     });
    console.log(records)
    let subjectSummary = []

    if(!records[0]){
      subjectSummary = []
    }
    else{
      subjectSummary = records[0].subjects
    }

    

    res.json({ summary: subjectSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Error fetching summary' });
  }
});



export default attendanceRouter
