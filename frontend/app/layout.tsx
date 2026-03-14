import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FitMind — AI Fitness Coach That Sees & Hears You',
  description:
    'Real-time posture correction, voice-guided workouts, and personalized plans — all from your browser. Powered by Gemini AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
