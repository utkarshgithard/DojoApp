import mongoose from "mongoose";
const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  schedule: {
    monday: [{
      subject: String,
      time: String, // Example: "10:00 AM - 11:00 AM"
    }],
    tuesday: [{ subject: String, time: String }],
    wednesday: [{ subject: String, time: String }],
    thursday: [{ subject: String, time: String }],
    friday: [{ subject: String, time: String }],
    saturday: [{ subject: String, time: String }],
    sunday: [{ subject: String, time: String }]
  }
}, { timestamps: true });


export default mongoose.model('Schedule', scheduleSchema);
