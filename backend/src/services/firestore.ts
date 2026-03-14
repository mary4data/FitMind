import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

// firebase-admin is initialized in src/index.ts before any route is imported
const db = () => admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  name: string;
  goals: FitnessGoal;
  plan?: FitnessPlan;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface FitnessGoal {
  primaryGoal: string;
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
  duration: number;
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
  startedAt: admin.firestore.Timestamp;
  endedAt?: admin.firestore.Timestamp;
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
  const now = FieldValue.serverTimestamp();
  await db().collection('users').doc(userId).set({ userId, name, goals, createdAt: now, updatedAt: now });
  logger.info('User created', { userId });
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const snap = await db().collection('users').doc(userId).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function updateUserPlan(userId: string, plan: FitnessPlan) {
  await db().collection('users').doc(userId).update({ plan, updatedAt: FieldValue.serverTimestamp() });
  logger.info('User plan updated', { userId });
}

// ─── Session Operations ───────────────────────────────────────────────────────

export async function createSession(userId: string, sessionId: string) {
  await db().collection('sessions').doc(sessionId).set({
    sessionId,
    userId,
    startedAt: FieldValue.serverTimestamp(),
    highlights: [],
  });
  logger.info('Session created', { sessionId, userId });
}

export async function updateSession(sessionId: string, data: Partial<Session>) {
  await db().collection('sessions').doc(sessionId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const snap = await db().collection('sessions').doc(sessionId).get();
  return snap.exists ? (snap.data() as Session) : null;
}

export async function getUserSessions(userId: string, limit = 10): Promise<Session[]> {
  const snap = await db()
    .collection('sessions')
    .where('userId', '==', userId)
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d: admin.firestore.QueryDocumentSnapshot) => d.data() as Session);
}

export async function addSessionHighlight(sessionId: string, highlight: SessionHighlight) {
  await db().collection('sessions').doc(sessionId).update({
    highlights: FieldValue.arrayUnion(highlight),
  });
}

// ─── Streak / Progress ────────────────────────────────────────────────────────

export async function getUserStreak(userId: string): Promise<number> {
  const sessions = await getUserSessions(userId, 30);
  if (!sessions.length) return 0;
  let streak = 1;
  const dates = sessions
    .map((s) => s.startedAt.toDate().toDateString())
    .filter((v, i, a) => a.indexOf(v) === i);

  for (let i = 1; i < dates.length; i++) {
    const diff =
      (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
