import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createSession } from '../services/firestore';
import { processCoachingFrame, processVoiceCommand, streamCoachingFrame } from '../agents/liveCoachingAgent';
import { transcribeAudio } from '../services/speechToText';
import { logger } from '../utils/logger';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const coachingRouter = Router();

const FrameSchema = z.object({
  sessionId: z.string(),
  frameBase64: z.string(),
  exercise: z.string(),
  repCount: z.number().default(0),
  setNumber: z.number().default(1),
  targetReps: z.number().default(12),
  userMessage: z.string().optional(),
});

const VoiceSchema = z.object({
  sessionId: z.string(),
  audioBase64: z.string().optional(),
  transcript: z.string().optional(),
  exercise: z.string(),
  coachGender: z.enum(['female', 'male']).default('female'),
});

// POST /api/coaching/session — start a new coaching session
coachingRouter.post('/session', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { exercise } = req.body;
    const userId = req.uid!;
    const sessionId = uuidv4();
    await createSession(userId, sessionId);
    logger.info('Coaching session started', { sessionId, userId, exercise });
    res.json({ sessionId });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('POST /coaching/session error', { error: errMsg, uid: req.uid });
    res.status(500).json({ error: 'Failed to start session', detail: errMsg });
  }
});

// POST /api/coaching/frame — process a video frame and get coaching feedback
coachingRouter.post('/frame', requireAuth, async (req: AuthRequest, res) => {
  try {
    const frame = FrameSchema.parse(req.body);
    const response = await processCoachingFrame(frame);
    res.json(response);
  } catch (err) {
    logger.error('POST /coaching/frame error', { error: err });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to process coaching frame' });
  }
});

// POST /api/coaching/frame/stream — SSE streaming coaching feedback
coachingRouter.post('/frame/stream', requireAuth, async (req: AuthRequest, res) => {
  const frame = FrameSchema.parse(req.body);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await streamCoachingFrame(frame, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });
    res.write('data: [DONE]\n\n');
  } catch (err) {
    logger.error('Streaming error', { error: err });
    res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
  } finally {
    res.end();
  }
});

// POST /api/coaching/voice — process voice command (transcript or audio)
coachingRouter.post('/voice', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = VoiceSchema.parse(req.body);

    // Accept direct transcript (Web Speech API) or base64 audio (MediaRecorder)
    const transcript = body.transcript ?? await transcribeAudio(body.audioBase64 ?? '');
    logger.info('Voice transcribed', { sessionId: body.sessionId, transcript });

    const response = await processVoiceCommand(
      body.sessionId,
      transcript,
      body.exercise,
      body.coachGender,
    );
    res.json({ transcript, ...response });
  } catch (err) {
    logger.error('POST /coaching/voice error', { error: err });
    res.status(500).json({ error: 'Failed to process voice command' });
  }
});
