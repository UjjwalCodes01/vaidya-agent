# Vaidya-Agent Client

**Autonomous Healthcare Triage System** for Northern India - Built for Brewing Codes 4.0 Hackathon

## 🎯 Project Vision

Vaidya-Agent bridges the healthcare accessibility gap between rural and urban India by providing AI-powered triage, ABDM integration, and resource-aware recommendations. Unlike Western-centric AI models that suggest inaccessible diagnostics, Vaidya-Agent understands Indian epidemiology and resource constraints.

## 🏗️ Architecture

- **Frontend**: Next.js 16 (App Router) with React 19
- **AI Engine**: Gemini 2.5 Pro via Vertex AI
- **RAG**: Vertex AI Embeddings (text-embedding-004) for clinical guidelines
- **Voice**: Google Cloud Speech-to-Text & Text-to-Speech (11 Indian languages)
- **State Management**: Firestore
- **Integrations**: ABDM (M1/M2/M3), UHI Protocol
- **Deployment**: Vercel

## 📦 Quick Start

### Prerequisites

- Node.js 24+ and npm 11+
- GCP account with Vertex AI, Firestore, Speech APIs enabled
- ABDM Sandbox credentials

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in your credentials in .env.local
# See PHASE1_SETUP.md for detailed instructions
```

### Configuration

Required environment variables in `.env.local`:

```bash
# Core GCP
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-json>

# RAG (Phase 2)
VERTEX_AI_EMBEDDING_MODEL=text-embedding-004
RAG_ADMIN_KEY=your-admin-key

# Voice (Phase 2)
DEFAULT_SPEECH_LANGUAGE=hi-IN
TTS_VOICE_NAME=hi-IN-Wavenet-A

# ABDM (Phase 3)
ABDM_CLIENT_ID=your-abdm-client-id
ABDM_CLIENT_SECRET=your-abdm-client-secret
```

See [PHASE1_SETUP.md](../PHASE1_SETUP.md) for complete setup guide.

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Verification

```bash
# Verify GCP connectivity
npm run verify:gcp

# Type checking
npm run typecheck

# Build for production
npm run build
```

## 📁 Project Structure

```
client/
├── app/                      # Next.js 16 App Router
│   ├── api/                 # API Routes
│   │   ├── health/          # Health check endpoint
│   │   ├── agent/           # Session & triage endpoints
│   │   ├── rag/             # RAG endpoints (search, seed, guidelines)
│   │   ├── voice/           # Voice endpoints (stt, tts, triage)
│   │   ├── abdm/            # ABDM M1/M2/M3 endpoints (Phase 3)
│   │   └── uhi/             # UHI protocol endpoints (Phase 3)
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── lib/                     # Core libraries
│   ├── gcp/                 # GCP services
│   │   ├── config.ts        # Service account management
│   │   ├── firestore.ts     # Session & patient context
│   │   ├── vertex-ai.ts     # Gemini 2.5 Pro client
│   │   ├── embeddings.ts    # Vertex AI embeddings
│   │   ├── speech.ts        # Speech-to-Text & Text-to-Speech
│   │   └── guidelines-store.ts # RAG clinical guidelines store
│   ├── data/                # Static data
│   │   └── clinical-guidelines.ts # Indian clinical guidelines (12 conditions)
│   ├── abdm/                # ABDM integration
│   │   └── client.ts        # ABDM API client
│   ├── validations.ts       # Zod schemas
│   └── api-middleware.ts    # API error handling
├── types/                   # TypeScript definitions
│   └── index.ts             # Core types (ABDM, UHI, Agent)
├── middleware.ts            # Next.js middleware (auth, rate limit, CORS)
├── instrumentation.ts       # App startup initialization
├── .env.example             # Environment template
├── next.config.ts           # Next.js config with security headers
└── API_DOCS.md              # API documentation
```

## 🚀 Features

### ✅ Phase 1 Complete (Foundation)

- [x] Next.js 16 setup with TypeScript
- [x] GCP integration (Vertex AI + Firestore)
- [x] Environment configuration for Vercel
- [x] Security headers (HSTS, CSP, X-Frame-Options)
- [x] Type definitions & Zod validation
- [x] API middleware with error handling
- [x] Health check endpoint
- [x] Session management
- [x] Symptom triage with Gemini 2.5 Pro

### ✅ Phase 2 Complete (RAG + Voice)

- [x] RAG pipeline with Vertex AI embeddings
- [x] 12 Indian clinical guidelines (ICMR, WHO, NTEP)
- [x] Semantic search across guidelines
- [x] Speech-to-Text (11 Indian languages)
- [x] Text-to-Speech with regional voices
- [x] Voice-enabled triage (full STT → Triage → RAG → TTS flow)
- [x] Admin-protected write endpoints (fail-closed security)

### ✅ Phase 3 Complete (ABDM/UHI Integration)

- [x] ABDM M1 patient discovery
- [x] ABDM M2 facility search
- [x] ABDM M3 consent flow with FHIR
- [x] UHI provider discovery
- [x] UHI appointment booking
- [x] Multi-agent coordinator pattern
- [x] Google Maps PHC locator
- [x] Emergency red alert system

### ✅ Phase 4 Complete (Security & Observability)

- [x] JWT authentication (access + refresh tokens)
- [x] GCP Secret Manager integration
- [x] Enhanced rate limiting (per-user, per-IP)
- [x] DPDP compliant audit logging
- [x] MCP server for debugging (`npm run mcp`)
- [x] Reasoning traces persisted to Firestore
- [x] Global auth middleware enforcement

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run mcp` | Start MCP debugging server |
| `npm run verify:gcp` | Test GCP connectivity |

