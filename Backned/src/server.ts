import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';


// Routes
import userRouter from './routes/authRoutes.js';
import subjectRouter from './routes/subjectRoutes.js';
import scheduleRouter from './routes/scheduleRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import studySessionRouter from './routes/studySessionRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', userRouter);
app.use('/api/subject', subjectRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/study-session', studySessionRouter);

app.get('/', (_req, res) => {
  res.send('Api Working.');
});

// Create HTTP server for both Express + Socket.io
const server = createServer(app);

// Init Socket.io
export const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://dojo-beige.vercel.app/'
    ],
    methods: ['GET', 'POST'],
  },
});

import { setupSocketHandlers } from './socket.js';

// Setup Socket.IO Event Handlers
setupSocketHandlers(io);

// Make Socket.IO instance available to Express app
app.set('io', io);

import prisma from './lib/prisma.js';

// Test Database Connection and Start Server
prisma.$connect()
  .then(() => {
    console.log('✅ Successfully connected to the database!');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to the database:', err.message);
    process.exit(1);
  });

