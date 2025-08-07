// models/subject.js
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: { type: String},
  time: { type: String },
  day: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;
