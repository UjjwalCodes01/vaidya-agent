# Vaidya-Agent Frontend Integration Fix Plan

**Date:** 2026-03-26
**Status:** ✅ ALL PHASES COMPLETE
**Total Time:** ~12 hours

---

## Executive Summary

All 4 phases have been completed! The frontend is now fully integrated with the backend APIs.

| Page | Backend Ready | Frontend Integrated | Status |
|------|---------------|---------------------|--------|
| **Triage** | ✅ `/api/agent/triage` | ✅ 100% | **Voice + RAG working** |
| **Home** | ✅ APIs available | ✅ 100% | **Dynamic data** |
| **Records** | ✅ `/api/abdm/*` | ✅ 100% | **ABDM integrated** |
| **Care Finder** | ✅ `/api/uhi/*`, `/api/location/*` | ✅ 100% | **Location + UHI booking** |
| **Guides** | ✅ `/api/rag/*` | ✅ 100% | **RAG search working** |
| **Profile** | ✅ `/api/auth/*` | ✅ 100% | **Auth + ABHA linking** |

**Result:** All 20+ API endpoints are now connected to the frontend!

---

## Phase 1: Critical User Flow ✅ COMPLETE (4-5 hours)
**Priority:** Highest
**Goal:** Get the core triage-to-care flow working

### 1.1 Fix Auth Context ✅ COMPLETE

**Fix Required:**
- [x] Create `lib/hooks/useAuth.ts` - Auth context hook
- [x] Create `lib/context/AuthContext.tsx` - Auth provider
- [x] Update `components/providers/Providers.tsx` - Add auth provider
- [x] Update `AppLayout.tsx` - Use real auth context

**Completed:**
- ✅ Full auth context with login/logout/linkABHA/updatePreferences
- ✅ Demo mode with fallback user for hackathon
- ✅ AppLayout using real auth state
- ✅ All pages can access user via useAuth()

---

### 1.2 Connect Home Page to Backend ✅ COMPLETE

**Fix Required:**
- [x] Call `GET /api/agent/session` for last triage
- [x] Use auth context for ABHA status
- [x] Call guidelines API or create alerts endpoint

**Completed:**
- ✅ HomeFeatures fetching real last triage session
- ✅ Dynamic ABHA status from auth context
- ✅ Real health alerts from backend

---

### 1.3 Enhance Triage Page Voice Integration ✅ COMPLETE

**Fix Required:**
- [x] Add server-side STT via `/api/voice/stt`
- [x] Add TTS response via `/api/voice/tts`
- [x] Support more Indian languages (currently only en-IN)
- [x] Better voice visualization with `VoiceWaveform` component

**Completed:**
- ✅ 11 Indian languages supported (Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia, English)
- ✅ Server-side TTS with language-specific voices
- ✅ Toggle between browser and server voice
- ✅ Language selector UI with native names

---

### 1.4 Connect Emergency FAB ✅ COMPLETE

**Fix Required:**
- [x] Implement emergency call action (dial 112/108)
- [x] Add chat emergency mode via coordinator
- [x] Integrate with location for ambulance routing

**Completed:**
- ✅ Emergency modal with Indian emergency numbers (112, 108, 181, 1098)
- ✅ Direct tel: protocol links for instant calling
- ✅ Find nearest hospital button routing to care-finder
- ✅ Clean UI with emergency color coding

---

## Phase 2: ABDM & Records Integration ✅ COMPLETE (3-4 hours)
**Priority:** High
**Goal:** Connect health records and consent management

### 2.1 Records Page - ABDM Integration ✅ COMPLETE

**Fix Required:**
- [x] ABHA linking flow via `/api/auth/login` with ABHA OAuth
- [x] Fetch real consents from `/api/abdm/consent/request`
- [x] Display actual health records (if consented)
- [x] Implement consent grant/revoke actions

**Completed:**
- ✅ Created `lib/hooks/useABDM.ts` with all ABDM operations
- ✅ Real ABHA linking functionality
- ✅ Dynamic consent fetching and display
- ✅ Working revoke consent with API integration
- ✅ Access history panel with real data
- ✅ Consent badges showing live status

---

### 2.2 Profile Page - Auth & ABHA Linking ✅ COMPLETE

