import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { goalsRouter } from './routes/goals';
import { coachingRouter } from './routes/coaching';
import { sessionsRouter } from './routes/sessions';
import { uploadRouter } from './routes/upload';
import { logger } from './utils/logger';

dotenv.config();

// ── Firebase Admin SDK init ───────────────────────────────────────────────────
// On Cloud Run: uses the attached service account automatically (no key file needed).
// Locally: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    storageBucket: process.env.GCS_BUCKET,
  });
  logger.info('Firebase Admin initialized', { project: process.env.GOOGLE_CLOUD_PROJECT });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fitmind-backend', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/goals', goalsRouter);
app.use('/api/coaching', coachingRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/upload', uploadRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  logger.info(`FitMind backend running on port ${PORT}`);
});

export default app;
