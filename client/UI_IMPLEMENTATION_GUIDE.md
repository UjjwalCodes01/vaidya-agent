# Vaidya UI Implementation Guide

## 🎯 Implementation Status

### ✅ Completed Components

1. **Shared Components** (`components/shared/`)
   - `EmergencyFAB.tsx` - Fixed emergency button with pulse animation
   - `TrustSignals.tsx` - ABHA/language/consent status badges
   - `BottomNav.tsx` - Main navigation with 5 tabs
   - `VoiceWaveform.tsx` - Animated waveform for voice interaction
   - `ConsentBadge.tsx` - Health record consent indicators
   - `StatusCard.tsx` - Reusable health information cards

2. **Layout** (`components/layout/`)
   - `AppLayout.tsx` - Main wrapper with header, nav, and emergency FAB

3. **Pages** (`app/`)
   - `page.tsx` (Home) - ✅ Fully implemented
   - `triage/page.tsx` - ✅ Fully implemented

### 🚧 To Be Implemented

4. **Records Page** (`app/records/page.tsx`)
5. **Care Finder Page** (`app/care-finder/page.tsx`)
6. **Health Guides Page** (`app/guides/page.tsx`)
7. **Profile Page** (`app/profile/page.tsx`)

---

## 📁 Complete File Structure

```
client/
├── app/
│   ├── layout.tsx (root layout)
│   ├── page.tsx (Home - ✅ Done)
│   ├── triage/
│   │   └── page.tsx (✅ Done)
│   ├── records/
│   │   └── page.tsx (🚧 TODO)
│   ├── care-finder/
│   │   └── page.tsx (🚧 TODO)
│   ├── guides/
│   │   └── page.tsx (🚧 TODO)
│   └── profile/
│       └── page.tsx (🚧 TODO)
│
├── components/
│   ├── shared/ (✅ All done)
│   │   ├── EmergencyFAB.tsx
│   │   ├── TrustSignals.tsx
│   │   ├── BottomNav.tsx
│   │   ├── VoiceWaveform.tsx
│   │   ├── ConsentBadge.tsx
│   │   ├── StatusCard.tsx
│   │   └── index.ts
│   │
│   ├── layout/ (✅ Done)
│   │   ├── AppLayout.tsx
│   │   └── index.ts
│   │
│   └── features/ (Specific components for each page)
│       ├── home/
│       │   └── HomeFeatures.tsx (✅ Done)
│       ├── triage/
│       ├── records/
│       ├── care-finder/
│       ├── guides/
│       └── profile/
```

---

## 🎨 Design System Summary

