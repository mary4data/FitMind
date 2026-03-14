import speech from '@google-cloud/speech';
import { logger } from '../utils/logger';

const client = new speech.SpeechClient();

export async function transcribeAudio(
  audioBase64: string,
  encoding: 'WEBM_OPUS' | 'LINEAR16' | 'MP3' = 'WEBM_OPUS',
  sampleRateHertz = 48000
): Promise<string> {
  const [response] = await client.recognize({
    config: {
      encoding,
      sampleRateHertz,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    },
    audio: { content: audioBase64 },
  });

  const transcript = response.results
    ?.map((r) => r.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim();

  logger.info('STT transcribed', { length: transcript?.length });
  return transcript || '';
}

export async function streamingTranscribe(
  audioStream: NodeJS.ReadableStream,
  onTranscript: (text: string, isFinal: boolean) => void
): Promise<void> {
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: 'WEBM_OPUS' as const,
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        interimResults: true,
      },
    })
    .on('data', (data) => {
      const result = data.results[0];
      if (result) {
        const text = result.alternatives[0]?.transcript || '';
        onTranscript(text, result.isFinal);
      }
    });

  audioStream.pipe(recognizeStream);
  await new Promise<void>((resolve, reject) => {
    recognizeStream.on('end', resolve);
    recognizeStream.on('error', reject);
  });
}
