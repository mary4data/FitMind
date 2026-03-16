import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AuthRequest extends Request {
  uid?: string;
  userEmail?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = header.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