## 📖 Documentation

- [Phase 1 Setup Guide](../PHASE1_SETUP.md) - Complete installation guide
- [API Documentation](./API_DOCS.md) - API endpoints and usage

## 🔒 Security

- **Data Sovereignty**: Infrastructure designed for DPDP 2023 compliance
- **Storage**: Patient data stored in Firestore
- **Audit Logging**: DPDP compliant logging to Firestore audit_logs collection
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy
- **Input Validation**: Zod schemas validate all API inputs
- **JWT Authentication**: Access/refresh tokens with configurable expiry
- **Rate Limiting**: Per-user and per-IP with route-specific tiers
- **Admin Protection**: RAG write endpoints require `x-admin-key` header (fail-closed)

## 🏥 Medical Context

### Indian Epidemiology Focus

Seeded clinical guidelines cover:
- Dengue (initial assessment + severe management)
- Tuberculosis (NTEP guidelines + DR-TB referral)
- Malaria (P. falciparum + severe malaria)
- Typhoid (management + complications)
- Acute diarrhea (WHO ORS protocol)
- Pneumonia (IMNCI approach)
- Snake bite (ASV protocol)
- Influenza (ILI management)

### Supported Languages (Voice)

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

### ABDM Integration (Phase 3)

- **M1**: HPR/HFR registry verification
- **M2**: Health Information Provider integration
- **M3**: FHIR-based consent management with ABHA OTP

### UHI Protocol (Phase 3)

- Provider discovery (teleconsultation & physical)
- Appointment booking
- Service fulfillment tracking

## 🎓 Learning Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/vertexai/latest)
- [Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Cloud Text-to-Speech](https://cloud.google.com/text-to-speech/docs)
- [ABDM Developer Portal](https://sandbox.abdm.gov.in/)
- [UHI Specifications](https://uhi.abdm.gov.in/)

## 🐛 Troubleshooting

### GCP Authentication Issues

```bash
# Verify service account permissions:
# - Vertex AI User
# - Cloud Datastore User
# - Service Account Token Creator
# - Cloud Speech Client (for voice)

# Check environment
npm run verify:gcp
```

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### RAG Not Working

```bash
# Ensure guidelines are seeded (development only)
curl -X POST http://localhost:3000/api/rag/seed

# In production, set RAG_ADMIN_KEY and use:
curl -X POST http://localhost:3000/api/rag/seed \
  -H "x-admin-key: your-admin-key"
```

## 📊 Status

**Phase 1**: ✅ Complete (Infrastructure & Foundation)
**Phase 2**: ✅ Complete (RAG + Voice)
**Phase 3**: ✅ Complete (ABDM/UHI Integration)
**Phase 4**: ✅ Complete (Security, MCP Debugging, Observability)

### Phase 4 Features

- **JWT Authentication**: Secure token-based auth with refresh support
- **GCP Secret Manager**: Runtime secret fetching with caching (optional)
- **Enhanced Rate Limiting**: Per-user, per-IP, and route-based limits
- **Audit Logging**: DPDP 2023 compliant audit trail to Firestore
- **MCP Server**: Full Model Context Protocol for debugging (`npm run mcp`)
- **Reasoning Traces**: Persistent agent thinking and tool execution logs

### Production Deployment

```bash
# Required for production:
GCP_SECRET_MANAGER_ENABLED=true  # Enable Secret Manager
DEMO_AUTH_ENABLED=false          # Disable demo auth
MOCK_ABDM_RESPONSES=false        # Disable mocks
MOCK_UHI_RESPONSES=false

# Note: Rate limiting is in-memory (single instance)
# For multi-instance: integrate Redis-based rate limiting
```

## 🤝 Contributing

This is a hackathon project for Brewing Codes 4.0. For issues or suggestions during the event, please coordinate with the team.

## 📝 License

Proprietary - Brewing Codes 4.0 Submission

---

**Built with** ❤️ **for bridging India's healthcare divide**
