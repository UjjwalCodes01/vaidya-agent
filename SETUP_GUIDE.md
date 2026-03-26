# Vaidya-Agent Complete Setup Guide

## 🎯 Goal
Connect your Vaidya-Agent to Google Cloud Platform and get the full system running for your hackathon demo.

---

## ✅ Prerequisites Checklist

Before you start, ensure you have:
- [ ] Google Cloud Platform account
- [ ] Node.js 24+ and npm 11+ installed
- [ ] Git (for version control)
- [ ] A code editor (VS Code recommended)
- [ ] Access to ABDM Sandbox (if integrating real ABDM)

---

## 📋 STEP 1: Install Dependencies (5 minutes)

```bash
cd c:\Users\acer\Desktop\vaidya-agent\client
npm install
```

**Expected Output:**
```
added 565 packages in 45s
```

**Verify Installation:**
```bash
npm list | grep -E "(vertexai|firestore|speech|dotenv)"
```

---

## 🔐 STEP 2: Set Up Google Cloud Platform (30 minutes)

### 2.1 Create GCP Project

1. Go to https://console.cloud.google.com/
2. Click **Select a project** → **NEW PROJECT**
3. **Project name**: `vaidya-agent-hackathon` (or your choice)
4. **Project ID**: Auto-generated (note this down!)
5. Click **CREATE**

### 2.2 Enable Required APIs

Run these commands in **Google Cloud Shell** or use the Console UI:

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable aiplatform.googleapis.com        # Vertex AI
gcloud services enable firestore.googleapis.com         # Firestore
gcloud services enable speech.googleapis.com            # Speech-to-Text
gcloud services enable texttospeech.googleapis.com      # Text-to-Speech
gcloud services enable places-backend.googleapis.com    # Google Maps Places
gcloud services enable directions-backend.googleapis.com # Google Maps Directions
```

**Verification:**
```bash
gcloud services list --enabled | grep -E "(aiplatform|firestore|speech)"
```

### 2.3 Create Firestore Database

1. Go to https://console.cloud.google.com/firestore
2. Click **CREATE DATABASE**
3. Select **Native mode**
4. Choose region: `us-central1` (or `asia-south1` for India)
5. Click **CREATE DATABASE**

### 2.4 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create vaidya-agent \
  --display-name="Vaidya Agent Service Account" \
  --description="Service account for Vaidya-Agent application"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtranslate.user"

# Download service account key
gcloud iam service-accounts keys create service-account.json \
  --iam-account=vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Encode to Base64 (Windows PowerShell)
# Copy the output - you'll need this!
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))

# OR in Git Bash/WSL:
cat service-account.json | base64 -w 0
```

**⚠️ SECURITY:** Delete `service-account.json` after encoding!

### 2.5 Get Google Maps API Key

1. Go to https://console.cloud.google.com/google/maps-apis
2. Click **Credentials** → **+ CREATE CREDENTIALS** → **API key**
3. **Restrict key** (recommended):
   - Application restrictions: **HTTP referrers**
   - Add `localhost:3000/*` and your Vercel domain
   - API restrictions: Enable **Places API** and **Directions API**
4. Copy the API key

---

## 🔧 STEP 3: Configure Environment Variables (15 minutes)

### 3.1 Create `.env.local`

```bash
cd c:\Users\acer\Desktop\vaidya-agent\client
cp .env.example .env.local
```

### 3.2 Fill in Required Variables

Open `.env.local` in your editor and update:

