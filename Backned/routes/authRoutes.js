import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import sendVerificationEmail from '../utils/sendVerificationEmail.js'
import { verifyToken } from '../middleware/authMiddleware.js';
import  generate6CharCode  from '../utils/generateCode.js';

const userRouter = express.Router();

// Register Route
userRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });


    const hashed = await bcrypt.hash(password, 10);

    let code;
    do {
      code = generate6CharCode();
    } while (await User.exists({ friendCode: code })); // ensure uniqueness

    const user = new User({
      name,
      email,
      password: hashed,
      verified: false,
      friendCode: code
    });
    await user.save();
    const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });


    // Send email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'User registered. Please check your email to verify.', verificationToken });



  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

userRouter.get("/friends-List", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("friends", "name friendCode email");

    res.json({ friends: user.friends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

userRouter.post("/add",verifyToken, async (req, res) => {
  try {
    const { friendCode } = req.body;
    const userId = req.userId; // logged-in user

    if (!friendCode) {
      return res.status(400).json({ error: "Friend code is required" });
    }

    // Find the friend by their unique friendCode
    const friend = await User.findOne({ friendCode });
    if (!friend) {
      return res.status(404).json({ error: "User with this code not found" });
    }

    // Prevent adding self
    if (friend._id.toString() === userId.toString()) {
      return res.status(400).json({ error: "You cannot add yourself as a friend" });
    }

    // Add friend for both users
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: friend._id } });
    await User.findByIdAndUpdate(friend._id, { $addToSet: { friends: userId } });

    res.json({
      success: true,
      message: `${friend.name} added as a friend`,
      friend: {
        _id: friend._id,
        name: friend.name,
        friendCode: friend.friendCode
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
userRouter.get('/verify-email/:token', async (req, res) => {
  console.log("helo")
  const { token } = req.params;
  console.log(token)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("hello")
    console.log(decoded)

    const user = await User.findOne({ userId: decoded._id });

    if (!user) return res.status(400).send('Invalid token or user.');

    user.verified = true;
    user.verificationToken = undefined;

    await user.save();

    res.json({ message: 'Email verified succesfully', token })
  } catch (err) {
    res.status(400).send('❌ Invalid or expired token.');
  }
});



// Login Route
userRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    // ✅ Create token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default userRouter;
