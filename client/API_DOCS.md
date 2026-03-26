# Vaidya-Agent API Documentation

## Overview

The Vaidya-Agent API provides endpoints for healthcare triage, clinical guidelines search (RAG), and voice-enabled interaction. All endpoints return JSON responses following a standard format.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-app.vercel.app/api`

## Response Format

All API responses follow this structure:

```typescript
{
  "success": boolean,
  "data"?: any,
  "error"?: {
    "code": string,
    "message": string,
    "details"?: any
  },
  "timestamp": string (ISO 8601)
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Service not configured |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Core Endpoints

### Health Check

Check system health and service connectivity.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy|degraded|unhealthy",
    "timestamp": "2026-03-25T...",
    "services": {
      "firestore": true,
      "vertexAI": true,
      "environment": true
    },
    "version": "0.1.0"
  }
}
```

---

### Agent Endpoints

#### Create Session

Create a new agent session for interaction.

**Endpoint**: `POST /api/agent/session`

**Request Body**:
```json
{
  "userId": "string (optional)",
  "abhaAddress": "string (optional, e.g., user@abdm)",
  "initialContext": {} (optional)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abc",
    "userId": "user123",
    "abhaAddress": "patient@abdm",
    "createdAt": "2026-03-25T...",
    "updatedAt": "2026-03-25T...",
    "context": {
      "conversationHistory": [],
      "lastActivity": "2026-03-25T..."
    }
  }
}
```

#### Triage Symptoms

Analyze symptoms and provide triage assessment using Gemini 2.5 Pro.

**Endpoint**: `POST /api/agent/triage`

**Request Body**:
```json
{
  "sessionId": "string (optional)",
  "symptoms": "string (required, 3-2000 characters)",
  "patientContext": {} (optional),
  "abhaAddress": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123...",
    "triage": {
      "severity": "low|moderate|high|critical",
      "suspectedConditions": ["dengue", "viral fever"],
      "recommendedAction": "Visit nearest PHC within 24 hours",
      "reasoning": "Based on fever, headache, and body aches..."
    }
  }
}
```

---

## RAG Endpoints (Clinical Guidelines)

### Search Guidelines

Semantic search across Indian clinical guidelines using Vertex AI embeddings.

**Endpoint**: `POST /api/rag/search`

**Request Body**:
```json
{
  "query": "string (required, 3-500 chars)",
  "category": "infectious|chronic|emergency|maternal|pediatric|general (optional)",
  "condition": "string (optional, e.g., 'dengue', 'tuberculosis')",
  "topK": "number (default: 5, max: 20)",
  "minSimilarity": "number (default: 0.5, 0-1)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "guideline": {
          "id": "abc123",
          "condition": "dengue",
          "category": "infectious",
          "title": "Dengue Fever Initial Assessment",
          "content": "Clinical Features: High fever...",
          "source": "ICMR National Guidelines for Dengue 2023",
          "keywords": ["dengue", "fever", "platelet"],
          "severity": "moderate"
        },
        "similarity": 0.87
      }
    ],
    "count": 5
  }
}
```

### List Guidelines

List all stored clinical guidelines with optional filtering.

**Endpoint**: `GET /api/rag/guidelines`

**Query Parameters**:
- `category` (optional): Filter by category
- `condition` (optional): Filter by condition
- `stats=true` (optional): Return statistics only

**Response**:
```json
{
  "success": true,
  "data": {
    "guidelines": [...],
    "count": 12
  }
}
```

### Create/Update Guideline (Admin Only)

**Endpoint**: `POST /api/rag/guidelines`

**Headers**:
- `x-admin-key`: Required (must match `RAG_ADMIN_KEY` env var)

**Request Body**:
```json
{
  "condition": "string (required)",
  "category": "infectious|chronic|emergency|maternal|pediatric|general",
  "title": "string (required)",
  "content": "string (required, min 10 chars)",
  "source": "string (required)",
  "sourceUrl": "string (optional, valid URL)",
  "keywords": ["array", "of", "strings"],
  "severity": "low|moderate|high|critical (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "guideline_abc123",
    "message": "Guideline saved successfully"
  }
}
```

### Seed Database (Admin Only)

Populate database with initial Indian clinical guidelines.

**Endpoint**: `POST /api/rag/seed`

**Headers**:
- `x-admin-key`: Required in production

**Query Parameters**:
- `force=true` (optional): Re-seed even if already populated

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Database seeded successfully",
    "seeded": 12,
    "stats": {
      "total": 12,
      "byCategory": { "infectious": 10, "emergency": 2 },
      "byCondition": { "dengue": 2, "tuberculosis": 2, ... }
    }
  }
}
```

---

## Voice Endpoints

### Speech-to-Text

Convert audio to text with Indian language support.

**Endpoint**: `POST /api/voice/stt`

