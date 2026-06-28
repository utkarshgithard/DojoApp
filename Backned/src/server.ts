import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Routes
import userRouter from './routes/authRoutes.js';
import subjectRouter from './routes/subjectRoutes.js';
import scheduleRouter from './routes/scheduleRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import studySessionRouter from './routes/studySessionRoutes.js';
import pushRouter from './routes/pushRoutes.js';
import iceServersRouter from './routes/iceServersRoute.js';
import communityRouter from './routes/communityRoutes.js';
import communityGroupRouter from './routes/communityGroupRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import calendarRouter from './routes/calendarRoutes.js';
import examPrepRouter from './routes/examPrepRoutes.js';
import prisma from './lib/prisma.js';
import { setupSocketHandlers, setDbReady } from './socket.js';
import { calculateHotScore } from './controllers/communityController.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── DB health state ──────────────────────────────────────────────────────────
let dbReady = false;

app.use((req, res, next) => {
  // Bypassed endpoints
  const bypass = [
    '/health',
    '/api/ice-servers',
    '/api/auth/sync',
    '/api/auth/register',
  ];
  if (bypass.includes(req.path)) {
    return next();
  }
  if (!dbReady) {
    res.status(503).json({
      error: 'Database connection offline. System operating in degraded mode.',
      success: false,
    });
    return;
  }
  next();
});

// API routes
// ICE servers route is DB-independent — must be registered BEFORE the dbReady guard
app.use('/api/ice-servers', iceServersRouter);

app.use('/api/auth', userRouter);
app.use('/api/subject', subjectRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/study-session', studySessionRouter);
app.use('/api/push', pushRouter);
app.use('/api/community', communityRouter);
app.use('/api/groups', communityGroupRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/exam-prep', examPrepRouter);

app.get('/', (_req, res) => {
  res.send('Api Working.');
});

// Health check endpoint — always responds, shows DB status
app.get('/health', (_req, res) => {
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    db: dbReady ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
  });
});

// ── HTTP + Socket.io setup ───────────────────────────────────────────────────
const server = createServer(app);

const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const cleanFrontendUrl = rawFrontendUrl.endsWith('/') ? rawFrontendUrl.slice(0, -1) : rawFrontendUrl;

export const io = new Server(server, {
  maxHttpBufferSize: 1.5e7, // 15MB
  cors: {
    origin: [
      cleanFrontendUrl,
      'https://dojo-beige.vercel.app',
      'https://dojoclass.space',
      'https://www.dojoclass.space',
    ],
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);
app.set('io', io);

// ── DB connection with retry ─────────────────────────────────────────────────
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2s → 4s → 8s → 16s → 32s

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await prisma.$connect();
    // Run a test query to verify the DB is actually queryable (not just the pooler TCP port open)
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
    setDbReady(true);
    console.log('✅ Successfully connected to the database and verified query capability!');
    startHotScoreCronJob();
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Can't reach database") ||
      err?.code === 'P1001' ||
      err?.code === 'P1002';

    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

    if (attempt <= MAX_RETRIES) {
      console.warn(
        `⚠️  DB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );
      console.log(`🔄 Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectWithRetry(attempt + 1);
    }

    // All retries exhausted — log clearly but do NOT crash
    console.error('❌ Could not connect to the database after all retries.');
    console.error(`   Host: ${err?.message?.match(/at `.+`/)?.[0] ?? 'unknown'}`);
    console.error('   The server will keep running. Requests will return 503 until DB recovers.');
    console.error('   Fix: Check your DATABASE_URL in .env and ensure Supabase is reachable.');

    // Periodically keep retrying in the background every 30s
    setTimeout(() => {
      console.log('🔁 Background DB reconnect attempt...');
      connectWithRetry(1);
    }, 30_000);
  }
}

// ── Start server ─────────────────────────────────────────────────────────────
const isServerless = process.env.VERCEL === '1';

function startHotScoreCronJob() {
  if (isServerless) return; // Don't run long-lived intervals in serverless environments
  const CRON_INTERVAL = 1000 * 60 * 60; // 1 hour
  setInterval(async () => {
    try {
      console.log('🔄 Running background hotScore recalculation...');
      // Only recalculate for posts from the last 30 days to save DB resources
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const postsToUpdate = await prisma.post.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, _count: { select: { likes: true } } },
      });

      // Update sequentially or in chunks (for simplicity we do sequential here)
      for (const post of postsToUpdate) {
        const newScore = calculateHotScore(post._count.likes, post.createdAt);
        await prisma.post.update({
          where: { id: post.id },
          data: { hotScore: newScore }
        });
      }
      console.log(`✅ Recalculated hotScore for ${postsToUpdate.length} recent posts.`);
    } catch (err) {
      console.error('❌ Error running hotScore cron job:', err);
    }
  }, CRON_INTERVAL);
}

if (isServerless) {
  // In serverless mode, attempt connection lazily (no blocking)
  connectWithRetry().catch(() => { });
} else {
  const PORT = process.env.PORT || 5000;

  // Start listening immediately — DB connects in the background
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectWithRetry().catch(() => { });
  });
}

// ── Global safety nets ───────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Promise Rejection:', reason);
  // Do NOT exit — log and continue
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err.message);
  // Do NOT exit — log and continue
});

export default app;
