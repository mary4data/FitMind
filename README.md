# FitMind — AI Fitness Coach That Sees & Hears You

> Real-time posture correction, voice-guided workouts, and personalized plans — powered by **Gemini 2.5 Flash** + **Firebase** + **Google Cloud Run**.

---

## Project Structure

```
FitMind/
├── frontend/                   # Next.js 15 + React 19 + Tailwind + Firebase client SDK
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── goals/page.tsx      # 3-step goal wizard → Gemini plan
│   │   ├── coaching/page.tsx   # Live coaching (webcam + voice)
│   │   └── summary/page.tsx    # Post-session analysis
│   ├── components/Navbar.tsx
│   └── lib/
│       ├── api.ts              # Express backend client
│       └── firebase.ts         # Firebase client SDK init
│
├── backend/                    # Node.js + Express + TypeScript + Firebase Admin SDK
│   └── src/
│       ├── agents/             # goalPlanAgent · liveCoachingAgent · feedbackAgent
│       ├── services/           # gemini · firestore · storage · tts · stt
│       ├── prompts/            # Gemini prompt templates
│       └── routes/             # goals · coaching · sessions · upload
│
├── firebase.json               # Firebase Hosting + Firestore + Storage config
├── .firebaserc                 # Project alias
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Compound indexes (userId + startedAt)
└── storage.rules               # Cloud Storage security rules
```

---

## Prerequisites — install these CLIs once

```bash
# 1. Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init

# 2. Firebase CLI
npm install -g firebase-tools
firebase login

# 3. Node.js 20+  (use nvm if needed)
nvm install 20 && nvm use 20
```

---

## One-time Google Cloud & Firebase setup

```bash
export PROJECT_ID=your-firebase-project-id
export REGION=us-central1

# Set active project for both CLIs
gcloud config set project $PROJECT_ID
firebase use $PROJECT_ID          # also updates .firebaserc

# Enable required GCP APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  texttospeech.googleapis.com \
  speech.googleapis.com \
  aiplatform.googleapis.com

# Create Firestore database (native mode)
gcloud firestore databases create --location=$REGION

# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Create a service account for local dev (Cloud Run uses its own SA automatically)
gcloud iam service-accounts create fitmind-dev \
  --display-name "FitMind local dev"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:fitmind-dev@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/owner"     # narrow this down before production

gcloud iam service-accounts keys create backend/service-account.json \
  --iam-account=fitmind-dev@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Local development

### 1. Configure environment files

```bash
# Root / backend
cp .env.example backend/.env
# Fill in: GOOGLE_CLOUD_PROJECT, GEMINI_API_KEY, GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS

# Frontend
cp .env.example frontend/.env.local
# Fill in all NEXT_PUBLIC_FIREBASE_* values
# (Firebase Console → Project Settings → Your apps → Web app → Config)
```

### 2. Install dependencies

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### 3a. Run with Firebase Emulators (fully offline, recommended)

```bash
# Terminal 1 — Firestore + Storage emulators
firebase emulators:start --only firestore,storage

# Terminal 2 — Backend (points to emulators via env vars)
cd backend
FIRESTORE_EMULATOR_HOST=localhost:8081 \
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199 \
npm run dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open `http://localhost:4000` for the **Firebase Emulator UI**.

### 3b. Run against live Firebase (requires service account)

```bash
# Terminal 1 — Backend
cd backend && npm run dev     # reads backend/.env

# Terminal 2 — Frontend
cd frontend && npm run dev    # reads frontend/.env.local
```

---

## Deploy to Google Cloud

### Backend → Cloud Run

```bash
cd backend

# Build & push via Cloud Build (no local Docker needed)
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/fitmind-backend \
  --project $PROJECT_ID

# Deploy to Cloud Run
gcloud run deploy fitmind-backend \
  --image gcr.io/$PROJECT_ID/fitmind-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars \
    GOOGLE_CLOUD_PROJECT=$PROJECT_ID,\
    GEMINI_API_KEY=your-gemini-api-key,\
    GCS_BUCKET=$PROJECT_ID.appspot.com,\
    FRONTEND_URL=https://your-project.web.app \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi

# Grab the backend URL
BACKEND_URL=$(gcloud run services describe fitmind-backend \
  --platform managed --region $REGION \
  --format 'value(status.url)')
echo "Backend: $BACKEND_URL"
```

> Cloud Run's service account automatically has `roles/datastore.user` and `roles/storage.objectAdmin` — **no key file needed in production**.

### Frontend → Firebase Hosting (backed by Cloud Run)

```bash
cd frontend

# Build Next.js with the live backend URL
NEXT_PUBLIC_API_URL=$BACKEND_URL \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID \
npm run build

# Build & push frontend container
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/fitmind-frontend \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  --project $PROJECT_ID

gcloud run deploy fitmind-frontend \
  --image gcr.io/$PROJECT_ID/fitmind-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

# Point Firebase Hosting at the frontend Cloud Run service
firebase deploy --only hosting
```

Your app is now live at `https://$PROJECT_ID.web.app`.

---

## Deploy Firestore rules & indexes (any time you change them)

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

---

## Key API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/goals` | Create user + generate Gemini fitness plan |
| GET | `/api/goals/:userId` | Fetch user profile + plan |
| POST | `/api/coaching/session` | Start a coaching session |
| POST | `/api/coaching/frame` | Analyze webcam frame (vision + TTS) |
| POST | `/api/coaching/frame/stream` | SSE streaming coaching response |
| POST | `/api/coaching/voice` | STT → Gemini → TTS voice loop |
| POST | `/api/sessions/:id/end` | End session + AI summary |
| GET | `/api/sessions/user/:userId` | Session history + streak |
| POST | `/api/upload/session-video` | Upload recording to Cloud Storage |

---

## Hackathon Demo Steps

1. Open `https://your-project.web.app`
2. Click **Get Started** → fill the 3-step goal wizard
3. Gemini 2.5 Flash generates a personalized plan in ~3 s
4. Click **Start Session** — webcam activates, AI analyzes form every 4 s
5. Perform squats/push-ups — hear live voice coaching via TTS
6. Say "Am I doing this right?" — voice is transcribed and answered
7. Click **End Session** → Summary page shows stats, streak, highlights, AI quote

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Firebase JS SDK v10 |
| Backend | Node.js 20, Express 4, TypeScript, Firebase Admin SDK v12 |
| AI / LLM | Gemini 2.5 Flash (`gemini-2.5-flash-preview-04-17`) |
| Vision | Gemini multimodal (inline JPEG frames) |
| Voice In | Google Cloud Speech-to-Text |
| Voice Out | Google Cloud Text-to-Speech Neural2 |
| Database | Firebase Firestore (native mode) |
| Storage | Firebase / Cloud Storage |
| Deploy | Google Cloud Run + Firebase Hosting |
| CI/CD | Google Cloud Build |
