import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv';
dotenv.config();
import userRouter from './routes/authRoutes.js';
import subjectRouter from './routes/subjectRoutes.js';
import scheduleRouter from './routes/scheduleRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', userRouter);
app.use('/api/subject',subjectRouter);
app.use('/api/schedule',scheduleRouter);
app.use('/api/attendance',attendanceRouter)

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
