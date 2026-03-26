# Security Enforcement - Phase 4 Implementation

## How Security is Enforced

### 1. Global Middleware (`middleware.ts`)

**Location**: Root-level `middleware.ts` (Next.js convention)

**Execution**: Runs **before every API request** reaches route handlers

**What it does**:
```typescript
export async function middleware(request: NextRequest): Promise<NextResponse> {
  // 1. Validate authentication (checks PROTECTED_ROUTES vs PUBLIC_ROUTES)
  const authResult = await validateAuth(request);
  if (!authResult.success) {
    return authResult.response; // 401 Unauthorized
  }

  // 2. Check rate limit (enhanced, per-user and per-IP)
  const rateLimitResult = checkRateLimitEnhanced(request, authContext);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(...); // 429 Too Many Requests
  }

  // 3. Continue to route handler
  return NextResponse.next();
}
```

**Routes Protected**:
- `/api/agent/*` - Agent endpoints (chat, triage, session)
- `/api/abdm/*` - ABDM integration (patients, facilities, consent)
- `/api/uhi/*` - UHI booking (discovery, select, confirm)
- `/api/location/*` - PHC search and directions
- `/api/voice/*` - STT, TTS, voice triage
- `/api/rag/guidelines` (POST) - Admin-only

**Routes Public** (no auth required):
- `/api/health` - Health check
- `/api/rag/search` - RAG search
- `/api/auth/login` - Login endpoint

**Verification**:
```bash
# Middleware is automatically loaded by Next.js 16
# File: middleware.ts at project root
# Config: export const config = { matcher: ['/api/:path*'] }
```

### 2. App Initialization (`instrumentation.ts`)

**Location**: Root-level `instrumentation.ts` (Next.js convention)

**Execution**: Runs **once at server startup** (automatic in Next.js 15+)

**What it does**:
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load secrets from GCP Secret Manager
    const { initializeSecrets } = await import('./lib/security/secrets-manager');
    await initializeSecrets();
    
    // initializeSecrets() internally calls:
    // initializeJWT({ jwtSecret: secrets.jwtSecret });
  }
}
```

**Initialization Chain**:
1. Server starts
2. `instrumentation.ts::register()` runs
3. `initializeSecrets()` loads JWT_SECRET from Secret Manager or env
4. `initializeJWT()` initializes jose signing key
5. All subsequent requests use initialized JWT secret

**Verification**:
```bash
# Start server and check logs:
npm run dev

# Expected output:
# [Instrumentation] Initializing application...
# [SecretManager] Secrets loaded successfully
# [Instrumentation] Secrets and JWT initialized
```

### 3. Authentication Flow

#### Login
```
POST /api/auth/login
Body: { userId, abhaAddress }

→ If DEMO_AUTH_ENABLED=true: Accept any userId
→ If DEMO_AUTH_ENABLED=false: Throw "Authentication service not configured"
   (Intentional: Real OAuth/ABDM auth is provider-specific)

← Returns: { accessToken, refreshToken, expiresAt }
```

#### Protected Request
```
GET /api/agent/chat
Headers: { Authorization: "Bearer <token>" }

→ middleware.ts intercepts
→ validateAuth() extracts token, verifies with jose
→ If valid: Continue to route handler
→ If invalid: 401 Unauthorized
```

## Architecture Decision: Why Global Middleware?

**Defense-in-Depth Options**:

1. **Global Middleware Only** ✅ (Current Implementation)
   - Pro: Single enforcement point, impossible to bypass
   - Pro: All routes automatically protected
   - Con: Cannot be accidentally skipped

2. **Per-Route Wrappers** (Alternative)
   - Pro: Explicit per-route
   - Con: Easy to forget to apply
   - Con: Inconsistent enforcement

**Our Choice**: Global middleware because:
- **Fail-secure**: New routes are automatically protected
- **DRY**: No need to wrap every route handler
- **Audit-friendly**: Single place to verify enforcement

## Verification Checklist

- [x] `middleware.ts` exists at project root
- [x] `middleware.ts` exports `middleware()` function
- [x] `middleware.ts` has `config.matcher = ['/api/:path*']`
- [x] `middleware.ts` calls `validateAuth()` before route handlers
- [x] `middleware.ts` calls `checkRateLimitEnhanced()` with auth context
- [x] `instrumentation.ts` exists at project root
- [x] `instrumentation.ts` exports `register()` function
- [x] `instrumentation.ts` calls `initializeSecrets()`
- [x] `initializeSecrets()` calls `initializeJWT()`
- [x] Old `proxy.ts` file deleted (was orphaned code)
- [x] `npm run typecheck` passes (0 errors)
- [x] `npm run lint` passes (0 errors)

## Testing the Enforcement

### Test 1: Protected Route Without Auth
```bash
curl http://localhost:3000/api/agent/chat
# Expected: 401 Unauthorized
```

### Test 2: Protected Route With Valid Token
```bash
# 1. Get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","abhaAddress":"test@abdm"}' \
  | jq -r '.data.accessToken')

# 2. Use token
curl http://localhost:3000/api/agent/chat \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK (or 400 if missing required body)
```

### Test 3: Rate Limiting
```bash
# Make 61+ requests in 60 seconds
for i in {1..65}; do
  curl -I http://localhost:3000/api/health
done
# Expected: First 60 succeed, then 429 Too Many Requests
```

### Test 4: Instrumentation on Startup
```bash
npm run dev | grep Instrumentation
# Expected output:
# [Instrumentation] Initializing application...
# [Instrumentation] Secrets and JWT initialized
# [Instrumentation] Application ready
```

## Remaining Limitations (Documented Trade-offs)

1. **Demo Auth Mode** - When `DEMO_AUTH_ENABLED=true`, accepts any userId
   - Reason: Real production auth requires OAuth provider setup (Google, ABHA, etc.)
   - Acceptable for: Hackathon, MVP, demo environments
   - Not acceptable for: Production healthcare deployment

2. **In-Memory Rate Limiting** - Uses process-local Maps
   - Reason: Works for single-instance deployments
   - Acceptable for: Small deployments, development
   - Not acceptable for: Multi-instance Kubernetes, serverless scale
   - Solution: Integrate Redis-based rate limiting (ioredis)

3. **In-Memory UHI State** - Transaction state in process memory
   - Reason: Simplifies development flow
   - Acceptable for: Demo, single-instance
   - Not acceptable for: Production with multiple instances
   - Solution: Persist to Firestore (already implemented for sessions)

These limitations are **intentional choices** for hackathon/MVP scope. The security **enforcement** is production-ready; the **backends** can be swapped out.

## Summary

✅ **Authentication**: Globally enforced via `middleware.ts`
✅ **Rate Limiting**: Globally enforced via `middleware.ts`
✅ **Secrets Init**: Automatically loaded via `instrumentation.ts`
✅ **JWT Setup**: Initialized from Secret Manager at startup
✅ **Type Safety**: 0 errors (npm run typecheck)
✅ **Code Quality**: 0 errors (npm run lint)

**Phase 4 Security Implementation: COMPLETE**
