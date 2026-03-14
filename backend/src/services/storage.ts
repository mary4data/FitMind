import { Storage } from '@google-cloud/storage';
import { logger } from '../utils/logger';
import path from 'path';

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const BUCKET = process.env.GCS_BUCKET || 'fitmind-sessions';

export async function uploadVideoBuffer(
  buffer: Buffer,
  sessionId: string,
  filename: string
): Promise<string> {
  const bucket = storage.bucket(BUCKET);
  const gcsPath = `sessions/${sessionId}/${filename}`;
  const file = bucket.file(gcsPath);

  await file.save(buffer, {
    metadata: { contentType: 'video/webm' },
    resumable: false,
  });

  // Make publicly accessible (for demo; in prod use signed URLs)
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${BUCKET}/${gcsPath}`;
  logger.info('Video uploaded', { sessionId, publicUrl });
  return publicUrl;
}

export async function getSignedUrl(gcsPath: string, expiresMinutes = 60): Promise<string> {
  const bucket = storage.bucket(BUCKET);
  const file = bucket.file(gcsPath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMinutes * 60 * 1000,
  });
  return url;
}

export async function ensureBucketExists(): Promise<void> {
  const bucket = storage.bucket(BUCKET);
  const [exists] = await bucket.exists();
  if (!exists) {
    await bucket.create({ location: process.env.GCS_REGION || 'us-central1' });
    logger.info('GCS bucket created', { BUCKET });
  }
}

export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}