**Request Body**:
```json
{
  "audioContent": "string (required, base64-encoded)",
  "languageCode": "hi-IN|en-IN|bn-IN|te-IN|mr-IN|ta-IN|gu-IN|kn-IN|ml-IN|pa-IN|or-IN (default: hi-IN)",
  "alternativeLanguageCodes": ["en-IN"] (optional),
  "encoding": "LINEAR16|FLAC|MP3|OGG_OPUS|WEBM_OPUS (default: WEBM_OPUS)",
  "sampleRateHertz": "number (default: 16000)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transcript": "मुझे तीन दिन से बुखार है",
    "confidence": 0.95,
    "languageCode": "hi-IN",
    "alternatives": [...]
  }
}
```

### Text-to-Speech

Convert text to speech audio.

**Endpoint**: `POST /api/voice/tts`

**Request Body**:
```json
{
  "text": "string (required, max 5000 chars)",
  "languageCode": "hi-IN|en-IN|... (default: hi-IN)",
  "voiceName": "string (optional, e.g., 'hi-IN-Wavenet-A')",
  "speakingRate": "number (default: 1.0, 0.25-4.0)",
  "pitch": "number (default: 0, -20 to 20)",
  "audioEncoding": "MP3|LINEAR16|OGG_OPUS (default: MP3)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "audioContent": "base64-encoded-audio...",
    "audioEncoding": "MP3",
    "sampleRateHertz": 24000
  }
}
```

### Voice Triage (Complete Flow)

Complete voice-to-voice triage: STT → Triage → RAG → TTS.

**Endpoint**: `POST /api/voice/triage`

**Request Body**:
```json
{
  "sessionId": "string (optional)",
  "audioContent": "string (required, base64-encoded)",
  "languageCode": "hi-IN|en-IN|... (default: hi-IN)",
  "patientContext": {} (optional),
  "abhaAddress": "string (optional)",
  "respondWithAudio": "boolean (default: true)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "input": {
      "transcript": "मुझे तीन दिन से बुखार है और सिरदर्द है",
      "confidence": 0.92,
      "detectedLanguage": "hi-IN",
      "languageName": "Hindi"
    },
    "triage": {
      "severity": "moderate",
      "suspectedConditions": ["dengue", "viral fever"],
      "recommendedAction": "Visit PHC within 24 hours",
      "reasoning": "Fever with headache for 3 days..."
    },
    "guidelines": [
      {
        "title": "Dengue Fever Initial Assessment",
        "condition": "dengue",
        "source": "ICMR Guidelines",
        "similarity": 0.85
      }
    ],
    "response": {
      "text": "आपके लक्षणों के आधार पर...",
      "audio": {
        "audioContent": "base64-encoded-mp3...",
        "audioEncoding": "MP3"
      }
    }
  }
}
```

---

## Pending Implementation (Phase 3)

### ABDM Endpoints
- `GET /api/abdm/hpr/search` - Search Healthcare Professionals
- `GET /api/abdm/hfr/search` - Search Health Facilities
- `POST /api/abdm/consent/request` - Create Consent Request (M3)

### UHI Endpoints
- `POST /api/uhi/discovery` - Discover healthcare service providers
- `POST /api/uhi/select` - Select a provider
- `POST /api/uhi/confirm` - Confirm and book appointment

---

## Authentication

| Endpoint Type | Authentication |
|--------------|----------------|
| Core API | None (session-based) |
| RAG Read | None |
| RAG Write | `x-admin-key` header |
| Voice | None |
| ABDM (Phase 3) | OAuth 2.0 |
| UHI (Phase 3) | Subscriber auth |

---

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Configurable**: `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` env vars
- **Exceeded**: Returns `429 Too Many Requests`

---

## Supported Languages (Voice)

| Code | Language |
|------|----------|
| `hi-IN` | Hindi |
| `en-IN` | English (India) |
| `bn-IN` | Bengali |
| `te-IN` | Telugu |
| `mr-IN` | Marathi |
| `ta-IN` | Tamil |
| `gu-IN` | Gujarati |
| `kn-IN` | Kannada |
| `ml-IN` | Malayalam |
| `pa-IN` | Punjabi |
| `or-IN` | Odia |

---

## Example Usage

### Voice Triage (JavaScript)

```javascript
// Record audio (browser)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result.split(',')[1];

    const response = await fetch('/api/voice/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: base64,
        languageCode: 'hi-IN'
      })
    });

    const { data } = await response.json();

    // Play response audio
    if (data.response.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${data.response.audio.audioContent}`);
      audio.play();
    }
  };
  reader.readAsDataURL(blob);
};

mediaRecorder.start();
setTimeout(() => mediaRecorder.stop(), 5000); // 5 second recording
```

### RAG Search (cURL)

```bash
# Search guidelines
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "fever with body pain and headache", "topK": 3}'

# Seed database (admin)
curl -X POST http://localhost:3000/api/rag/seed \
  -H "x-admin-key: your-admin-key"
```

---

## Version

**API Version**: 0.2.0 (Phase 2 - RAG + Voice Complete)

**Status**:
- ✅ Health Check
- ✅ Session Management
- ✅ Triage Endpoint
- ✅ RAG Search (Clinical Guidelines)
- ✅ Voice STT/TTS
- ✅ Voice Triage
- ⏳ ABDM Integration (Phase 3)
- ⏳ UHI Integration (Phase 3)
