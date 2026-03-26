# Edge Runtime Compatibility Fixes

## Overview
Fixed all Edge Runtime compatibility issues preventing production builds in Next.js 16. The middleware (now `proxy.ts`) can now run successfully in Vercel Edge Runtime.

## Issues Fixed

### 1. ✅ Node.js Crypto API Usage (HIGH)
**Problem:** `middleware.ts` → `lib/auth/jwt.ts` used `import { randomUUID } from 'crypto'` which is Node-only.

**Solution:** 
- Modified `lib/auth/jwt.ts` to use Web Crypto API: `crypto.randomUUID()`
- Added fallback UUID generation using `crypto.getRandomValues()` for older environments
- Function `generateUUID()` is now Edge Runtime compatible

**Files Changed:**
- `lib/auth/jwt.ts` (lines 1-40)

---

### 2. ✅ Redis/ioredis Node-only Dependency (HIGH)
**Problem:** `middleware.ts` → `lib/security/rate-limiter-redis.ts` imported `ioredis` which is Node-only.

**Solution:**
- Created `lib/security/rate-limiter-edge.ts` with pure in-memory rate limiting
- Updated `middleware.ts` to import from Edge-compatible module
- Redis-backed rate limiting still available for API routes via original module

**Files Created:**
- `lib/security/rate-limiter-edge.ts` (175 lines)

**Files Changed:**
- `middleware.ts` → `proxy.ts` (import changed from `rate-limiter-redis` to `rate-limiter-edge`)

**Note:** Edge middleware instances don't share state, so in-memory rate limiting is best-effort per instance. For strict distributed rate limiting, implement in API routes with Redis.

---

### 3. ✅ API Middleware setInterval & process.env Usage (HIGH)
**Problem:** `middleware.ts` → `lib/auth/middleware.ts` → `lib/api-middleware.ts`:
- Had `setInterval()` at module level (line 231) - Edge Runtime doesn't support background timers
- Used `process.env.NODE_ENV` directly
- Imported `lib/env.ts` which has `process.exit()` calls

**Solution:**
- Created `lib/api-middleware-edge.ts` with Edge-compatible error classes and response formatters
- Removed `setInterval`, `getEnv()` dependency, and env-specific logic
- Minimal secure error responses without exposing internal details

**Files Created:**
- `lib/api-middleware-edge.ts` (115 lines)

**Files Changed:**
- `lib/auth/middleware.ts` (import changed from `api-middleware` to `api-middleware-edge`)

**Migration Note:** Original `api-middleware.ts` remains for use in API routes (Node Runtime).

---

### 4. ✅ Environment Validation Script (HIGH)
**Problem:** `scripts/validate-env.js` called validation before loading `.env.local`, causing prebuild failures.

**Solution:**
- Added `dotenv.config()` calls to load `.env.local` and `.env` before validation
- Now properly validates environment variables during `npm run build`

**Files Changed:**
- `scripts/validate-env.js` (lines 9-16)

---

### 5. ✅ GCP Verification Script Null Checks (MEDIUM)
**Problem:** `scripts/verify-gcp.js` assumed `response.candidates[0].content.parts[0].text` always exists, causing crashes with Gemini 2.5 Pro.

**Solution:**
- Added safe optional chaining: `candidates?.[0]?.content?.parts?.[0]?.text`
- Handles empty responses gracefully
- Better error messages for debugging

**Files Changed:**
- `scripts/verify-gcp.js` (lines 159-177)

---

