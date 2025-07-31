import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['attended', 'missed'],
    required: true,
  },
});

const SubjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  logs: [LogSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Subject', SubjectSchema);
