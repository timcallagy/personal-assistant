import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/index.js';
import { asyncHandler } from '../middleware/index.js';

export const golfRouter = Router();

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface GolfRequest extends Request {
  golfUser?: { id: number; username: string };
}

async function golfAuth(req: GolfRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }
  const token = auth.slice(7);
  const session = await prisma.golfSession.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    return;
  }
  req.golfUser = session.user;
  next();
}

// POST /golf/login
golfRouter.post('/login', asyncHandler(async (req: GolfRequest, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'username and password are required' } });
    return;
  }
  const user = await prisma.golfUser.findUnique({ where: { username } });
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    return;
  }
  // Clean up expired sessions for this user
  await prisma.golfSession.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });
  const session = await prisma.golfSession.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  res.json({ success: true, data: { token: session.id, username: user.username } });
}));

// POST /golf/rounds — save a completed round
golfRouter.post('/rounds', golfAuth, asyncHandler(async (req: GolfRequest, res) => {
  const { course, holes, totalShots, holeData } = req.body as {
    course?: string;
    holes?: number;
    totalShots?: number;
    holeData?: unknown[];
  };
  if (!course || typeof holes !== 'number' || typeof totalShots !== 'number' || !Array.isArray(holeData)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'course, holes, totalShots, and holeData are required' } });
    return;
  }
  const round = await prisma.golfRound.create({
    data: {
      userId: req.golfUser!.id,
      course,
      holes,
      totalShots,
      holeData: holeData as object[],
    },
  });
  res.json({ success: true, data: { id: round.id, playedAt: round.playedAt } });
}));

// GET /golf/rounds — list rounds for the current user
golfRouter.get('/rounds', golfAuth, asyncHandler(async (req: GolfRequest, res) => {
  const rounds = await prisma.golfRound.findMany({
    where: { userId: req.golfUser!.id },
    orderBy: { playedAt: 'desc' },
    select: { id: true, course: true, holes: true, totalShots: true, holeData: true, playedAt: true },
  });
  res.json({ success: true, data: rounds });
}));
