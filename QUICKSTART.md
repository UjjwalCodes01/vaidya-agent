# 🚀 VAIDYA-AGENT QUICK START

**⏱️ Time to Working Demo: 2 hours**

---

## ✅ Pre-Flight Checklist

```bash
# 1. Install dependencies (5 min)
cd c:\Users\acer\Desktop\vaidya-agent\client
npm install

# 2. Verify installation
npm list dotenv  # Should show dotenv@17.3.1
```

---

## 🔐 GCP Setup (1 hour)

### Option A: Quick Setup (Recommended for Hackathon)

1. **Create GCP Project**
   - Go to https://console.cloud.google.com/
   - Click "NEW PROJECT" → Name: `vaidya-agent-demo`
   - Copy the **Project ID** (auto-generated)

2. **Enable APIs** (Click these links while logged in to GCP)
   - https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
   - https://console.cloud.google.com/apis/library/firestore.googleapis.com
   - https://console.cloud.google.com/apis/library/speech.googleapis.com
   - https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
   - https://console.cloud.google.com/apis/library/places-backend.googleapis.com

3. **Create Firestore Database**
   - https://console.cloud.google.com/firestore
   - Click "CREATE DATABASE"
   - Mode: **Native mode**
   - Region: **us-central1** (or asia-south1 for India)

4. **Create Service Account**
   ```bash
   # In Google Cloud Shell (click >_ icon in top-right)
   PROJECT_ID="YOUR_PROJECT_ID_HERE"

   # Create service account
   gcloud iam service-accounts create vaidya-agent \
     --project=$PROJECT_ID \
     --display-name="Vaidya Agent"

   # Grant roles
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:vaidya-agent@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:vaidya-agent@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/datastore.user"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:vaidya-agent@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountTokenCreator"

   # Download key
   gcloud iam service-accounts keys create ~/service-account.json \
     --iam-account=vaidya-agent@$PROJECT_ID.iam.gserviceaccount.com

   # Encode to Base64
   cat ~/service-account.json | base64 -w 0 > ~/service-account-base64.txt

   # Print the encoded key (COPY THIS!)
   cat ~/service-account-base64.txt
   ```

5. **Get Google Maps API Key**
   - https://console.cloud.google.com/google/maps-apis/credentials
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the key
   - (Optional) Click "RESTRICT KEY" → API restrictions → Select "Places API" and "Directions API"

---

## 🔧 Configure .env.local (15 min)

```bash
cd c:\Users\acer\Desktop\vaidya-agent\client

# Copy the template
cp .env.example .env.local

# Edit .env.local with your favorite editor
notepad .env.local  # or code .env.local
```

**Fill in these values:**

```bash
# ============= REQUIRED =============
GCP_PROJECT_ID=your-project-id-from-step-1
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT_KEY_BASE64=paste-from-step-4-here
GOOGLE_MAPS_API_KEY=paste-from-step-5-here

# ============= HACKATHON MODE =============
DEMO_AUTH_ENABLED=true
MOCK_ABDM_RESPONSES=true
MOCK_UHI_RESPONSES=true
JWT_SECRET=hackathon-temp-secret-2024
RAG_ADMIN_KEY=hackathon-admin-key

# ============= DEFAULT SETTINGS =============
VERTEX_AI_MODEL=gemini-2.0-flash-exp
DEFAULT_SPEECH_LANGUAGE=hi-IN
NODE_ENV=development
```

**💾 Save the file!**

---

## 🧪 Test Everything (10 min)

```bash
# 1. Validate environment
npm run validate:env
# ✅ Should show: "Environment validation passed"

# 2. Test GCP connectivity
npm run verify:gcp
# ✅ Should show: "All checks passed!"

# 3. Start dev server
npm run dev
# ✅ Should show: "Ready in X.Xs"

# 4. Test health endpoint (in new terminal)
curl http://localhost:3000/api/health
# ✅ Should return: {"success":true,"data":{"status":"healthy",...}}

# 5. Seed clinical guidelines
curl -X POST http://localhost:3000/api/rag/seed \
  -H "x-admin-key: hackathon-admin-key"
# ✅ Should return: {"success":true,"data":{"seeded":12,...}}
```

**🎉 If all 5 tests pass, you're READY!**

---

## 🎨 Connect Frontend to Backend (45 min)

### Update Triage Page for Real API Calls

