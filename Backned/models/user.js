import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  friendCode: { type: String, unique: true }, // 6-digit unique code
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  verificationToken: String
});


export const User = mongoose.model('User', UserSchema);
