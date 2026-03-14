import { generateText } from '../services/gemini';
import { getSession, updateSession } from '../services/firestore';
import { FEEDBACK_SYSTEM, buildSessionFeedbackPrompt } from '../prompts/sessionFeedback';
import { logger } from '../utils/logger';

export interface SessionSummary {
  overallScore: number;
  strengthsObserved: string[];
  areasToImprove: string[];
  coachQuote: string;
  nextSessionFocus: string;
  estimatedCalories: number;
  intensity: string;
  personalBests: string[];
  motivationScore: number;
  durationFormatted: string;
  formAccuracy: number;
  highlightsCount: number;
}

export async function runFeedbackAgent(sessionId: string): Promise<SessionSummary> {
  logger.info('FeedbackAgent started', { sessionId });

  const session = await getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const durationSeconds = session.durationSeconds || 0;
  const formAccuracy = session.formAccuracy || 75;
  const exercises = [...new Set(session.highlights.map((h) => h.label).filter(Boolean))];
  const highlights = session.highlights || [];

  const prompt = buildSessionFeedbackPrompt(
    durationSeconds,
    highlights,
    exercises,
    formAccuracy
  );

  const rawResponse = await generateText(prompt, FEEDBACK_SYSTEM);

  let parsed: Omit<SessionSummary, 'durationFormatted' | 'formAccuracy' | 'highlightsCount'>;
  try {
    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    logger.error('FeedbackAgent JSON parse error', { rawResponse, error: e });
    throw new Error('Failed to parse session summary from AI response');
  }

  const minutes = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationFormatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const summary: SessionSummary = {
    ...parsed,
    durationFormatted,
    formAccuracy,
    highlightsCount: highlights.length,
  };

  // Persist summary to session record
  await updateSession(sessionId, {
    aiSummary: parsed.coachQuote,
    caloriesBurned: parsed.estimatedCalories,
    intensity: parsed.intensity,
    endedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  });

  logger.info('FeedbackAgent completed', { sessionId, score: summary.overallScore });
  return summary;
}