```bash
# ==========================================
# CRITICAL - REQUIRED FOR BASIC FUNCTIONALITY
# ==========================================

# Your GCP Project ID (from Step 2.1)
GCP_PROJECT_ID=vaidya-agent-hackathon

# GCP Region (use us-central1 or asia-south1 for India)
GCP_REGION=us-central1

# Base64-encoded service account key (from Step 2.4)
GCP_SERVICE_ACCOUNT_KEY_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsC...

# Google Maps API Key (from Step 2.5)
GOOGLE_MAPS_API_KEY=AIzaSyB...

# Vertex AI Model (use latest Gemini)
VERTEX_AI_MODEL=gemini-2.0-flash-exp

# ==========================================
# AUTHENTICATION (Hackathon Mode)
# ==========================================

# Enable demo auth for hackathon (accepts any userId)
DEMO_AUTH_ENABLED=true

# JWT Secret (generate with: openssl rand -base64 32)
# Or use this temporary one for hackathon:
JWT_SECRET=hackathon-temp-secret-change-in-production

# ==========================================
# ABDM INTEGRATION (OPTIONAL - Use Mock Mode for Hackathon)
# ==========================================

# Use mock responses for hackathon reliability
MOCK_ABDM_RESPONSES=true
MOCK_UHI_RESPONSES=true

# If you have ABDM Sandbox credentials, add them here:
# ABDM_BASE_URL=https://dev.abdm.gov.in
# ABDM_CLIENT_ID=your-client-id
# ABDM_CLIENT_SECRET=your-client-secret

# ==========================================
# OPTIONAL ENHANCEMENTS
# ==========================================

# RAG Admin Key (for seeding clinical guidelines)
RAG_ADMIN_KEY=hackathon-admin-key

# Redis for distributed rate limiting (optional)
# REDIS_URL=rediss://default:password@your-upstash-url:6379

# Default language
DEFAULT_SPEECH_LANGUAGE=hi-IN

# Node environment
NODE_ENV=development

# Enable debugging
DEBUG=false
```

### 3.3 Validate Configuration

```bash
npm run validate:env
```

**Expected Output:**
```
✅ Environment validation passed
✅ GCP service account validated: vaidya-agent@your-project.iam.gserviceaccount.com
```

---

## 🧪 STEP 4: Test GCP Connectivity (10 minutes)

### 4.1 Run Verification Script

```bash
npm run verify:gcp
```

**Expected Output:**
```
🔧 Verifying Vaidya-Agent GCP Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ Environment Check
   GCP_PROJECT_ID: vaidya-agent-hackathon
   GCP_REGION: us-central1
   Service Account Email: vaidya-agent@...

✅ Firestore Connection
   Created test session: session_test_1234567890
   Successfully read session
   Successfully deleted session

✅ Vertex AI Initialization
   Model: gemini-2.0-flash-exp

✅ Gemini API Test
   Response received: "Hello! How can I help..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed! Vaidya-Agent is ready.
```

### 4.2 Seed Clinical Guidelines

```bash
curl -X POST http://localhost:3000/api/rag/seed \
  -H "x-admin-key: hackathon-admin-key"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Database seeded successfully",
    "seeded": 12,
    "stats": {
      "total": 12,
      "byCategory": {
        "infectious": 8,
        "emergency": 2,
        "chronic": 2
      }
    }
  }
}
```

---

## 🚀 STEP 5: Start Development Server (5 minutes)

```bash
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000

 ✓ Starting...
 ✓ Ready in 3.2s
```

### 5.1 Test Core Endpoints

Open your browser or use curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "firestore": true,
      "vertexAI": true,
      "environment": true
    }
  }
}

# Create a session
curl -X POST http://localhost:3000/api/agent/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'

# Test triage
curl -X POST http://localhost:3000/api/agent/triage \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "I have fever and headache for 3 days"
  }'
```

---

## 🎨 STEP 6: Build Remaining Frontend Pages (4-6 hours)

### Current Status:
- ✅ Home page (`/`) - DONE
- ✅ Triage page (`/triage`) - DONE
- 🚧 Records page (`/records`) - Template ready
- 🚧 Care Finder page (`/care-finder`) - Template ready
- 🚧 Health Guides page (`/guides`) - Template ready
- 🚧 Profile page (`/profile`) - Template ready

### Quick Build Guide:

All templates are in `UI_IMPLEMENTATION_GUIDE.md`. Example:

```bash
# Create Records page
touch app/records/page.tsx

