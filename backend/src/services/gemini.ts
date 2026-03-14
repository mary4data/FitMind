import { VertexAI, Part, Content } from '@google-cloud/vertexai';
import { logger } from '../utils/logger';

// Authenticates via Application Default Credentials — no API key needed.
// Locally: gcloud auth application-default login
// Cloud Run: uses the attached service account automatically.
const vertex = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.VERTEX_LOCATION || 'us-central1',
});

const MODEL = 'gemini-2.5-flash-preview-04-17';

function getModel(systemInstruction?: string) {
  return vertex.getGenerativeModel({
    model: MODEL,
    ...(systemInstruction && {
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      } as Content,
    }),
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 1.0,
      topP: 0.95,
    },
  });
}

// Generate a text-only response
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  logger.info('Vertex generateText', { promptLength: prompt.length });
  const result = await getModel(systemInstruction).generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// Generate a response with image frame(s) — multimodal
export async function generateWithVision(
  textPrompt: string,
  imageParts: Part[],
  systemInstruction?: string
): Promise<string> {
  logger.info('Vertex generateWithVision', { imageCount: imageParts.length });
  const parts: Part[] = [{ text: textPrompt }, ...imageParts];
  const result = await getModel(systemInstruction).generateContent({
    contents: [{ role: 'user', parts }],
  });
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// Stream coaching response — chunks arrive in real-time
export async function streamCoachingResponse(
  prompt: string,
  imageParts: Part[],
  onChunk: (chunk: string) => void,
  systemInstruction?: string
): Promise<void> {
  logger.info('Vertex streamCoachingResponse started');
  const parts: Part[] = [{ text: prompt }, ...imageParts];
  const streamResult = await getModel(systemInstruction).generateContentStream({
    contents: [{ role: 'user', parts }],
  });
  for await (const chunk of streamResult.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) onChunk(text);
  }
}

// Convert a base64 image string to a Vertex AI Part
export function base64ToPart(base64: string, mimeType = 'image/jpeg'): Part {
  return {
    inlineData: {
      data: base64.replace(/^data:image\/\w+;base64,/, ''),
      mimeType,
    },
  };
}
