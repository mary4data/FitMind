const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ── Goals / Plan ──────────────────────────────────────────────────────────────

export interface GoalPayload {
  name: string;
  primaryGoal: string;
  fitnessLevel: string;
  weeklyWorkoutDays: number;
  currentWeight?: number;
  targetWeight?: number;
  injuries?: string[];
  userId?: string;
}

export const api = {
  goals: {
    create: (payload: GoalPayload) =>
      request('/api/goals', { method: 'POST', body: JSON.stringify(payload) }),
    get: (userId: string) =>
      request(`/api/goals/${userId}`),
  },

  coaching: {
    startSession: (userId: string, exercise: string) =>
      request<{ sessionId: string }>('/api/coaching/session', {
        method: 'POST',
        body: JSON.stringify({ userId, exercise }),
      }),
    sendFrame: (payload: {
      sessionId: string;
      frameBase64: string;
      exercise: string;
      repCount: number;
      setNumber: number;
      targetReps: number;
    }) => request('/api/coaching/frame', { method: 'POST', body: JSON.stringify(payload) }),
    sendVoice: (sessionId: string, audioBase64: string, exercise: string) =>
      request('/api/coaching/voice', {
        method: 'POST',
        body: JSON.stringify({ sessionId, audioBase64, exercise }),
      }),
  },

  sessions: {
    end: (sessionId: string, durationSeconds: number, formAccuracy: number) =>
      request(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify({ durationSeconds, formAccuracy }),
      }),
    get: (sessionId: string) => request(`/api/sessions/${sessionId}`),
    getUserSessions: (userId: string) => request(`/api/sessions/user/${userId}`),
  },

  upload: {
    sessionVideo: async (sessionId: string, blob: Blob): Promise<{ videoUrl: string }> => {
      const form = new FormData();
      form.append('video', blob, 'recording.webm');
      form.append('sessionId', sessionId);
      const res = await fetch(`${BASE}/api/upload/session-video`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
  },
};
