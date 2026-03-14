import { SessionHighlight } from '../services/firestore';

export const FEEDBACK_SYSTEM = `You are FitMind Session Analyst — an expert AI coach who reviews workout sessions.
Provide detailed, encouraging post-workout analysis.
Always respond with valid JSON only — no markdown fences, no extra text.`;

export function buildSessionFeedbackPrompt(
  durationSeconds: number,
  highlights: SessionHighlight[],
  exercises: string[],
  formAccuracy: number
): string {
  const minutes = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;

  return `Analyze this completed workout session and generate a comprehensive summary.

Session Data:
- Duration: ${minutes}:${String(secs).padStart(2, '0')}
- Form Accuracy: ${formAccuracy}%
- Exercises Completed: ${exercises.join(', ')}
- Key Highlights:
${highlights.map((h) => `  - [${h.timestamp}] ${h.description} (${h.category})`).join('\n')}

Return ONLY this JSON:
{
  "overallScore": 85,
  "strengthsObserved": ["Great squat depth", "Consistent breathing"],
  "areasToImprove": ["Keep wrists neutral during push-ups"],
  "coachQuote": "You're getting stronger every session. Tomorrow, let's push for 500 calories!",
  "nextSessionFocus": "Core stability and hip mobility",
  "estimatedCalories": 486,
  "intensity": "High",
  "personalBests": ["Longest plank hold: 1:45"],
  "motivationScore": 9
}`;
}
