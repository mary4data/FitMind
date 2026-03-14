import textToSpeech from '@google-cloud/text-to-speech';
import { logger } from '../utils/logger';

const client = new textToSpeech.TextToSpeechClient();

export interface TTSOptions {
  text: string;
  languageCode?: string;
  voiceName?: string; // e.g. "en-US-Neural2-F"
  speakingRate?: number; // 0.25–4.0, default 1.0
  pitch?: number; // -20.0–20.0 semitones
}

export async function synthesizeSpeech(options: TTSOptions): Promise<Buffer> {
  const {
    text,
    languageCode = 'en-US',
    voiceName = 'en-US-Neural2-F',
    speakingRate = 1.1,
    pitch = 0,
  } = options;

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate,
      pitch,
    },
  });

  logger.info('TTS synthesized', { textLength: text.length });
  return Buffer.from(response.audioContent as Uint8Array);
}

export async function synthesizeSpeechBase64(options: TTSOptions): Promise<string> {
  const buffer = await synthesizeSpeech(options);
  return buffer.toString('base64');
}
