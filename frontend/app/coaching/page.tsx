'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

interface CoachMessage {
  text: string;
  timestamp: number;
  type: 'coach' | 'user';
}

const EXERCISES = ['Squat', 'Push-Up', 'Plank', 'Lunge', 'Deadlift', 'Burpee'];

export default function CoachingPage() {
  const router = useRouter();
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
    if (!sessionId || !isActive) return;
    const frameBase64 = captureFrame();
    if (!frameBase64) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
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

      // Play audio response
      if (data.audioBase64 && !isMuted) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audio.play().catch(() => {});
      }
    } catch {
      // Silently skip on frame errors
    }
  }, [sessionId, isActive, currentExercise, repCount, setNumber, isMuted]);

  // Start session
  async function startSession() {
    if (isStartingRef.current || isActive) return; // prevent double-clicks
    isStartingRef.current = true;

    const userStr = sessionStorage.getItem('fitmind_user');
    const userId = userStr ? JSON.parse(userStr).userId : 'demo-user';

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exercise: currentExercise }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch {
      setSessionId('demo-session-' + Date.now());
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

    intervalRef.current = setInterval(sendFrame, 4000);
  }

  // Stop session
  async function stopSession() {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop media
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // End session via API
    if (sessionId && !sessionId.startsWith('demo')) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            durationSeconds: elapsed,
            formAccuracy: formScore || 75,
          }),
        });
      } catch {
        // Proceed to summary even if API fails
      }
    }

    // Store session data for summary page
    sessionStorage.setItem(
      'fitmind_session',
      JSON.stringify({ sessionId, elapsed, calories, formScore, highlights: messages })
    );
    router.push('/summary');
  }

  // Voice input
  async function startVoiceInput() {
    if (!sessionId) return;
    setIsListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaching/voice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, audioBase64: base64, exercise: currentExercise }),
            });
            const data = await res.json();
            if (data.text) {
              setMessages((prev) => [
                { text: `You: ${data.transcript}`, timestamp: Date.now(), type: 'user' },
                { text: data.text, timestamp: Date.now(), type: 'coach' },
                ...prev.slice(0, 8),
              ]);
              if (data.audioBase64 && !isMuted) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
                audio.play().catch(() => {});
              }
            }
          } catch { /* ignore */ }
        };
        reader.readAsDataURL(blob);
        setIsListening(false);
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 4000); // 4-second voice clip
    } catch {
      setIsListening(false);
    }
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

        <div className="grid lg:grid-cols-3 gap-6">
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
                  <button
                    onClick={startVoiceInput}
                    disabled={isListening}
                    className={`px-6 py-3 rounded-full font-semibold text-sm border-2 transition ${
                      isListening
                        ? 'border-rose-400 text-rose-500 bg-rose-50 animate-pulse'
                        : 'border-[#7C5CFC] text-[#7C5CFC] hover:bg-purple-50'
                    }`}
                  >
                    {isListening ? '🎙 Listening…' : '🎙 Talk to Coach'}
                  </button>
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
                Coach Feedback
              </h3>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🤖</p>
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
        </div>
      </div>
    </div>
  );
}
