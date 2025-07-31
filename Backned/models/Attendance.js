import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String, // e.g., "2025-07-26"
  status: [
    {
      subject: String,
      time: String,
      attendance: {
        type: String,
        enum: ['attended', 'missed', 'cancelled'],
      }
    }
  ]
});

export default mongoose.model('Attendance', attendanceSchema);
