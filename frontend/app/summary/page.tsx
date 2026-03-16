'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthProvider';

interface SessionSummary {
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

interface CoachMessage {
  text: string;
  timestamp: number;
  type: 'coach' | 'user';
}

interface StoredSession {
  sessionId: string;
  summary: SessionSummary | null;
  startedAt: number;
  durationSeconds: number;
  calories: number;
  formAccuracy: number;
  messages: CoachMessage[];
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getBadgeStyle(type: 'coach' | 'user') {
  return type === 'coach'
    ? { color: 'bg-purple-100 text-purple-600', dot: 'bg-purple-400', badge: 'Coach' }
    : { color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-400', badge: 'You' };
}

export default function SummaryPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekDays, setWeekDays] = useState<boolean[]>(Array(7).fill(false));
  const [loading, setLoading] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('fitmind_session');
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      // If summary came back without durationFormatted, compute it from durationSeconds
      if (parsed.summary && !parsed.summary.durationFormatted) {
        parsed.summary.durationFormatted = formatDuration(parsed.durationSeconds);
      }
      if (parsed.summary && !parsed.summary.estimatedCalories) {
        parsed.summary.estimatedCalories = parsed.calories;
      }
      if (parsed.summary && !parsed.summary.formAccuracy) {
        parsed.summary.formAccuracy = parsed.formAccuracy;
      }
      setSession(parsed);
    }
    setLoading(false);
  }, []);

  // Fetch streak + weekly activity after auth resolves
  useEffect(() => {
    if (authLoading || !user) return;
    async function fetchHistory() {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/me/history?limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setStreak(data.streak || 0);

        // Build which days of the current week had sessions
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        const active = Array(7).fill(false);
        (data.sessions || []).forEach((s: { startedAt: { _seconds: number } }) => {
          const d = new Date(s.startedAt._seconds * 1000);
          const dayIdx = (d.getDay() + 6) % 7; // Mon=0
          const diffDays = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays < 7) active[dayIdx] = true;
        });
        setWeekDays(active);
      } catch { /* streak stays 0 */ }
    }
    fetchHistory();
  }, [authLoading, user, getToken]);

  // ── PDF Export ──────────────────────────────────────────────────────────────
  async function downloadPDF() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const s = session?.summary;
    const purple = [124, 92, 252] as [number, number, number];

    doc.setFillColor(...purple);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FitMind — Session Summary', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (session?.startedAt) {
      doc.text(`${formatDate(session.startedAt)} at ${formatTime(session.startedAt)}`, 14, 26);
    }

    doc.setTextColor(26, 26, 46);
    let y = 40;

    // Stats row
    const stats = [
      ['Duration', s?.durationFormatted || formatDuration(session?.durationSeconds || 0)],
      ['Calories', `${s?.estimatedCalories ?? session?.calories ?? 0}`],
      ['Form Accuracy', `${s?.formAccuracy ?? session?.formAccuracy ?? 0}%`],
      ['Intensity', s?.intensity || '—'],
      ['Overall Score', s ? `${s.overallScore}/100` : '—'],
    ];
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Stats', 14, y); y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    stats.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, y); y += 5;
    });

    if (s) {
      y += 4;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('AI Coach Insight', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'italic');
      const lines = doc.splitTextToSize(`"${s.coachQuote}"`, 180);
      doc.text(lines, 14, y); y += lines.length * 5 + 4;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Strengths', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      s.strengthsObserved.forEach((str) => { doc.text(`• ${str}`, 16, y); y += 5; });

      y += 2;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Areas to Improve', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      s.areasToImprove.forEach((a) => { doc.text(`• ${a}`, 16, y); y += 5; });

      if (s.personalBests?.length) {
        y += 2;
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('Personal Bests', 14, y); y += 6;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        s.personalBests.forEach((pb) => { doc.text(`🏆 ${pb}`, 16, y); y += 5; });
      }

      y += 2;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Next Session Focus', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(s.nextSessionFocus, 14, y); y += 8;
    }

    // Coach feed messages
    if (session?.messages?.length) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Coach Feed Highlights', 14, y); y += 6;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      session.messages.slice(0, 10).forEach((m) => {
        const prefix = m.type === 'coach' ? 'Coach: ' : 'You: ';
        const lines = doc.splitTextToSize(`${prefix}${m.text}`, 180);
        doc.text(lines, 14, y); y += lines.length * 4 + 2;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    const dateStr = session?.startedAt
      ? new Date(session.startedAt).toISOString().slice(0, 10)
      : 'session';
    doc.save(`fitmind-summary-${dateStr}.pdf`);
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function downloadCSV() {
    const s = session?.summary;
    const rows: string[][] = [
      ['Field', 'Value'],
      ['Date', session?.startedAt ? formatDate(session.startedAt) : ''],
      ['Time', session?.startedAt ? formatTime(session.startedAt) : ''],
      ['Duration', s?.durationFormatted || formatDuration(session?.durationSeconds || 0)],
      ['Calories', String(s?.estimatedCalories ?? session?.calories ?? 0)],
      ['Form Accuracy (%)', String(s?.formAccuracy ?? session?.formAccuracy ?? 0)],
      ['Intensity', s?.intensity || ''],
      ['Overall Score', s ? String(s.overallScore) : ''],
      ['Coach Quote', s?.coachQuote || ''],
      ['Next Session Focus', s?.nextSessionFocus || ''],
      [],
      ['Strengths'],
      ...(s?.strengthsObserved || []).map((x) => ['', x]),
      [],
      ['Areas to Improve'],
      ...(s?.areasToImprove || []).map((x) => ['', x]),
      [],
      ['Personal Bests'],
      ...(s?.personalBests || []).map((x) => ['', x]),
      [],
      ['Coach Feed'],
      ...(session?.messages || []).map((m) => [m.type === 'coach' ? 'Coach' : 'You', m.text]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitmind-summary-${session?.startedAt ? new Date(session.startedAt).toISOString().slice(0, 10) : 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)' }}>
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto mb-4 text-purple-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="font-display font-bold text-[#1a1a2e]">Analysing your session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)' }}>
        <p className="text-gray-500 font-body">No session data found.</p>
        <Link href="/coaching"
          className="rounded-full px-6 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--brand-purple)' }}>
          Start a Session
        </Link>
      </div>
    );
  }

  const s = session.summary;
  const duration = s?.durationFormatted || formatDuration(session.durationSeconds);
  const calories = s?.estimatedCalories ?? session.calories;
  const accuracy = s?.formAccuracy ?? session.formAccuracy;
  const intensity = s?.intensity || '—';

  const statTiles = [
    { icon: '🕐', label: 'Duration', value: duration },
    { icon: '🔥', label: 'Calories', value: String(calories) },
    { icon: '🎯', label: 'Accuracy', value: `${accuracy}%` },
    { icon: '⚡', label: 'Intensity', value: intensity },
  ];

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)' }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pb-12" ref={summaryRef}>
        {/* Header */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-5 py-2 mb-4 font-semibold text-sm">
            🏆 Session Complete!
          </div>
          <h1 className="font-display font-extrabold text-4xl text-[#1a1a2e] mb-1">
            Great Workout! 🔥
          </h1>
          {session.startedAt > 0 && (
            <p className="text-gray-400 text-sm font-body mt-1">
              {formatDate(session.startedAt)} · {formatTime(session.startedAt)}
            </p>
          )}
          <p className="text-gray-500 font-body text-center mt-1">
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

        {/* Overall Score */}
        {s?.overallScore && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-[#1a1a2e]">Overall Performance Score</p>
              <p className="text-xs text-gray-400 mt-0.5 font-body">AI-evaluated based on form, effort & consistency</p>
            </div>
            <div className="text-4xl font-display font-black" style={{ color: 'var(--brand-purple)' }}>
              {s.overallScore}<span className="text-base font-normal text-gray-400">/100</span>
            </div>
          </div>
        )}

        {/* Weekly Progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-[#1a1a2e] mb-4">Weekly Progress</h2>
          <div className="flex justify-between mb-3">
            {DAYS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    weekDays[i] ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                  }`}
                  style={weekDays[i] ? { background: 'linear-gradient(135deg, #9B7FFA 0%, #E879A0 100%)' } : {}}
                >
                  {weekDays[i] ? '🔥' : d}
                </div>
                <span className="text-xs text-gray-400">{d}</span>
              </div>
            ))}
          </div>
          {streak > 0 && (
            <p className="text-sm font-semibold text-center" style={{ color: 'var(--brand-purple)' }}>
              🔥 {streak}-day streak! Keep it going tomorrow
            </p>
          )}
        </div>

        {/* Coach Feed Highlights */}
        {session.messages.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-display font-bold text-lg text-[#1a1a2e] mb-5">Session Highlights</h2>
            <div className="relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100" />
              <div className="space-y-5">
                {session.messages.slice(0, 8).map((m, i) => {
                  const style = getBadgeStyle(m.type);
                  const elapsed = Math.floor((m.timestamp - session.startedAt) / 1000);
                  const mins = Math.floor(elapsed / 60);
                  const secs = elapsed % 60;
                  const timeLabel = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
                  return (
                    <div key={i} className="flex items-start gap-4 pl-1">
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${style.dot} relative z-10`}>
                        <span className="text-white text-xs font-bold">{String(mins).padStart(2,'0')}</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm text-[#1a1a2e] font-body leading-snug">{m.text}</p>
                        <div className="mt-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.color}`}>
                            {style.badge}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{timeLabel}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI Strengths + Improvements */}
        {s && (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">✅ Strengths</h3>
              <ul className="space-y-2">
                {s.strengthsObserved.map((str, i) => (
                  <li key={i} className="text-xs text-gray-600 font-body flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">●</span>{str}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">🔧 To Improve</h3>
              <ul className="space-y-2">
                {s.areasToImprove.map((a, i) => (
                  <li key={i} className="text-xs text-gray-600 font-body flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Personal Bests */}
        {(s?.personalBests?.length ?? 0) > 0 && s && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">🏆 Personal Bests This Session</h3>
            <ul className="space-y-2">
              {s.personalBests.map((pb, i) => (
                <li key={i} className="text-xs text-gray-600 font-body flex items-start gap-2">
                  <span style={{ color: 'var(--brand-purple)' }} className="mt-0.5">●</span>{pb}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Coach Quote */}
        {s && (
          <div className="rounded-2xl p-6 mb-6 text-white"
            style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #E879A0 100%)' }}>
            <p className="text-xs font-semibold opacity-80 mb-2 uppercase tracking-widest">Your AI Coach</p>
            <p className="font-display font-bold italic text-lg leading-snug mb-3">
              "{s.coachQuote}"
            </p>
            <p className="text-xs opacity-70">Next session focus: {s.nextSessionFocus}</p>
          </div>
        )}

        {/* Export Buttons */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">📥 Export Summary</h3>
          <div className="flex gap-3">
            <button
              onClick={downloadPDF}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-purple)' }}
            >
              Download PDF
            </button>
            <button
              onClick={downloadCSV}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold border-2 text-gray-600 hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--brand-purple)', color: 'var(--brand-purple)' }}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/coaching"
            className="flex-1 text-center py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 transition"
            style={{ backgroundColor: 'var(--brand-purple)' }}>
            Start New Session
          </Link>
          <Link href="/"
            className="flex-1 text-center py-3 rounded-full font-semibold text-sm border-2 hover:bg-purple-50 transition"
            style={{ borderColor: 'var(--brand-purple)', color: 'var(--brand-purple)' }}>
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