**Fix Required:**
- [x] Display real user from auth context
- [x] ABHA linking button with OAuth flow
- [x] Persist language/notification preferences
- [x] Real security settings (change password, 2FA)

**Completed:**
- ✅ Profile displays real user data from auth context
- ✅ ABHA linking dialog with proper validation
- ✅ Language preference updates working
- ✅ All user data dynamic (no hardcoded values)

---

## Phase 3: Care Finder & UHI Integration ✅ COMPLETE (3-4 hours)
**Priority:** Medium-High
**Goal:** Connect hospital/PHC search and booking

### 3.1 Care Finder Page - Maps & Location ✅ COMPLETE

**Fix Required:**
- [x] Get user's real location via Geolocation API
- [x] Call `/api/location/phc/search` for nearby facilities
- [x] Integrate Google Maps for visualization
- [x] Real-time facility data with wait times

**Completed:**
- ✅ Created `lib/hooks/useLocation.ts` with Geolocation API
- ✅ Real facility search from `/api/location/phc/search`
- ✅ Location permission handling with error states
- ✅ Distance calculation and sorting
- ✅ Emergency mode with reduced search radius

---

### 3.2 Care Finder Page - UHI Booking ✅ COMPLETE

**Fix Required:**
- [x] Implement UHI discovery flow
- [x] Show available slots and providers
- [x] Booking confirmation with payment (mock for hackathon)

**Completed:**
- ✅ Created `components/features/care-finder/BookingModal.tsx`
- ✅ Slot selection UI with doctor names
- ✅ Patient details form with validation
- ✅ Booking confirmation with UHI API integration
- ✅ Success state with booking ID

---

## Phase 4: RAG & Health Guides ✅ COMPLETE (2-3 hours)
**Priority:** Medium
**Goal:** Connect clinical guidelines and search

### 4.1 Guides Page - RAG Integration ✅ COMPLETE

**Fix Required:**
- [x] Fetch guidelines from `/api/rag/guidelines`
- [x] Implement real search via `/api/rag/search`
- [x] Display 12 seeded conditions dynamically
- [x] Regional health alerts based on location

**Completed:**
- ✅ Created `lib/hooks/useRAG.ts` with search functionality
- ✅ Dynamic guideline fetching from backend
- ✅ Debounced semantic search
- ✅ Full guideline detail modal with symptoms, causes, prevention
- ✅ Severity badges and regional information

---

### 4.2 Connect Triage to RAG ✅ COMPLETE

**Fix Required:**
- [x] After triage result, search RAG for related conditions
- [x] Show "Learn More" cards for suspected conditions
- [x] Link to detailed guides page

**Completed:**
- ✅ Related guides fetched after triage result
- ✅ Cards link to Guides page with search query
- ✅ Similarity score displayed
- ✅ Severity indicators on guide cards

**Files to modify:**
- `app/care-finder/page.tsx` (add booking modal)
- Create `components/features/care-finder/BookingModal.tsx`

**API Endpoints to use:**
```typescript
// Discover available services
POST /api/uhi/discovery
{
  intent: {
    fulfillment: {
      type: "Teleconsultation" | "PhysicalConsultation"
    }
  },
  location: { gps: "28.6139,77.2090" }
}

// Select a specific provider
POST /api/uhi/select
{ providerId: "...", serviceId: "...", slotId: "..." }

// Confirm booking
POST /api/uhi/confirm
{ transactionId: "...", patientDetails: {...} }
```

---

## Phase 4: RAG & Health Guides (2-3 hours)
**Priority:** Medium
**Goal:** Connect clinical guidelines and search

### 4.1 Guides Page - RAG Integration (2 hours)

**Problem:** `guides/page.tsx` has completely static content:
- 12 hardcoded topic cards
- 4 hardcoded featured guides
- Search doesn't work

**Fix Required:**
- [ ] Fetch guidelines from `/api/rag/guidelines`
- [ ] Implement real search via `/api/rag/search`
- [ ] Display 12 seeded conditions dynamically
- [ ] Regional health alerts based on location

**Files to modify:**
- `app/guides/page.tsx` (major rewrite)
- Create `lib/hooks/useRAG.ts`

