# FitMind — AI Fitness Coach That Sees & Hears You

> Real-time posture correction, voice-guided workouts, and personalized plans — all from your browser.
> Powered by **Gemini 2.5 Flash** + **Google Cloud**.

---

## Project Structure

```
FitMind/
├── frontend/                   # Next.js 15 + React 19 + Tailwind
│   ├── app/
│   │   ├── page.tsx            # Landing page (hero + features)
│   │   ├── goals/page.tsx      # 3-step goal input wizard
│   │   ├── coaching/page.tsx   # Live coaching interface (webcam + voice)
│   │   └── summary/page.tsx    # Post-session analysis + highlights
│   ├── components/
│   │   └── Navbar.tsx
│   └── lib/api.ts              # Type-safe API client
│
├── backend/                    # Node.js + Express + TypeScript
│   └── src/
│       ├── agents/
│       │   ├── goalPlanAgent.ts      # Gemini plan generation
│       │   ├── liveCoachingAgent.ts  # Real-time vision coaching
│       │   └── feedbackAgent.ts      # Post-session analysis
│       ├── services/
│       │   ├── gemini.ts             # Gemini 2.5 Flash API
│       │   ├── firestore.ts          # Firestore DB operations
│       │   ├── storage.ts            # GCS video uploads
│       │   ├── textToSpeech.ts       # Google TTS
│       │   └── speechToText.ts       # Google STT
│       ├── prompts/                  # Prompt templates
│       └── routes/                   # Express endpoints
│
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

- Node.js 20+
- Google Cloud project with these APIs enabled:
  - Gemini API (Google AI Studio or Vertex AI)
  - Firestore
  - Cloud Storage
  - Cloud Text-to-Speech
  - Cloud Speech-to-Text
  - Cloud Run (for deployment)
- A service account JSON key with the above permissions

---

## Local Setup

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd FitMind

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — add GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT, etc.

# Frontend
cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Run locally (two terminals)

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:8080

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

---

## API Reference

### Goals & Plan

```bash
# Generate a personalized fitness plan
POST /api/goals
{
  "name": "Alex",
  "primaryGoal": "weight_loss",
  "fitnessLevel": "intermediate",
  "weeklyWorkoutDays": 4,
  "currentWeight": 80,
  "targetWeight": 72
}
# → { userId, plan: { weeklySchedule, nutritionGuidelines }, motivationalMessage }

# Get user profile
GET /api/goals/:userId
```

### Live Coaching

```bash
# Start a session
POST /api/coaching/session
{ "userId": "...", "exercise": "Squat" }
# → { sessionId }

# Analyze a video frame
POST /api/coaching/frame
{
  "sessionId": "...",
  "frameBase64": "data:image/jpeg;base64,...",
  "exercise": "Squat",
  "repCount": 5,
  "setNumber": 2,
  "targetReps": 12
}
# → { text, audioBase64, formScore, repDetected }

# Streaming coaching (SSE)
POST /api/coaching/frame/stream   # → text/event-stream

# Voice command
POST /api/coaching/voice
{ "sessionId": "...", "audioBase64": "...", "exercise": "Squat" }
# → { transcript, text, audioBase64 }
```

### Sessions

```bash
# End session + AI summary
POST /api/sessions/:sessionId/end
{ "durationSeconds": 1934, "formAccuracy": 87 }
# → { sessionId, summary: { overallScore, coachQuote, estimatedCalories, ... } }

# Session history
GET /api/sessions/user/:userId
```

---

## Google Cloud Deployment

### Build and push Docker images

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# Backend
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fitmind-backend .

# Frontend
cd ../frontend
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/fitmind-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://fitmind-backend-<hash>-uc.a.run.app .
```

### Deploy to Cloud Run

```bash
# Backend
gcloud run deploy fitmind-backend \
  --image gcr.io/$PROJECT_ID/fitmind-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GCS_BUCKET=fitmind-sessions

# Frontend (after getting the backend URL above)
gcloud run deploy fitmind-frontend \
  --image gcr.io/$PROJECT_ID/fitmind-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://fitmind-backend-<hash>-uc.a.run.app
```

### Firestore setup

```bash
gcloud firestore databases create --region=$REGION
```

### GCS bucket

```bash
gsutil mb -l $REGION gs://fitmind-sessions
gsutil iam ch allUsers:objectViewer gs://fitmind-sessions  # public read for demo
```

---

## Hackathon Demo Steps

1. **Open** `http://localhost:3000` — Land on the warm hero page
2. **Click** "Get Started" → fill out the 3-step goal wizard (name, goal, schedule)
3. **Watch** Gemini 2.5 Flash generate a personalized weekly plan + nutrition guide in ~3s
4. **Click** "Start Session" on the coaching page → webcam activates
5. **Perform** any exercise (squat, push-up, plank) — AI analyzes your form every 4s
6. **Speak** "Am I keeping good form?" → voice coaching response plays back
7. **Click** "End Session" → redirected to the summary page
8. **See** your score, calories, streak, highlights, and AI coach quote

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 3 |
| Backend | Node.js 20, Express 4, TypeScript |
| AI / LLM | Gemini 2.5 Flash (`gemini-2.5-flash-preview-04-17`) |
| Vision | Gemini multimodal (inline base64 frames) |
| Voice In | Google Cloud Speech-to-Text |
| Voice Out | Google Cloud Text-to-Speech (Neural2) |
| Database | Google Cloud Firestore |
| Storage | Google Cloud Storage |
| Deploy | Google Cloud Run |

---

## License

MIT — Built for [Google Cloud Hackathon 2026]
