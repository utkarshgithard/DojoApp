import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const ParticipantSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["invited","accepted","declined","removed"], default: "invited" },
  respondedAt: Date,
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  ts: { type: Date, default: Date.now }
}, { _id: false });


const StudySessionSchema = new Schema({
  creator:  { type: Types.ObjectId, ref: "User", required: true, index: true },
  subject:  { type: String, required: true, trim: true, index: true },
  startAt:  { type: Date, required: true, index: true },
  duration: { type: Number, required: true }, // minutes
  note:     { type: String, default: "" },
  visibility:{ type: String, enum: ["private","friends"], default: "private" },
  messages: { type: [MessageSchema], default: [] },
  participants: [ParticipantSchema],
  status:   { type: String, enum: ["scheduled","in_progress","completed","cancelled","pending"], default: "pending", index: true },
}, { timestamps: true });

StudySessionSchema.index({ 'participants.user': 1, startAt: 1 });

export default mongoose.model("StudySession", StudySessionSchema);
