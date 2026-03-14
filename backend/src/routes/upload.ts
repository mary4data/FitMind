import { Router } from 'express';
import multer from 'multer';
import { uploadVideoBuffer } from '../services/storage';
import { updateSession } from '../services/firestore';
import { logger } from '../utils/logger';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

// POST /api/upload/session-video — upload session recording
uploadRouter.post('/session-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const filename = `recording_${Date.now()}.webm`;
    const videoUrl = await uploadVideoBuffer(req.file.buffer, sessionId, filename);

    // Update session with video URL
    await updateSession(sessionId, { videoUrl });

    logger.info('Session video uploaded', { sessionId, videoUrl });
    res.json({ videoUrl, sessionId });
  } catch (err) {
    logger.error('POST /upload/session-video error', { error: err });
    res.status(500).json({ error: 'Failed to upload video' });
  }
});
