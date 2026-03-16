import { generateWithVision, base64ToPart, streamCoachingResponse } from '../services/gemini';
import { synthesizeSpeechBase64 } from '../services/textToSpeech';
import { addSessionHighlight } from '../services/firestore';
import {
  LIVE_COACHING_SYSTEM,
  buildLiveCoachingPrompt,
  buildVoiceResponsePrompt,
} from '../prompts/liveCoaching';
import { logger } from '../utils/logger';

export interface CoachingFrame {
  sessionId: string;
  frameBase64: string;
  exercise: string;
  repCount: number;
  setNumber: number;
  targetReps: number;
  userMessage?: string;
}

export interface CoachingResponse {
  text: string;
  audioBase64?: string;
  formScore?: number;
  repDetected?: boolean;
}

export async function processCoachingFrame(frame: CoachingFrame): Promise<CoachingResponse> {
  const { sessionId, frameBase64, exercise, repCount, setNumber, targetReps, userMessage } = frame;

  const imagePart = base64ToPart(frameBase64, 'image/jpeg');
  const prompt = buildLiveCoachingPrompt(exercise, repCount, setNumber, targetReps, userMessage);

  logger.info('LiveCoachingAgent processing frame', { sessionId, exercise, repCount });

  const coachText = await generateWithVision(prompt, [imagePart], LIVE_COACHING_SYSTEM);

  // Estimate a form score based on coaching text sentiment (heuristic)
  const lowerText = coachText.toLowerCase();
  const formScore = lowerText.includes('great') || lowerText.includes('perfect')
    ? 95
    : lowerText.includes('good') || lowerText.includes('nice')
    ? 80
    : lowerText.includes('correct') || lowerText.includes('adjust')
    ? 65
    : 75;

  // Detect if a rep was completed
  const repDetected =
    lowerText.includes('rep') || lowerText.includes('great') || lowerText.includes('nice work');

  // Log a highlight if notable
  if (formScore >= 90 || lowerText.includes('personal best') || lowerText.includes('perfect')) {
    await addSessionHighlight(sessionId, {
      timestamp: formatTimestamp(Date.now()),
      label: formScore >= 90 ? 'Perfect Form' : 'Personal Best',
      category: formScore >= 90 ? 'form' : 'pr',
      description: coachText.slice(0, 100),
    });
  }

  // Convert coaching text to speech
  const audioBase64 = await synthesizeSpeechBase64({ text: coachText });

  return { text: coachText, audioBase64, formScore, repDetected };
}

export async function processVoiceCommand(
  sessionId: string,
  transcript: string,
  exercise: string,
  coachGender: 'female' | 'male' = 'female'
): Promise<CoachingResponse> {
  logger.info('LiveCoachingAgent voice command', { sessionId, transcript, coachGender });

  const prompt = buildVoiceResponsePrompt(transcript, exercise);
  const coachText = await generateWithVision(prompt, [], LIVE_COACHING_SYSTEM);
  const audioBase64 = await synthesizeSpeechBase64({ text: coachText });

  return { text: coachText, audioBase64 };
}

export async function streamCoachingFrame(
  frame: CoachingFrame,
  onChunk: (chunk: string) => void
): Promise<void> {
  const imagePart = base64ToPart(frame.frameBase64, 'image/jpeg');
  const prompt = buildLiveCoachingPrompt(
    frame.exercise,
    frame.repCount,
    frame.setNumber,
    frame.targetReps,
    frame.userMessage
  );

  await streamCoachingResponse(prompt, [imagePart], onChunk, LIVE_COACHING_SYSTEM);
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
