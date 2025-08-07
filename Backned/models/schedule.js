import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  schedule: {
    monday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    tuesday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    wednesday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    thursday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    friday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    saturday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    sunday: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }]
  },
  marked: {
    type: Map,
    of: [
      {
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
        status: { type: String, enum: ["attended", "missed", "cancelled"], required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ]
  }
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