Edit `app/triage/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { VoiceWaveform, StatusCard } from '@/components/shared';

export default function TriagePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartRecording = async () => {
    setIsRecording(true);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        // Convert to base64
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];

          // Call the API
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
            setTranscript(data.data.input.transcript);
            setAnalysis(data.data.triage);

            // Play response audio
            if (data.data.response?.audio?.audioContent) {
              const audio = new Audio(
                `data:audio/mp3;base64,${data.data.response.audio.audioContent}`
              );
              audio.play();
            }
          }

          setIsProcessing(false);
        };

        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();

      // Stop after 10 seconds (or add manual stop button)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);

    } catch (error) {
      console.error('Microphone access denied:', error);
      setIsRecording(false);
      alert('Please allow microphone access to use voice triage');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🩺 Voice Triage</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isRecording ? 'Listening to your symptoms...' :
             isProcessing ? 'AI analyzing your symptoms...' :
             'Tap the microphone to describe your symptoms'}
          </p>
        </div>

        {/* Voice Waveform */}
        {isRecording && (
          <div className="mb-8">
            <VoiceWaveform isActive={true} />
          </div>
        )}

        {/* Microphone Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleStartRecording}
            disabled={isRecording || isProcessing}
            className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse'
                : isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isProcessing ? '⏳' : '🎤'}
          </button>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">What you said:</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-lg">{transcript}</p>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {analysis && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">AI Analysis:</h2>

            <StatusCard
              icon="🩺"
              title="Severity"
              description={analysis.severity?.toUpperCase()}
              variant={
                analysis.severity === 'critical' ? 'error' :
                analysis.severity === 'high' ? 'warning' :
                analysis.severity === 'moderate' ? 'warning' : 'success'
              }
            />

            <StatusCard
              icon="🔍"
              title="Suspected Conditions"
              description={analysis.suspectedConditions?.join(', ')}
              variant="info"
            />

            <StatusCard
              icon="💡"
              title="Recommended Action"
              description={analysis.recommendedAction}
              variant="info"
            />

            {analysis.reasoning && (
              <StatusCard
                icon="🧠"
                title="Medical Reasoning"
                description={analysis.reasoning}
                variant="default"
              />
            )}
          </div>
        )}

        {/* Instructions */}
        {!transcript && !isRecording && !isProcessing && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Tap the microphone button</li>
              <li>Describe your symptoms clearly</li>
              <li>Wait for AI to analyze (10-15 seconds)</li>
              <li>Receive personalized health guidance</li>
            </ol>
            <p className="text-xs mt-4 text-gray-600 dark:text-gray-400">
              💡 Supported languages: Hindi, English, Bengali, Telugu, and more
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
```

---

## 🎯 Test Your Demo (5 min)

1. **Open browser:** http://localhost:3000
2. **Click "Start Triage"** or go to http://localhost:3000/triage
3. **Allow microphone access** (browser will prompt)
4. **Tap the microphone** (🎤 button)
5. **Speak:** "I have fever and headache for 3 days"
6. **Wait** for processing (10-15 seconds)
7. **See results:**
   - Transcript of what you said ✅
   - AI severity assessment ✅
   - Suspected conditions ✅
   - Recommended actions ✅
   - AI voice response plays ✅

**🎉 If this works, you have a WORKING DEMO!**

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot find module 'dotenv/config'"
```bash
npm install dotenv
```

### Issue: "Microphone not working"
- Check browser security: https://localhost:3000 (not http)
- Or use Vercel deployment (automatically HTTPS)
- Grant microphone permission in browser

### Issue: "GCP authentication failed"
```bash
# Check your .env.local has correct values
npm run validate:env

# Verify the service account has permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:vaidya-agent@*"
```

### Issue: "Firestore permission denied"
```bash
# Grant Firestore role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vaidya-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Issue: "Vertex AI not responding"
```bash
# Verify Vertex AI API is enabled
gcloud services list --enabled | grep aiplatform

# If not enabled:
gcloud services enable aiplatform.googleapis.com
```

---

## 📱 Deploy to Vercel (Bonus - 15 min)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd c:\Users\acer\Desktop\vaidya-agent\client
vercel

# Add environment variables in Vercel dashboard
# Copy all values from .env.local to Vercel
```

**Your app will be live at:** https://vaidya-agent-xxx.vercel.app

---

## 🎯 Success Criteria

You're done when:

- ✅ `npm run verify:gcp` passes
- ✅ `http://localhost:3000/api/health` returns healthy
- ✅ Voice recording works in browser
- ✅ AI responds with diagnosis
- ✅ Audio plays back response
- ✅ You can demo the full triage flow

---

## ⏭️ Next Steps (Optional)

Once basic demo works:

1. **Build remaining pages** (see `PROJECT_STATUS.md`)
   - Records, Care Finder, Guides, Profile

2. **Add Google Maps** to Care Finder page

3. **Connect RAG** to Health Guides page

4. **Implement ABDM** consent flow in Records

5. **Polish UI** with loading states and error handling

---

## 📚 Documentation

- 📖 **SETUP_GUIDE.md** - Complete setup with troubleshooting
- 📊 **PROJECT_STATUS.md** - Full project analysis
- 🔧 **API_DOCS.md** - API endpoint reference
- 🎨 **UI_IMPLEMENTATION_GUIDE.md** - Frontend templates

---

## 🏆 What You're Building

**Vaidya-Agent** is:
- ✅ Voice-first healthcare assistant
- ✅ Multi-agent AI system (Gemini 2.5 Pro)
- ✅ 11 Indian languages supported
- ✅ ABDM/UHI integrated
- ✅ Production-ready security
- ✅ 12 clinical guidelines (RAG)
- ✅ Google Maps PHC locator

**Your USP:**
- Not just a chatbot, an autonomous healthcare navigation system
- Built for India's healthcare ecosystem
- Voice-first accessibility for rural populations

---

**🚀 Ready? Let's build!**

Start with Step 1: `npm install` ⬆️
