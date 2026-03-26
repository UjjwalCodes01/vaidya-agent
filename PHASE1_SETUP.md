# Vaidya-Agent Setup Guide

## Phase 1: Foundation & Environment Setup ✅

This guide walks through the Phase 1 setup completed for the Vaidya-Agent hackathon project.

## Prerequisites

- Node.js 24.14.0 or higher
- npm 11.9.0 or higher
- GCP Account with Vertex AI enabled
- ABDM Sandbox credentials

## Installation

### 1. Install Dependencies

```bash
cd client
npm install
```

**Installed packages:**
- `@google-cloud/vertexai` - Gemini 2.5 Pro integration
- `@google-cloud/firestore` - Session state management
- `@google-cloud/aiplatform` - GCP AI Platform services
- `firebase-admin` - Firebase Admin SDK
- `zod` - Schema validation
- `dotenv` - Environment variable management

### 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the following required variables in `.env.local`:

```bash
# GCP Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-service-account-json>

# ABDM Sandbox
ABDM_CLIENT_ID=<from-abdm-sandbox>
ABDM_CLIENT_SECRET=<from-abdm-sandbox>

# UHI Configuration
UHI_SUBSCRIBER_ID=<your-uhi-id>
```

### 3. Generate Base64 Service Account Key

For Vercel deployment, convert your GCP service account JSON to Base64:

```bash
cat service-account.json | base64 -w 0
```

Copy the output to `GCP_SERVICE_ACCOUNT_KEY_BASE64` in `.env.local`.

## Project Structure

```
client/
├── app/                    # Next.js 16 App Router
│   ├── api/               # API routes
│   │   ├── abdm/         # ABDM integration endpoints
│   │   ├── uhi/          # UHI integration endpoints
│   │   └── agent/        # Agent interaction endpoints
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── components/            # React components
│   ├── ui/               # UI components
│   └── agent/            # Agent-specific components
├── lib/                   # Core libraries
│   ├── gcp/              # GCP services
│   │   ├── config.ts     # GCP configuration
│   │   ├── firestore.ts  # Firestore client
│   │   └── vertex-ai.ts  # Vertex AI client
│   ├── abdm/             # ABDM integration
│   ├── uhi/              # UHI integration
│   └── utils/            # Utility functions
├── types/                 # TypeScript type definitions
│   └── index.ts          # Core types
├── .env.example          # Environment variable template
└── .env.local            # Local environment (not committed)
```

## Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Verification

Verify your setup:

```bash
# Run type checking
npm run typecheck

# Build the project
npm run build
```

Both commands should complete without errors.

## Key Features Implemented

### 1. GCP Configuration (`lib/gcp/config.ts`)
- Base64 service account key decoding
- Environment validation
- Project configuration management

### 2. Firestore Client (`lib/gcp/firestore.ts`)
- Session management (create, get, update)
- Message history tracking
- Patient context storage
- Audit logging (DPDP 2023 compliance)

### 3. Vertex AI Client (`lib/gcp/vertex-ai.ts`)
- Gemini 2.5 Pro integration
- Simple `generateContent()` for single prompts
- `GeminiChat` class for multi-turn conversations
- Specialized `triageSymptoms()` for Indian epidemiology

### 4. Type Definitions (`types/index.ts`)
- ABDM types (ABHA, HPR, HFR, Consent)
- UHI types (Provider, Location, Service Request)
- Agent types (Session, Context, Messages)
- GCP/Vertex AI types

## Next Steps: Phase 2

Phase 2 (Hours 4-10) will focus on:
- Building RAG pipeline with Indian clinical guidelines
- Implementing Web Audio API for voice-first interaction
- Setting up multi-dialect support

## Security Notes

- **Never commit** `.env.local` or service account keys to Git
- All patient data is encrypted at rest in Firestore
- Audit logging is enabled for DPDP 2023 compliance
- Use environment variables for all sensitive credentials

## Troubleshooting

### TypeScript Errors

If you encounter type errors, ensure:
1. All dependencies are installed: `npm install`
2. TypeScript version is up to date: `npm update typescript`
3. Run `npm run typecheck` to identify issues

### Build Failures

If the build fails:
1. Clear `.next` directory: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Verify environment variables are set correctly

### GCP Authentication

If GCP authentication fails:
1. Verify service account has required permissions:
   - Vertex AI User
   - Cloud Datastore User
   - Service Account Token Creator
2. Check Base64 encoding is correct (no line breaks)
3. Ensure `GCP_PROJECT_ID` matches your actual project ID

## References

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/vertexai/latest)
- [ABDM Sandbox](https://sandbox.abdm.gov.in/)
- [UHI Specifications](https://uhi.abdm.gov.in/)

---

**Phase 1 Status:** ✅ Complete

**Next Phase:** Phase 2 - RAG & Reasoning (Hours 4-10)
