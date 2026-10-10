# Pulse Buddy — Avatar Reminder Platform

Pulse Buddy is a production-quality, cross-platform personal reminder platform centered on animated avatar companions. Instead of static, easily missed notifications, Pulse Buddy brings an animated digital companion onto your desktop or browser when a reminder becomes due.

---

## 🌟 Key Features

1. **Animated Desktop Avatar Companions**
   - When a reminder triggers, a transparent, frameless, always-on-top companion window appears smoothly near your screen corner.
   - Built-in character rigs:
     - 🐧 **Pip the Penguin** (Animal): Waddles, sips water, and celebrates hydration goals.
     - 🤖 **Dr. Robo** (Robot): Hover thrusters, heart rate monitor, LED emotion eyes, and antenna chimes.
     - 🧘 **Maya the Yogi** (Human): Mindful breathing, posture resets, and eye relief breaks.
     - 🚀 **Sparky Rover** (Vehicle): Bouncy spring suspension and rocket booster celebrations.
     - 🐉 **Ember the Dragon** (Fantasy): Warm sparkle puffs and bedtime routines.
     - 👨‍🚀 **Cosmo the Spacewalker** (Sci-fi): Zero-G bobbing and celebratory thumbs-ups.

2. **Desktop Background Engine (Windows & macOS)**
   - Closing the main dashboard window hides to the system tray (`closeToTray: true` by default).
   - The background scheduler continues checking due reminders every 5 seconds.
   - Automatic catch-up policy after system sleep or restart: handles missed reminders without popup bombarding.
   - Quiet Hours support with midnight span calculations.
   - Configurable "Launch at Login" via OS integration.
   - Explicit "Quit Completely" option in the tray menu to cleanly terminate background tasks.

3. **Custom Avatar Studio (Essential Feature)**
   - **Step 1: Creation Mode**: Upload still image, transparent animated file, green-screen video, or generate with AI prompt.
   - **Step 2: Practical Guidance**: Rules on framing, lighting, full body visibility, and uniform `#00FF00` green background.
   - **Step 3: AI Prompt Generator**: Interactive character wizard generating ready-to-copy prompts tailored for Google Flow, Runway, and Midjourney, including solid RGB(0, 255, 0) chroma-key templates.
   - **Step 4: Real-Time Chroma-Key Engine**: Hardware-accelerated WebGL shader and Canvas 2D pipeline stripping green backgrounds with live similarity, smoothness, and despill sliders on a checkerboard preview.

4. **Multi-Category Habit & Reminder Scheduling**
   - 12 built-in daily activity categories:
     1. Hydration & Water Breaks
     2. Medication & Health Supplements (with clear medical disclaimer)
     3. Meals & Nourishment
     4. Exercise & Movement
     5. Eye Breaks & Posture Reset
     6. Studying & Revision
     7. Work Tasks & Focus Sessions
     8. Appointments & Meetings
     9. Daily Habits & Goals
     10. Sleep Routines
     11. Household Tasks
     12. Personal & Custom Reminders
   - Recurrence engines: Interval (every X minutes), Daily at HH:mm, Weekly on selected days, and One-Time.
   - Interactive actions: Done (celebration & streak record), Snooze (5m/10m/15m/30m), Dismiss, and Open Dashboard.

5. **Habit Analytics & Verified Streaks**
   - Accurate contiguous day streak calculation.
   - Verified completion rates and category breakdown charts.
   - Activity log with full history persistence.

6. **Cross-Device Cloud Sync (Supabase Ready) & Local-First Persistence**
   - Desktop: Persistent store JSON in Electron `userData` directory.
   - Web: LocalStorage & IndexedDB with PWA service worker offline caching.
   - Supabase schema included with Row Level Security (RLS) for multi-device sync.

---

## 🏗️ Architecture

```
pulse-buddy/
├── apps/
│   ├── desktop/             # Electron main process, tray, companion window, background scheduler
│   └── web/                 # Responsive React 18, Vite, Tailwind CSS, PWA
├── packages/
│   ├── shared-types/        # Core TypeScript models, IPC bridge interfaces
│   ├── core/                # Recurrence engine, quiet hours, habit analytics, sync logic
│   ├── avatar/              # State machine, WebGL chroma-key shader, AI prompt wizard, library
│   ├── ui/                  # Web Audio synthesizer, AvatarRenderer rigs, CompanionBubble
│   └── platform/            # Platform abstraction (BrowserPlatformAdapter vs DesktopPlatformAdapter)
└── tests/                   # Automated Vitest test suites
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
npm install
```

### Running the Web Application
```bash
npm run dev
# Opens at http://localhost:5173
```

### Running the Desktop Application in Development
```bash
npm run dev:desktop
# Starts the Vite dev server and launches Electron with live reload and background tray
```

### Running Automated Tests
```bash
npm test
```

### Packaging Desktop Installers
- **Windows (NSIS installer .exe)**:
  ```bash
  npm run package:win
  ```
- **macOS (DMG package)**:
  ```bash
  npm run package:mac
  ```

---

## 🔒 Security & Reliability

- **Context Isolation**: Main Electron window and companion overlay run with `contextIsolation: true` and `nodeIntegration: false`.
- **Preload IPC Bridge**: Narrowly scoped, typed channels in `preload.ts` preventing arbitrary renderer access to native APIs.
- **Audio Autoplay**: Synthetic Web Audio oscillators gracefully handle autoplay restrictions.
- **Offline First**: All reminder evaluations, audio effects, and companion overlays function 100% offline without network dependency.
