'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../components/AuthProvider';

interface CoachMessage {
  text: string;
  timestamp: number;
  type: 'coach' | 'user';
}

const EXERCISES = ['Squat', 'Push-Up', 'Plank', 'Lunge', 'Deadlift', 'Burpee'];

interface WorkoutDay { day: string; focus: string; duration: number; exercises: { name: string; sets: number; reps: string }[] }
interface FitnessPlan { weeklySchedule: WorkoutDay[]; nutritionGuidelines: { meals: string[]; dailyCalories: number } }

export default function CoachingPage() {
  const router = useRouter();
  const { user, loading: authLoading, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Load plan from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('fitmind_plan');
    if (raw) { try { setPlan(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [currentExercise, setCurrentExercise] = useState('Squat');
  const [repCount, setRepCount] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [calories, setCalories] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const isCoachSpeakingRef = useRef(false);
  const [coachGender, setCoachGender] = useState<'female' | 'male'>('female');
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(true);
  const startTimeRef = useRef<number>(0);

  // Format elapsed time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Start webcam
  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'user' },
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }

  // Capture a JPEG frame from video
  function captureFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // Send frame to backend for coaching analysis
  const sendFrame = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || !isActiveRef.current || isCoachSpeakingRef.current) return;
    const frameBase64 = captureFrame();
    if (!frameBase64) return;

    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: sid,
          frameBase64,
          exercise: currentExercise,
          repCount,
          setNumber,
          targetReps: 12,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setMessages((prev) => [
        { text: data.text, timestamp: Date.now(), type: 'coach' },
        ...prev.slice(0, 9),
      ]);
      if (data.formScore) setFormScore(data.formScore);
      if (data.repDetected) setRepCount((r) => r + 1);

      // Play audio response — block next frame while speaking
      if (data.audioBase64 && !isMuted) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        isCoachSpeakingRef.current = true;
        audio.onended = () => { isCoachSpeakingRef.current = false; };
        audio.onerror = () => { isCoachSpeakingRef.current = false; };
        audio.play().catch(() => { isCoachSpeakingRef.current = false; });
      }
    } catch {
      // Silently skip on frame errors
    }
  }, [currentExercise, repCount, setNumber]);

  // Start session
  async function startSession() {
    if (isStartingRef.current || isActive) return; // prevent double-clicks
    isStartingRef.current = true;

    let newSessionId = '';
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise: currentExercise }),
      });
      if (!res.ok) throw new Error(`Session API returned ${res.status}`);
      const data = await res.json();
      newSessionId = data.sessionId;
      setSessionId(newSessionId);
    } catch {
      newSessionId = 'demo-session-' + Date.now();
      setSessionId(newSessionId);
    }

    await startCamera();
    setIsActive(true);
    startTimeRef.current = Date.now();
    isStartingRef.current = false;

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const newElapsed = prev + 1;
        setCalories(Math.floor(newElapsed * 0.25));
        return newElapsed;
      });
    }, 1000);

    intervalRef.current = setInterval(sendFrame, 10000);
    startContinuousListening(newSessionId, currentExercise, coachGender);
  }

  // Stop session
  async function stopSession() {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopContinuousListening();

    // Stop media
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // End session via API — capture real AI summary
    let aiSummary = null;
    const endSessionId = sessionIdRef.current;
    if (endSessionId && !endSessionId.startsWith('demo')) {
      try {
        const endToken = await getTokenRef.current();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${endSessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${endToken}` },
          body: JSON.stringify({
            durationSeconds: elapsed,
            formAccuracy: formScore || 75,
          }),
        });
        const data = await res.json();
        if (res.ok && data.summary) aiSummary = data.summary;
      } catch {
        // Proceed to summary even if API fails
      }
    }

    // Store all real session data for summary page
    sessionStorage.setItem('fitmind_session', JSON.stringify({
      sessionId,
      summary: aiSummary,
      startedAt: startTimeRef.current,
      durationSeconds: elapsed,
      calories,
      formAccuracy: formScore || 75,
      messages,
      coachGender,
    }));
    router.push('/summary');
  }

  // Keep refs in sync with state so callbacks always see latest values
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Send transcript to coach
  async function sendTranscript(transcript: string, sid: string, exercise: string, gender: 'female' | 'male') {
    if (!transcript.trim()) return;
    try {
      const voiceToken = await getTokenRef.current();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voiceToken}` },
        body: JSON.stringify({ sessionId: sid, transcript, exercise, coachGender: gender }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages((prev) => [
          { text: `You: ${transcript}`, timestamp: Date.now(), type: 'user' },
          { text: data.text, timestamp: Date.now(), type: 'coach' },
          ...prev.slice(0, 8),
        ]);
        if (data.audioBase64 && !isMutedRef.current) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          // Pause recognition while coach speaks, resume after
          recognitionRef.current?.stop();
          audio.onended = () => { if (isActiveRef.current) recognitionRef.current?.start(); };
          audio.play().catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }

  // Continuous hands-free listening via Web Speech API
  function startContinuousListening(sid: string, exercise: string, gender: 'female' | 'male') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return; // not supported in this browser
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = last[0].transcript.trim();
      if (transcript) sendTranscript(transcript, sid, exercise, gender);
    };

    recognition.onend = () => {
      if (isActiveRef.current) { try { recognition.start(); } catch { /* already started */ } }
      else setIsListening(false);
    };

    recognition.onerror = () => { /* ignore abort errors */ };

    try { recognition.start(); } catch { return; }
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  function stopContinuousListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formColor =
    formScore >= 85 ? '#22c55e' : formScore >= 65 ? '#f59e0b' : formScore > 0 ? '#ef4444' : '#9ca3af';

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9f6 50%, #fce7f3 100%)',
      }}
    >
      <Navbar />

      <div className="px-4 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1a1a2e]">
              Live Coaching Session
            </h1>
            <p className="text-sm text-gray-400 font-body">
              {isActive ? 'AI coach is watching your form in real-time' : 'Ready to start?'}
            </p>
          </div>
          {isActive && (
            <div className="flex items-center gap-2 bg-green-100 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-700">Live</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {/* ── Left: Plan Panel ─────────────────────────────── */}
          <div className={`flex-shrink-0 transition-all duration-300 ${planOpen ? 'w-72' : 'w-10'}`}>
            <div className="bg-white rounded-2xl shadow-sm h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                {planOpen && (
                  <span className="font-display font-bold text-sm text-[#1a1a2e]">Your Plan</span>
                )}
                <button
                  onClick={() => setPlanOpen((o) => !o)}
                  className="ml-auto text-gray-400 hover:text-[#7C5CFC] transition"
                >
                  {planOpen ? '‹' : '›'}
                </button>
              </div>

              {planOpen && (
                <div className="p-4 overflow-y-auto max-h-[calc(100vh-220px)] space-y-5">
                  {plan ? (
                    <>
                      {/* Workout */}
                      <div>
                        <p className="text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1"
                          style={{ color: 'var(--brand-purple)' }}>
                          <span>🏋</span> Workout
                        </p>
                        <div className="space-y-1.5">
                          {plan.weeklySchedule.map((d, i) => (
                            <div key={i}
                              className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-snug">
                              <span className="font-semibold text-[#1a1a2e]">{d.day}:</span>{' '}
                              {d.focus}
                              {d.duration ? <span className="text-gray-400"> · {d.duration}min</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nutrition */}
                      {plan.nutritionGuidelines?.meals?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1"
                            style={{ color: 'var(--brand-purple)' }}>
                            <span>🍽</span> Nutrition
                          </p>
                          <div className="space-y-1.5">
                            {plan.nutritionGuidelines.meals.map((m, i) => (
                              <div key={i}
                                className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                {m}
                              </div>
                            ))}
                          </div>
                          {plan.nutritionGuidelines.dailyCalories > 0 && (
                            <p className="text-xs text-gray-400 mt-2 px-1">
                              🔥 Target: {plan.nutritionGuidelines.dailyCalories} kcal/day
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-2xl mb-2">📋</p>
                      <p className="text-xs">Complete the goals form to see your personalised plan here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Center + Right ────────────────────────────────── */}
          <div className="flex-1 grid lg:grid-cols-3 gap-4">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-gray-900 rounded-3xl overflow-hidden aspect-video shadow-xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">🎥</div>
                    <p className="font-display font-bold text-xl mb-2">Camera Ready</p>
                    <p className="text-gray-300 text-sm">Click Start Session to begin</p>
                  </div>
                </div>
              )}

              {/* Overlay stats when active */}
              {isActive && (
                <>
                  <div className="absolute top-4 left-4 bg-black/50 rounded-xl px-3 py-2 text-white text-sm font-semibold backdrop-blur-sm">
                    🕐 {formatTime(elapsed)}
                  </div>
                  <div className="absolute top-4 right-4 bg-black/50 rounded-xl px-3 py-2 text-white text-sm font-semibold backdrop-blur-sm">
                    🔥 {calories} cal
                  </div>
                  {formScore > 0 && (
                    <div
                      className="absolute bottom-4 left-4 rounded-xl px-3 py-2 text-white text-sm font-semibold backdrop-blur-sm"
                      style={{ backgroundColor: formColor + '99' }}
                    >
                      Form: {formScore}%
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 bg-black/50 rounded-xl px-3 py-2 text-white text-sm font-semibold backdrop-blur-sm">
                    Set {setNumber} · Rep {repCount}
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              {!isActive ? (
                <button
                  onClick={startSession}
                  className="flex-1 py-3 rounded-full font-semibold text-white text-sm shadow-md hover:opacity-90 transition"
                  style={{ backgroundColor: 'var(--brand-purple)' }}
                >
                  🚀 Start Session
                </button>
              ) : (
                <>
                  <button
                    onClick={stopSession}
                    className="flex-1 py-3 rounded-full font-semibold text-white text-sm bg-red-500 hover:bg-red-600 transition"
                  >
                    ⏹ End Session
                  </button>
                  {isListening && (
                    <div className="px-4 py-3 rounded-full text-sm border-2 border-rose-300 text-rose-500 bg-rose-50 animate-pulse font-semibold">
                      🎙 Listening…
                    </div>
                  )}
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    className="px-4 py-3 rounded-full text-sm border-2 border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Choose Your Coach */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">Choose Your Coach</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Alex */}
                <button
                  onClick={() => setCoachGender('female')}
                  disabled={isActive}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all disabled:cursor-not-allowed ${
                    coachGender === 'female'
                      ? 'border-[#7C5CFC] bg-purple-50'
                      : 'border-gray-100 hover:border-purple-200 bg-white'
                  }`}
                >
                  <span className="text-3xl">🧑‍🦱🏋️</span>
                  <span className="font-display font-bold text-sm text-[#1a1a2e]">Alex</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">Warm &amp; Encouraging</span>
                  {coachGender === 'female' && (
                    <span className="text-[10px] font-semibold text-[#7C5CFC]">Selected ✓</span>
                  )}
                </button>
                {/* Max */}
                <button
                  onClick={() => setCoachGender('male')}
                  disabled={isActive}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all disabled:cursor-not-allowed ${
                    coachGender === 'male'
                      ? 'border-[#7C5CFC] bg-purple-50'
                      : 'border-gray-100 hover:border-purple-200 bg-white'
                  }`}
                >
                  <span className="text-3xl">🧑🏋️</span>
                  <span className="font-display font-bold text-sm text-[#1a1a2e]">Max</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">Powerful &amp; Direct</span>
                  {coachGender === 'male' && (
                    <span className="text-[10px] font-semibold text-[#7C5CFC]">Selected ✓</span>
                  )}
                </button>
              </div>
            </div>

            {/* Exercise Selector */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">Current Exercise</h3>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setCurrentExercise(ex)}
                    disabled={isActive}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
                      currentExercise === ex
                        ? 'bg-[#7C5CFC] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:cursor-not-allowed`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Set/Rep counter */}
            {isActive && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">Progress</h3>
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-3xl font-display font-bold text-[#7C5CFC]">{repCount}</p>
                    <p className="text-xs text-gray-400">Reps</p>
                  </div>
                  <div>
                    <p className="text-3xl font-display font-bold text-[#7C5CFC]">{setNumber}</p>
                    <p className="text-xs text-gray-400">Set</p>
                  </div>
                </div>
                {repCount >= 12 && (
                  <button
                    onClick={() => { setSetNumber((s) => s + 1); setRepCount(0); }}
                    className="w-full mt-3 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--brand-purple)' }}
                  >
                    Next Set →
                  </button>
                )}
              </div>
            )}

            {/* Coach Messages */}
            <div className="bg-white rounded-2xl shadow-sm p-5 flex-1">
              <h3 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">
                {coachGender === 'female' ? 'Alex' : 'Max'}&apos;s Feedback
              </h3>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">{coachGender === 'female' ? '🧑‍🦱' : '🧑'}</p>
                  <p className="text-xs">Start your session to get live coaching</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.type === 'coach'
                          ? 'bg-purple-50 text-[#1a1a2e]'
                          : 'bg-gray-100 text-gray-600 italic'
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>{/* end center+right grid */}
        </div>{/* end flex */}
      </div>
    </div>
  );
}
