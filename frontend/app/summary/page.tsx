'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface Summary {
  durationFormatted: string;
  estimatedCalories: number;
  formAccuracy: number;
  intensity: string;
  overallScore: number;
  coachQuote: string;
  strengthsObserved: string[];
  areasToImprove: string[];
  nextSessionFocus: string;
  personalBests: string[];
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STREAK_DAYS = [true, true, true, true, true, false, false]; // 5-day streak

const HIGHLIGHTS = [
  {
    time: '05:23',
    text: 'Perfect squat form — 15 reps completed',
    badge: 'Form',
    color: 'bg-orange-100 text-orange-600',
    dot: 'bg-orange-400',
  },
  {
    time: '12:45',
    text: 'Posture corrected after AI feedback',
    badge: 'Correction',
    color: 'bg-yellow-100 text-yellow-600',
    dot: 'bg-yellow-400',
  },
  {
    time: '18:30',
    text: 'New personal best on plank hold: 1:45',
    badge: 'PR',
    color: 'bg-purple-100 text-purple-600',
    dot: 'bg-purple-400',
  },
  {
    time: '28:10',
    text: 'Final push-up set completed with great energy',
    badge: 'Strong',
    color: 'bg-yellow-100 text-yellow-600',
    dot: 'bg-yellow-400',
  },
];

// Demo fallback data (shown when no live session data exists)
const DEMO_SUMMARY: Summary = {
  durationFormatted: '32:14',
  estimatedCalories: 486,
  formAccuracy: 87,
  intensity: 'High',
  overallScore: 91,
  coachQuote:
    "You're getting stronger every session. Tomorrow, let's push for 500 calories!",
  strengthsObserved: ['Excellent squat depth', 'Consistent breathing throughout', 'Great push-up form'],
  areasToImprove: ['Keep wrists neutral during push-ups', 'Engage core more during planks'],
  nextSessionFocus: 'Core stability and hip mobility',
  personalBests: ['Longest plank hold: 1:45', '15 perfect squats in a row'],
};

export default function SummaryPage() {
  const [summary, setSummary] = useState<Summary>(DEMO_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      const sessionStr = sessionStorage.getItem('fitmind_session');
      if (!sessionStr) { setLoading(false); return; }

      const { sessionId } = JSON.parse(sessionStr);
      if (!sessionId || sessionId.startsWith('demo')) { setLoading(false); return; }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/end`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationSeconds: 1934, formAccuracy: 87 }),
          }
        );
        const data = await res.json();
        if (res.ok && data.summary) setSummary(data.summary);
      } catch { /* use demo data */ }
      setLoading(false);
    }
    loadSummary();
  }, []);

  const statTiles = [
    { icon: '🕐', label: 'Duration', value: summary.durationFormatted },
    { icon: '🔥', label: 'Calories', value: `${summary.estimatedCalories}` },
    { icon: '🎯', label: 'Accuracy', value: `${summary.formAccuracy}%` },
    { icon: '⚡', label: 'Intensity', value: summary.intensity },
  ];

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)' }}
      >
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto mb-4 text-purple-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="font-display font-bold text-[#1a1a2e]">Analyzing your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)',
      }}
    >
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Top badge */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-5 py-2 mb-4 font-semibold text-sm">
            🏆 Session Complete!
          </div>
          <h1 className="font-display font-extrabold text-4xl text-[#1a1a2e] mb-2">
            Great Workout! 🔥
          </h1>
          <p className="text-gray-500 font-body text-center">
            Here's your session breakdown and coach insights.
          </p>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {statTiles.map((t) => (
            <div key={t.label} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl mb-1">{t.icon}</p>
              <p className="font-display font-bold text-xl text-[#1a1a2e]">{t.value}</p>
              <p className="text-xs text-gray-400 font-body">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-[#1a1a2e] mb-4">Weekly Progress</h2>
          <div className="flex justify-between mb-3">
            {DAYS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    STREAK_DAYS[i]
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  style={
                    STREAK_DAYS[i]
                      ? { background: 'linear-gradient(135deg, #9B7FFA 0%, #E879A0 100%)' }
                      : {}
                  }
                >
                  {STREAK_DAYS[i] ? '🔥' : d}
                </div>
                <span className="text-xs text-gray-400">{d}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#7C5CFC] font-semibold text-center">
            🔥 5-day streak! Keep it going tomorrow
          </p>
        </div>

        {/* Session Highlights */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-[#1a1a2e] mb-5">Session Highlights</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100" />

            <div className="space-y-5">
              {HIGHLIGHTS.map((h, i) => (
                <div key={i} className="flex items-start gap-4 pl-1">
                  <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${h.dot} relative z-10`}>
                    <span className="text-white text-xs font-bold">{h.time.split(':')[0]}</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-[#1a1a2e] font-body leading-snug">{h.text}</p>
                    <div className="mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.color}`}>
                        {h.badge}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">{h.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Strengths + Improvements */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">✅ Strengths</h3>
            <ul className="space-y-2">
              {summary.strengthsObserved.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 font-body flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">●</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">🔧 To Improve</h3>
            <ul className="space-y-2">
              {summary.areasToImprove.map((a, i) => (
                <li key={i} className="text-xs text-gray-600 font-body flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">●</span>{a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Coach Quote Card */}
        <div
          className="rounded-2xl p-6 mb-8 text-white"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC 0%, #E879A0 100%)',
          }}
        >
          <p className="text-xs font-semibold opacity-80 mb-2 uppercase tracking-widest">
            Your AI Coach
          </p>
          <p className="font-display font-bold italic text-lg leading-snug mb-3">
            "{summary.coachQuote}"
          </p>
          <p className="text-xs opacity-70">Next session focus: {summary.nextSessionFocus}</p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/coaching"
            className="flex-1 text-center py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 transition"
            style={{ backgroundColor: 'var(--brand-purple)' }}
          >
            Start New Session
          </Link>
          <Link
            href="/"
            className="flex-1 text-center py-3 rounded-full font-semibold text-sm border-2 border-[#7C5CFC] text-[#7C5CFC] hover:bg-purple-50 transition"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
