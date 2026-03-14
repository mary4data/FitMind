import Link from 'next/link';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: '👁',
    title: 'Real-Time Vision',
    body: 'AI watches your form and corrects posture in real-time',
  },
  {
    icon: '🎙',
    title: 'Voice Coaching',
    body: 'Speak naturally — your coach listens and responds instantly',
  },
  {
    icon: '🧠',
    title: 'Smart Plans',
    body: 'Personalized fitness & nutrition plans powered by Gemini AI',
  },
  {
    icon: '📈',
    title: 'Live Feedback',
    body: 'Motivational cues and rep counting as you work out',
  },
  {
    icon: '🎯',
    title: 'Goal Tracking',
    body: 'Streaks, milestones, and progress visualized beautifully',
  },
  {
    icon: '📊',
    title: 'Session Analysis',
    body: 'Post-workout highlights with detailed performance breakdown',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-bg-warm)' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-24">
        {/* Pill badge */}
        <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-4 py-1 text-sm text-gray-600 mb-8 font-body">
          Powered by Gemini AI ✨
        </span>

        {/* Heading */}
        <h1 className="font-display font-extrabold text-6xl md:text-7xl tracking-tight text-[#1a1a2e] leading-[1.05] mb-6">
          Your AI Fitness Coach That
          <br />
          <span className="text-[#1a1a2e]">Sees &amp; Hears You</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg text-gray-500 font-body mb-10 leading-relaxed">
          Real-time posture correction, voice-guided workouts, and personalized plans —
          all from your browser.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <Link
            href="/goals"
            className="rounded-full px-8 py-3 text-white font-semibold text-base shadow-md transition-opacity hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--brand-purple)' }}
          >
            Start Coaching Session
          </Link>
          <Link
            href="/summary"
            className="rounded-full px-8 py-3 font-semibold text-base border-2 border-[#7C5CFC] text-[#7C5CFC] bg-transparent hover:bg-purple-50 transition-colors"
          >
            View Demo Summary
          </Link>
        </div>

        {/* Floating Hero Card */}
        <div className="rounded-3xl shadow-xl bg-white p-6 w-full max-w-sm text-left">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #fde8d8 0%, #ede9f6 100%)',
            }}
          >
            {/* Live badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-gray-700">Live Coaching Active</span>
            </div>

            {/* Avatar */}
            <div className="text-5xl text-center mb-3">🧘</div>

            {/* Coach quote */}
            <p
              className="text-center font-display font-bold italic text-[#1a1a2e] text-lg mb-4 leading-snug"
            >
              "Great form! Keep your core tight."
            </p>

            {/* Stats row */}
            <div className="flex justify-around text-sm text-gray-600 font-body border-t border-white/60 pt-3">
              <span>🕐 12:34</span>
              <span>🔥 186 cal</span>
              <span>💪 Set 3/5</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        className="px-6 py-20"
        style={{ backgroundColor: 'var(--brand-bg-cool)' }}
      >
        <h2 className="font-display font-bold text-4xl md:text-5xl text-[#1a1a2e] text-center mb-12 tracking-tight">
          Everything You Need to Crush Your Goals
        </h2>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  background: 'linear-gradient(135deg, #9B7FFA 0%, #E879A0 100%)',
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-lg text-[#1a1a2e]">{f.title}</h3>
              <p className="text-gray-500 text-sm font-body leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center py-8 text-sm text-gray-400 font-body" style={{ backgroundColor: 'var(--brand-bg-cool)' }}>
        FitMind © 2026 · Built with Gemini 2.5 Flash + Google Cloud
      </footer>
    </div>
  );
}