# Copy template from UI_IMPLEMENTATION_GUIDE.md
# Test: http://localhost:3000/records

# Repeat for other pages
```

---

## 🔌 STEP 7: Connect Frontend to Backend APIs (2-3 hours)

### 7.1 Update Triage Page

Edit `app/triage/page.tsx` and connect to the real API:

```typescript
const handleVoiceTriage = async (audioBlob: Blob) => {
  // Convert blob to base64
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    const base64Audio = reader.result?.toString().split(',')[1];

    const response = await fetch('/api/voice/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: base64Audio,
        languageCode: 'hi-IN',
        respondWithAudio: true
      })
    });

    const data = await response.json();

    if (data.success) {
      setTriageResult(data.data.triage);
      setGuidelines(data.data.guidelines);

      // Play response audio
      if (data.data.response.audio) {
        const audio = new Audio(
          `data:audio/mp3;base64,${data.data.response.audio.audioContent}`
        );
        audio.play();
      }
    }
  };
};
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'dotenv/config'"

**Solution:**
```bash
npm install dotenv
```

### Issue: "tsc is not recognized"

**Solution:**
```bash
npm install -D typescript
```

### Issue: "GCP_SERVICE_ACCOUNT_KEY_BASE64 is required"

**Solution:**
1. Check `.env.local` exists in `client/` directory
2. Verify the base64 string has no line breaks
3. Run `npm run validate:env` to see exact error

### Issue: "Vertex AI authentication failed"

**Solution:**
1. Verify service account has `roles/aiplatform.user` role
2. Check the JSON is valid: `echo $GCP_SERVICE_ACCOUNT_KEY_BASE64 | base64 -d | jq`
3. Ensure Vertex AI API is enabled in GCP Console

### Issue: "Firestore permission denied"

**Solution:**
```bash
# Grant Firestore permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

---

## ✅ Final Verification Checklist

Before your hackathon demo:

- [ ] `npm run verify:gcp` passes
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run dev` starts successfully
- [ ] `http://localhost:3000/api/health` returns "healthy"
- [ ] `http://localhost:3000` loads the home page
- [ ] `http://localhost:3000/triage` shows the triage page
- [ ] Voice recording works (browser mic permission granted)
- [ ] Triage API returns results
- [ ] Clinical guidelines are seeded
- [ ] All 6 pages are accessible

---

## 📊 Estimated Time Breakdown

| Task | Time | Priority |
|------|------|----------|
| Install dependencies | 5 min | 🔴 Critical |
| GCP project setup | 30 min | 🔴 Critical |
| Configure .env.local | 15 min | 🔴 Critical |
| Test connectivity | 10 min | 🔴 Critical |
| Seed guidelines | 5 min | 🟡 Important |
| Build 4 remaining pages | 4-6 hours | 🟢 Nice to have |
| Connect frontend APIs | 2-3 hours | 🟡 Important |
| **TOTAL** | **7-10 hours** | |

---

## 🎯 Minimum Viable Demo (2 hours)

If time is limited, focus on:

1. ✅ GCP setup (1 hour)
2. ✅ Verify connectivity (15 min)
3. ✅ Connect triage page to API (45 min)
4. ✅ Test voice-to-voice flow

**Result:** Working voice triage demo with real AI responses!

---

## 🚀 Full Demo (10 hours)

For complete hackathon showcase:

1. ✅ All above steps
2. ✅ Build all 6 pages
3. ✅ ABDM mock integration demo
4. ✅ Google Maps PHC finder
5. ✅ Complete user journey

**Result:** Full production-ready healthcare assistant!

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify all environment variables are set
3. Run `npm run validate:env` for diagnostics
4. Check GCP Console for enabled APIs
5. Review Firestore security rules

---

**Status:** Ready to connect! 🚀
**Estimated Setup Time:** 1-2 hours for basic connectivity
**Estimated Full Build Time:** 7-10 hours for complete demo

Good luck with your hackathon! 🏥💙
