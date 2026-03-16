'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthProvider';

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: '🔥' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
  { id: 'endurance', label: 'Endurance', icon: '🏃' },
  { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
  { id: 'general_fitness', label: 'General Fitness', icon: '⚡' },
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { id: 'intermediate', label: 'Intermediate', desc: '1–3 years training' },
  { id: 'advanced', label: 'Advanced', desc: '3+ years training' },
];

const DAYS = [2, 3, 4, 5, 6];

export default function GoalsPage() {
  const router = useRouter();
  const { user, loading: authLoading, getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [hasPlan, setHasPlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Check if user already has a plan
  useEffect(() => {
    if (authLoading || !user) return;
    async function check() {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.plan) {
            sessionStorage.setItem('fitmind_plan', JSON.stringify(data.plan));
            setHasPlan(true);
          }
        }
      } catch { /* no plan yet */ }
      setCheckingPlan(false);
    }
    check();
  }, [authLoading, user, getToken]);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    primaryGoal: '',
    fitnessLevel: '',
    weeklyWorkoutDays: 4,
    currentWeight: '',
    targetWeight: '',
    dietaryPreferences: [] as string[],
    injuries: '',
  });
  const [error, setError] = useState('');

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          primaryGoal: form.primaryGoal,
          fitnessLevel: form.fitnessLevel,
          weeklyWorkoutDays: form.weeklyWorkoutDays,
          currentWeight: form.currentWeight ? Number(form.currentWeight) : undefined,
          targetWeight: form.targetWeight ? Number(form.targetWeight) : undefined,
          injuries: form.injuries ? form.injuries.split(',').map((s) => s.trim()) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');

      // Store userId and plan in sessionStorage for coaching page
      sessionStorage.setItem('fitmind_user', JSON.stringify({ userId: data.userId, name: form.name }));
      sessionStorage.setItem('fitmind_plan', JSON.stringify(data.plan));
      router.push('/coaching');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (checkingPlan || authLoading) return null;

  if (hasPlan) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
        <div className="text-4xl">🎯</div>
        <h2 className="font-display font-bold text-xl text-[#1a1a2e]">You already have a plan!</h2>
        <p className="text-sm text-gray-400 font-body">Your personalised fitness plan is ready. Jump straight into your session.</p>
        <button
          onClick={() => router.push('/coaching')}
          className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 transition"
          style={{ backgroundColor: 'var(--brand-purple)' }}
        >
          🚀 Start Coaching Session
        </button>
        <button
          onClick={() => setHasPlan(false)}
          className="w-full py-3 rounded-full font-semibold text-sm border-2 border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          ✏️ Update My Goals
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)',
      }}
    >
      <Navbar />

      <div className="flex flex-col items-center px-6 py-12">
        {/* Progress bar */}
        <div className="w-full max-w-lg mb-8">
          <div className="flex justify-between text-xs text-gray-400 font-body mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round((step / 3) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / 3) * 100}%`,
                backgroundColor: 'var(--brand-purple)',
              }}
            />
          </div>
        </div>

        <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-8">
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-[#1a1a2e] mb-1">
                  Let's get to know you 👋
                </h2>
                <p className="text-gray-400 text-sm font-body">
                  Tell us a bit so we can build your perfect plan.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="70"
                    value={form.currentWeight}
                    onChange={(e) => update('currentWeight', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="65"
                    value={form.targetWeight}
                    onChange={(e) => update('targetWeight', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.name}
                className="w-full py-3 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: 'var(--brand-purple)' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Goal & Level ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-[#1a1a2e] mb-1">
                  What's your primary goal? 🎯
                </h2>
                <p className="text-gray-400 text-sm font-body">Pick one to focus on.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => update('primaryGoal', g.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      form.primaryGoal === g.id
                        ? 'border-[#7C5CFC] bg-purple-50'
                        : 'border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span className="font-semibold text-sm text-[#1a1a2e]">{g.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Fitness Level</p>
                <div className="grid grid-cols-3 gap-3">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => update('fitnessLevel', l.id)}
                      className={`px-3 py-3 rounded-xl border-2 text-center transition-all ${
                        form.fitnessLevel === l.id
                          ? 'border-[#7C5CFC] bg-purple-50'
                          : 'border-gray-100 hover:border-purple-200'
                      }`}
                    >
                      <p className="font-semibold text-xs text-[#1a1a2e]">{l.label}</p>
                      <p className="text-xs text-gray-400">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-full font-semibold text-sm border-2 border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.primaryGoal || !form.fitnessLevel}
                  className="flex-1 py-3 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--brand-purple)' }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule & Submit ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-[#1a1a2e] mb-1">
                  Final details 📅
                </h2>
                <p className="text-gray-400 text-sm font-body">
                  We'll build your weekly plan around this.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Workout days per week
                </p>
                <div className="flex gap-3">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => update('weeklyWorkoutDays', d)}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                        form.weeklyWorkoutDays === d
                          ? 'border-[#7C5CFC] bg-purple-50 text-[#7C5CFC]'
                          : 'border-gray-100 text-gray-500 hover:border-purple-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Injuries / Limitations (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. bad knee, lower back pain"
                  value={form.injuries}
                  onChange={(e) => update('injuries', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-full font-semibold text-sm border-2 border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--brand-purple)' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Building Plan…
                    </>
                  ) : (
                    '🚀 Generate My Plan'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
