import mongoose from 'mongoose';

const markedSubjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // e.g., "2025-08-01"
  subjects: [
    {
      subject: { type: String, required: true },
      status: {
        type: String,
        enum: ['attended', 'missed', 'cancelled'],
        required: true
      }
    }
  ]
}, { timestamps: true });

const MarkedSubject = mongoose.model('MarkedSubject', markedSubjectSchema);
export default MarkedSubject;