### 6. ✅ Next.js 16 Deprecation Warning (LOW)
**Problem:** Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` convention.

**Solution:**
- Renamed `middleware.ts` → `proxy.ts`
- Renamed exported function: `middleware()` → `proxy()`
- No deprecation warnings in build output

**Files Renamed:**
- `middleware.ts` → `proxy.ts`

**Files Changed:**
- `proxy.ts` (renamed function export)

---

## Architecture Changes

### Module Separation Strategy
To support both Edge Runtime (middleware) and Node Runtime (API routes), we now have:

**Edge Runtime Compatible:**
- `lib/security/rate-limiter-edge.ts` - In-memory rate limiting
- `lib/api-middleware-edge.ts` - Error classes and response formatters
- `lib/auth/jwt.ts` - JWT using Web Crypto API
- `lib/auth/middleware.ts` - Auth validation
- `proxy.ts` - Global middleware/proxy

**Node Runtime (API Routes):**
- `lib/security/rate-limiter-redis.ts` - Redis-backed rate limiting with in-memory fallback
- `lib/api-middleware.ts` - Full API middleware with env access, CORS, rate limiting
- `lib/env.ts` - Environment validation with process.exit

### Import Flow
```
proxy.ts (Edge Runtime)
├── lib/auth/middleware.ts (Edge)
│   ├── lib/auth/jwt.ts (Edge - Web Crypto)
│   ├── lib/auth/types.ts
│   └── lib/api-middleware-edge.ts (Edge)
└── lib/security/rate-limiter-edge.ts (Edge)

API Routes (Node Runtime)
└── lib/api-middleware.ts (Node)
    └── lib/env.ts (Node - can use process.exit)
```

---

## Verification

All checks now pass:

```bash
✅ npm run build       # Success, no deprecation warnings
✅ npm run typecheck   # Success, 0 errors
✅ npm run lint        # Success, 0 errors, 0 warnings
```

**Build Output:**
```
ƒ Proxy (Middleware)   # ✓ Now recognized as "Proxy" not "Middleware"
```

---

## Deployment Notes

### Edge Runtime Characteristics
1. **Stateless:** Each request may hit different Edge instances
2. **No Filesystem:** Can't read/write files
3. **No Node APIs:** Use Web Standards (fetch, crypto, etc.)
4. **Limited Memory:** Keep memory footprint small
5. **Cold Starts:** First request may be slower

### Rate Limiting Strategy
- **Edge Middleware:** Best-effort in-memory per instance (current implementation)
- **API Routes:** Use Redis-backed limiter for strict enforcement
- **Production:** Consider adding Redis to Edge with Upstash Edge Redis if needed

### Environment Variables
- All env vars must be prefixed with `NEXT_PUBLIC_` to be accessible in Edge Runtime
- Or use Vercel's automatic env var injection for runtime secrets
- Current implementation: Auth secrets are validated at build time in Node context

---

## Testing Edge Compatibility

To ensure Edge compatibility for new code:

1. **No Node.js APIs:**
   - ❌ `import { randomUUID } from 'crypto'`
   - ✅ `crypto.randomUUID()` (Web Crypto)
   - ❌ `import fs from 'fs'`
   - ❌ `process.exit()`
   - ✅ `throw new Error()`

2. **No Node Packages:**
   - ❌ `ioredis`, `redis`
   - ❌ Any package that uses Node streams, buffers, or fs
   - ✅ Packages specifically marked as Edge-compatible

3. **No Background Tasks:**
   - ❌ `setInterval()`, `setTimeout()` at module level
   - ✅ Request-scoped async operations only

4. **Verify Build:**
   ```bash
   npm run build
   # Should see: ƒ Proxy (Middleware)
   # No errors about "not supported in Edge Runtime"
   ```

---

## Migration Path for Future Changes

If you need to add functionality to the proxy:

1. **Check Edge Compatibility:** Can this run in Edge Runtime?
   - Yes → Add to existing modules
   - No → Keep in API routes only

2. **Shared Code:** If logic is needed in both Edge and Node:
   - Extract to a `-edge.ts` variant (Edge-compatible subset)
   - Keep full version in original file for Node runtime

3. **Testing:** Always run `npm run build` to verify Edge compatibility

---

## Known Limitations

1. **In-Memory Rate Limiting:** Not distributed across Edge instances
   - For strict rate limiting, implement at API route level with Redis
   
2. **No Redis in Middleware:** ioredis is Node-only
   - Consider Upstash Edge Redis if distributed state needed
   
3. **Environment Access:** Limited to `process.env` at build time
   - Runtime env vars need `NEXT_PUBLIC_` prefix or Vercel env injection

---

## References

- [Next.js Edge Runtime](https://nextjs.org/docs/api-reference/edge-runtime)
- [Middleware to Proxy Migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Vercel Edge Middleware](https://vercel.com/docs/concepts/functions/edge-middleware)