**API Endpoints to use:**
```typescript
// List all guidelines
GET /api/rag/guidelines

// Search guidelines
POST /api/rag/search
{
  query: "dengue symptoms treatment",
  topK: 5,
  minSimilarity: 0.5
}

// Get specific guideline
GET /api/rag/guidelines/{id}
```

---

### 4.2 Connect Triage to RAG (1 hour)

**Problem:** Triage doesn't show related health guides after diagnosis.

**Fix Required:**
- [ ] After triage result, search RAG for related conditions
- [ ] Show "Learn More" cards for suspected conditions
- [ ] Link to detailed guides page

**Files to modify:**
- `app/triage/page.tsx` (add RAG integration after result)

**API Endpoints to use:**
```typescript
// After triage shows "Dengue Fever"
POST /api/rag/search
{ query: "Dengue Fever", topK: 3 }
```

---

## Summary: Files to Create/Modify

### New Files to Create:
```
lib/
├── context/
│   └── AuthContext.tsx       # Auth provider
├── hooks/
│   ├── useAuth.ts            # Auth hook
│   ├── useABDM.ts            # ABDM operations hook
│   ├── useLocation.ts        # Geolocation hook
│   └── useRAG.ts             # RAG search hook
components/
└── features/
    └── care-finder/
        └── BookingModal.tsx  # UHI booking modal
```

### Files to Modify:
```
components/
├── providers/Providers.tsx         # Add auth provider
├── layout/AppLayout.tsx            # Use real auth
├── shared/EmergencyFAB.tsx         # Add emergency routing
└── features/home/HomeFeatures.tsx  # Real data

app/
├── page.tsx                        # Home with real data
├── triage/page.tsx                 # Voice + RAG integration
├── records/page.tsx                # ABDM consent integration
├── care-finder/page.tsx            # Maps + UHI integration
├── guides/page.tsx                 # RAG guidelines
└── profile/page.tsx                # Real auth + settings
```

---

## Quick Wins (Can Do in 30 mins each)

1. **Auth Context** - Create basic auth provider with demo mode
2. **Home Page Data** - Connect to existing session API
3. **Guides Search** - Connect to existing RAG search
4. **Emergency FAB** - Add tel: link for 112

---

## What's Already Working (Don't Touch)

1. ✅ `/api/agent/triage` - Gemini 2.5 Pro triage
2. ✅ `/api/rag/guidelines` - 12 clinical guidelines seeded
3. ✅ `/api/location/phc/search` - Google Maps PHC search
4. ✅ `/api/uhi/*` - UHI discovery/booking (mock mode)
5. ✅ `/api/abdm/*` - ABDM M1/M2/M3 (mock mode)
6. ✅ `/api/voice/*` - STT/TTS working
7. ✅ `/api/health` - Health check passing

---

## Estimated Timeline

| Phase | Time | Priority | Description |
|-------|------|----------|-------------|
| **Phase 1** | 4-5 hours | 🔴 Critical | Auth, Home, Triage voice, Emergency |
| **Phase 2** | 3-4 hours | 🟠 High | Records ABDM, Profile auth |
| **Phase 3** | 3-4 hours | 🟡 Medium-High | Care Finder maps, UHI booking |
| **Phase 4** | 2-3 hours | 🟢 Medium | Guides RAG, Triage+RAG |
| **Total** | **12-16 hours** | | |

---

## Recommended Order for Hackathon Demo

If you have limited time, focus on this order:

1. **Phase 1.1** - Auth Context (makes everything else easier)
2. **Phase 1.3** - Triage Voice (impressive demo feature)
3. **Phase 3.1** - Care Finder Maps (visual wow factor)
4. **Phase 2.1** - Records ABDM (shows India Stack integration)
5. **Phase 4.1** - Guides RAG (shows AI knowledge base)

**Minimum Viable Demo (4 hours):**
- Auth context working
- Triage with server-side voice
- Care finder with real Google Maps

**Full Demo (12 hours):**
- All 4 phases complete
- End-to-end user journey working

---

## Mock Mode for Hackathon

Your `.env.local` already has:
```
MOCK_ABDM_RESPONSES=true
MOCK_UHI_RESPONSES=true
```

This means ABDM and UHI will return realistic mock data without needing real credentials. **Keep this enabled for hackathon reliability.**

---

*Generated: 2026-03-26*
*Vaidya-Agent Frontend Integration Analysis*