### Colors
- **Primary**: Blue (#3b82f6)
- **Success**: Green (#10b981)
- **Warning**: Yellow/Amber (#f59e0b)
- **Error**: Red (#ef4444)
- **Emergency**: Red-600 (#dc2626)

### Typography
- **Headings**: font-bold, text-lg to text-2xl
- **Body**: text-sm to text-base
- **Icons**: text-2xl to text-4xl emoji

### Spacing
- **Cards**: p-4 md:p-6
- **Sections**: space-y-4 to space-y-6
- **Gaps**: gap-2 to gap-4

### Components
- **Rounded corners**: rounded-lg (standard), rounded-full (buttons)
- **Shadows**: shadow-sm (cards), shadow-lg (elevated), shadow-2xl (FAB)
- **Transitions**: transition-all duration-200
- **Focus rings**: focus:ring-2 focus:ring-blue-500

---

## 📄 Page Templates

### Records Page Template

```typescript
'use client';

import { AppLayout } from '@/components/layout';
import { ConsentBadge, StatusCard } from '@/components/shared';

export default function RecordsPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ABHA Wallet Summary */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">ABHA Wallet</h2>
          <p className="text-green-100">Link your ABHA to access health records</p>
          <button className="mt-4 bg-white text-green-700 px-4 py-2 rounded-lg font-medium">
            Link ABHA →
          </button>
        </div>

        {/* Consent Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Data Sharing & Consent</h3>
          <ConsentBadge status="granted" grantedTo="Apollo Hospital" />
        </div>

        {/* Medical Timeline */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Medical History</h3>
          <div className="space-y-4">
            {/* Timeline items */}
            <TimelineItem 
              date="March 20, 2026"
              type="Visit"
              title="Consultation with Dr. Sharma"
              facility="Apollo Hospital"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <FilterChip label="All" active />
          <FilterChip label="Prescriptions" />
          <FilterChip label="Diagnostics" />
          <FilterChip label="Visits" />
        </div>
      </div>
    </AppLayout>
  );
}
```

### Care Finder Page Template

```typescript
'use client';

import { AppLayout } from '@/components/layout';
import { useState } from 'react';

export default function CareFinderPage() {
  const [emergencyMode, setEmergencyMode] = useState(false);

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Map View */}
        <div className="flex-1 bg-gray-300 relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            🗺️ Map View (Integrate Google Maps)
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 border-t">
          <input 
            type="text"
            placeholder="Search hospitals, PHCs, specialists..."
            className="w-full px-4 py-2 rounded-lg border"
          />
          <div className="flex gap-2 mt-3">
            <FilterChip label="🏥 Hospitals" />
            <FilterChip label="🏛️ PHC" />
            <FilterChip label="👨‍⚕️ Specialists" />
          </div>
        </div>

        {/* Facility Cards (Scrollable) */}
        <div className="bg-white dark:bg-gray-800 border-t overflow-y-auto max-h-64">
          <FacilityCard 
            name="Apollo Hospital"
            distance="2.5 km"
            waitTime="20 min"
            available={true}
          />
        </div>
      </div>
    </AppLayout>
  );
}
```

### Health Guides Page Template

```typescript
'use client';

import { AppLayout } from '@/components/layout';

export default function GuidesPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <input 
          type="text"
          placeholder="Search symptoms or topics..."
          className="w-full px-4 py-3 rounded-lg border"
        />

        {/* Local Alert Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-1">
            This Week in Noida
          </h3>
          <p className="text-sm text-amber-800">
            Dengue cases rising - preventive measures recommended
          </p>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <TopicCard icon="🤒" label="Fever" />
          <TopicCard icon="😷" label="Cough & Cold" />
          <TopicCard icon="👶" label="Child Care" />
          <TopicCard icon="💪" label="Injuries" />
          <TopicCard icon="👩" label="Women's Health" />
          <TopicCard icon="💊" label="Medications" />
        </div>

        {/* AI Summary Cards */}
        <div className="space-y-4">
          <GuideCard 
            title="Dengue Fever Guide"
            points={[
              "Symptoms: High fever, body ache, rash",
              "Action: Hydrate, rest, monitor platelet count",
              "Seek care: If bleeding or severe pain"
            ]}
          />
        </div>
      </div>
    </AppLayout>
  );
}
```

### Profile Page Template

```typescript
'use client';

import { AppLayout } from '@/components/layout';

export default function ProfilePage() {
  return (
    <AppLayout showNav={true} showEmergencyFAB={true}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Identity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold">User Name</h2>
              <p className="text-sm text-gray-600">user@example.com</p>
            </div>
          </div>
        </div>

        {/* ABHA Management */}
        <Section title="ABHA Account">
          <div className="flex items-center justify-between">
            <span>Status: Not Linked</span>
            <button className="text-blue-600 hover:underline">Link Now →</button>
          </div>
        </Section>

        {/* Language Settings */}
        <Section title="Language & Region">
          <select className="w-full px-4 py-2 rounded-lg border">
            <option>English</option>
            <option>हिंदी (Hindi)</option>
            <option>ಕನ್ನಡ (Kannada)</option>
          </select>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle label="Health alerts" />
          <Toggle label="Appointment reminders" />
          <Toggle label="Medication reminders" />
        </Section>

        {/* Privacy */}
        <Section title="Privacy & Consent">
          <button className="text-blue-600 hover:underline">
            Manage consent settings →
          </button>
        </Section>

        {/* Accessibility */}
        <Section title="Accessibility">
          <Toggle label="Large text" />
          <Toggle label="High contrast" />
          <Toggle label="Screen reader" />
        </Section>

        {/* Logout */}
        <button className="w-full bg-red-600 text-white py-3 rounded-lg font-medium">
          Logout
        </button>
      </div>
    </AppLayout>
  );
}
```

---

## 🚀 Next Steps

### 1. Complete Remaining Pages (Priority)
```bash
# Create these files:
app/records/page.tsx
app/care-finder/page.tsx  
app/guides/page.tsx
app/profile/page.tsx
```

### 2. Add API Integration
- Connect triage page to `/api/voice/triage`
- Integrate ABHA APIs in records
- Connect UHI for care finder booking
- Integrate RAG for health guides

### 3. Add Real Features
- Voice recording functionality (Web Speech API or GCP Speech)
- Map integration (Google Maps API)
- Real-time health data from Firestore
- OAuth authentication flow

### 4. Testing & Refinement
```bash
# Run these commands:
npm run typecheck
npm run lint
npm run build
npm run dev
```

### 5. Accessibility Improvements
- Add ARIA labels
- Test keyboard navigation
- Add screen reader support
- Test with Hindi/regional languages

---

## 📚 Key Features Summary

| Page | Status | Key Features |
|------|--------|--------------|
| Home | ✅ Done | Welcome, quick actions, health alerts, ABHA status |
| Triage | ✅ Done | Voice waveform, transcript, mic button, AI analysis |
| Records | 🚧 TODO | Timeline, consent badges, ABHA wallet, filters |
| Care Finder | 🚧 TODO | Map view, facility cards, emergency mode, UHI booking |
| Health Guides | 🚧 TODO | Search, local alerts, symptom cards, AI summaries |
| Profile | 🚧 TODO | ABHA management, language, privacy, accessibility |

---

## 🎯 Global UX Principles Applied

✅ **Emergency FAB** - Always visible on every page
✅ **Bottom Nav** - Persistent 5-tab navigation  
✅ **Trust Signals** - ABHA/consent/language in header
✅ **Large Tap Targets** - min 44x44px for touch
✅ **Icon + Text** - Never icons alone
✅ **No Hidden Actions** - Primary actions always visible
✅ **High Readability** - Large fonts, high contrast

---

## 💡 Usage Example

```typescript
import { AppLayout } from '@/components/layout';
import { EmergencyFAB, StatusCard, TrustSignals } from '@/components/shared';

export default function MyPage() {
  return (
    <AppLayout>
      {/* Your page content */}
      <StatusCard title="Health Status" icon="❤️" status="success">
        All systems operational
      </StatusCard>
    </AppLayout>
  );
}
```

---

Generated: 2026-03-26
Status: Foundation Complete - Ready for Full Implementation
