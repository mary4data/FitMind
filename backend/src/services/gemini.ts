import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Primary model: Gemini 2.5 Flash (fast, multimodal)
export const getFlashModel = () =>
  genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });

// Generate a text response from Gemini
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    ...(systemInstruction && { systemInstruction }),
  });

  logger.info('Gemini generateText', { promptLength: prompt.length });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Generate a response with image/video frame input
export async function generateWithVision(
  textPrompt: string,
  imageParts: Part[],
  systemInstruction?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    ...(systemInstruction && { systemInstruction }),
  });

  const parts: Part[] = [{ text: textPrompt }, ...imageParts];
  logger.info('Gemini generateWithVision', { imageCount: imageParts.length });
  const result = await model.generateContent(parts);
  return result.response.text();
}

// Stream text generation for real-time coaching
export async function streamCoachingResponse(
  prompt: string,
  imageParts: Part[],
  onChunk: (chunk: string) => void,
  systemInstruction?: string
): Promise<void> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    ...(systemInstruction && { systemInstruction }),
  });

  const parts: Part[] = [{ text: prompt }, ...imageParts];
  logger.info('Gemini streamCoachingResponse started');

  const result = await model.generateContentStream(parts);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) onChunk(text);
  }
}

// Convert a base64 image to a Gemini Part
export function base64ToPart(base64: string, mimeType = 'image/jpeg'): Part {
  return {
    inlineData: {
      data: base64.replace(/^data:image\/\w+;base64,/, ''),
      mimeType,
    },
  };
}
