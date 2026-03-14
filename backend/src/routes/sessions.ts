import { Router } from 'express';
import { z } from 'zod';
import { getSession, getUserSessions, updateSession, getUserStreak } from '../services/firestore';
import { runFeedbackAgent } from '../agents/feedbackAgent';
import { logger } from '../utils/logger';

export const sessionsRouter = Router();

const EndSessionSchema = z.object({
  durationSeconds: z.number(),
  formAccuracy: z.number().min(0).max(100),
});

// POST /api/sessions/:sessionId/end — finalize session + generate AI summary
sessionsRouter.post('/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const body = EndSessionSchema.parse(req.body);

    await updateSession(sessionId, {
      durationSeconds: body.durationSeconds,
      formAccuracy: body.formAccuracy,
    });

    // Run Feedback Agent
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

// GET /api/sessions/:sessionId — get session details
sessionsRouter.get('/:sessionId', async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    logger.error('GET /sessions/:id error', { error: err });
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// GET /api/sessions/user/:userId — get user's session history + streak
sessionsRouter.get('/user/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const [sessions, streak] = await Promise.all([
      getUserSessions(req.params.userId, limit),
      getUserStreak(req.params.userId),
    ]);
    res.json({ sessions, streak });
  } catch (err) {
    logger.error('GET /sessions/user/:userId error', { error: err });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});
