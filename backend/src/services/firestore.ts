import { Firestore, FieldValue } from '@google-cloud/firestore';
import { logger } from '../utils/logger';

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  // In Cloud Run, credentials are auto-detected from the service account.
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var.
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  name: string;
  goals: FitnessGoal;
  plan?: FitnessPlan;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface FitnessGoal {
  primaryGoal: string; // e.g. "weight_loss", "muscle_gain", "endurance"
  targetWeight?: number;
  currentWeight?: number;
  weeklyWorkoutDays: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  dietaryPreferences?: string[];
  injuries?: string[];
}

export interface FitnessPlan {
  weeklySchedule: WorkoutDay[];
  nutritionGuidelines: NutritionPlan;
  generatedAt: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
  duration: number; // minutes
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface NutritionPlan {
  dailyCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: string[];
  hydration: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  startedAt: FirebaseFirestore.Timestamp;
  endedAt?: FirebaseFirestore.Timestamp;
  durationSeconds?: number;
  caloriesBurned?: number;
  formAccuracy?: number;
  intensity?: string;
  highlights: SessionHighlight[];
  aiSummary?: string;
  videoUrl?: string;
}

export interface SessionHighlight {
  timestamp: string;
  label: string;
  category: 'form' | 'correction' | 'pr' | 'strong';
  description: string;
}

// ─── User Operations ──────────────────────────────────────────────────────────

export async function createUser(userId: string, name: string, goals: FitnessGoal) {
  const ref = db.collection('users').doc(userId);
  const now = FieldValue.serverTimestamp();
  await ref.set({ userId, name, goals, createdAt: now, updatedAt: now });
  logger.info('User created', { userId });
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const snap = await db.collection('users').doc(userId).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function updateUserPlan(userId: string, plan: FitnessPlan) {
  await db
    .collection('users')
    .doc(userId)
    .update({ plan, updatedAt: FieldValue.serverTimestamp() });
  logger.info('User plan updated', { userId });
}

// ─── Session Operations ───────────────────────────────────────────────────────

export async function createSession(userId: string, sessionId: string) {
  const ref = db.collection('sessions').doc(sessionId);
  await ref.set({
    sessionId,
    userId,
    startedAt: FieldValue.serverTimestamp(),
    highlights: [],
  });
  logger.info('Session created', { sessionId, userId });
}

export async function updateSession(sessionId: string, data: Partial<Session>) {
  await db
    .collection('sessions')
    .doc(sessionId)
    .update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const snap = await db.collection('sessions').doc(sessionId).get();
  return snap.exists ? (snap.data() as Session) : null;
}

export async function getUserSessions(userId: string, limit = 10): Promise<Session[]> {
  const snap = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as Session);
}

export async function addSessionHighlight(sessionId: string, highlight: SessionHighlight) {
  await db
    .collection('sessions')
    .doc(sessionId)
    .update({ highlights: FieldValue.arrayUnion(highlight) });
}

// ─── Streak / Progress ────────────────────────────────────────────────────────

export async function getUserStreak(userId: string): Promise<number> {
  const sessions = await getUserSessions(userId, 30);
  if (!sessions.length) return 0;
  let streak = 1;
  const dates = sessions
    .map((s) => {
      const ts = s.startedAt as unknown as { _seconds: number };
      return new Date(ts._seconds * 1000).toDateString();
    })
    .filter((v, i, a) => a.indexOf(v) === i); // unique dates

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export { db };
