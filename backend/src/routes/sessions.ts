import { Router } from 'express';
import { z } from 'zod';
import { getSession, getUserSessions, updateSession, getUserStreak } from '../services/firestore';
import { runFeedbackAgent } from '../agents/feedbackAgent';
import { logger } from '../utils/logger';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const sessionsRouter = Router();

const EndSessionSchema = z.object({
  durationSeconds: z.number(),
  formAccuracy: z.number().min(0).max(100),
});

// GET /api/sessions/me/history — MUST be before /:sessionId to avoid "me" being treated as an ID
sessionsRouter.get('/me/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const [sessions, streak] = await Promise.all([
      getUserSessions(req.uid!, limit),
      getUserStreak(req.uid!),
    ]);
    res.json({ sessions, streak });
  } catch (err) {
    logger.error('GET /sessions/me/history error', { error: err });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions/:sessionId/end
sessionsRouter.post('/:sessionId/end', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const body = EndSessionSchema.parse(req.body);

    await updateSession(sessionId, {
      durationSeconds: body.durationSeconds,
      formAccuracy: body.formAccuracy,
    });

    const summary = await runFeedbackAgent(sessionId);
    res.json({ sessionId, summary });
  } catch (err) {
    logger.error('POST /sessions/:id/end error', { error: err });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/sessions/:sessionId
sessionsRouter.get('/:sessionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    logger.error('GET /sessions/:id error', { error: err });
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

