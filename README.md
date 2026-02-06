
# SmashX - The Badminton Arena

SmashX is a social platform designed for close friend groups to organize, book, and gamify their badminton sessions. It transforms a casual meetup into a competitive "Arena" experience.

---

## 1. Why? (The Motivation)

Managing sports sessions with friends often suffers from three main friction points: **Organization**, **Gamification**, and **Finance**.

### The Problem
*   **Chaos in Scheduling:** Relying on long chat threads to confirm attendance ("Who is coming?").
*   **Lack of Stakes:** Casual games are fun, but tracking progress, win rates, and rivalries manually is tedious.
*   **Financial Ambiguity:** Calculating court costs + shuttlecocks used and splitting them fairly (especially when some people play more than others) is a headache.

### The Solution
SmashX solves this by creating a **Digital Arena**:
*   **Social Commitment:** A dedicated space to "Check In" creates a stronger social contract than a WhatsApp message.
*   **The "Elo" Addiction:** We introduced a Ranking Point (RP) system. Every match counts. Winning grants points, losing deducts them. This adds a layer of adrenaline to every game.
*   **Transparent Billing:** The host inputs the costs, and the app calculates exactly what each player owes based on logic (Equal Split or Weighted by Matches Played).

---

## 2. What Framework? (The Tech Stack)

The project is built using a modern, high-performance web stack designed for "App-like" behavior in the browser (PWA).

### Frontend
*   **React (v19):** Utilizing the latest features for state management and rendering.
*   **Vite:** For lightning-fast development and optimized production builds.
*   **TypeScript:** Ensures type safety across the complex data models (Users, Sessions, Matches, Bills).
*   **Tailwind CSS:** Used for a "SaaS-Clean" aesthetic with a custom design system based on Neon Green (`#00FF41`) and Deep Navy (`#000B29`).

### Backend & Data
*   **Supabase:**
    *   **PostgreSQL:** Relational database to store complex relationships between Users, Sessions, and Matches.
    *   **Realtime:** Subscriptions are used to instantly sync session data (like scores or court assignments) across all devices in the venue without refreshing.
    *   **Auth:** Secure authentication for player profiles.

### AI & Utilities
*   **Google Gemini (GenAI):** Used to parse natural language text (e.g., pasted from a chat group) into structured Session data (Date, Time, Location).
*   **Lucide React:** For consistent, high-quality iconography.
*   **HTML-to-Image:** Generates shareable "Instagram-ready" score reports.

---

## 3. How? (Architecture & Logic)

The application follows a **Modular Component Architecture** with a heavy emphasis on **Optimistic UI** and **Data Integrity**.

### A. The "Safety Fetch" Pattern
One of the critical challenges in a sports venue is spotty internet connection.
1.  **Action:** A user records a match result.
2.  **Optimistic Update:** The UI updates immediately to reflect the win/loss and RP change, providing instant feedback.
3.  **Background Sync:** The app silently fetches the *latest* server state to ensure no other matches were recorded in the split second prior.
4.  **Merge & Save:** It appends the new data to the verified server state and pushes it back. This prevents "Stale State Overwrites" where one user's laggy phone accidentally deletes match history.

### B. The Ranking System (RP)
The logic mimics competitive video games:
*   **Base:** Everyone starts at 1,000 RP.
*   **Delta:** Matches typically award +/- 25 points.
*   **Tiers:** Visual frames change dynamically based on points:
    *   *Unpolished (<1100)* -> *Spark* -> *Flow* -> *Combustion* -> *Prism* -> *Void* -> *Ascended (>3000)*.
*   **Visuals:** Advanced CSS animations (`keyframes`) are used to render glowing, burning, or glitching effects around avatars based on their tier.

### C. Session State Management
A `Session` object is the core data model. It transitions through states:
1.  **Open:** Players can join/leave. Host can edit details using the **Edit Session** feature.
2.  **Live (Playing):**
    *   **Check-in:** Players mark themselves as "present".
    *   **Court Assignment:** The host assigns 4 players to a court.
    *   **Smart Suggestions:** The app suggests players who haven't played recently to ensure fair rotation.
3.  **Ended:** The session is locked. Financials are calculated via the Bill Calculator.

### D. User Experience (UX)
*   **Haptic Feedback:** The `navigator.vibrate` API is used extensively to give physical feedback on buttons, scoring, and errors, making the web app feel native.
*   **PWA:** The app includes a `manifest.json` and service worker logic to be installable on iOS and Android, removing browser chrome for an immersive experience.

## Project Structure

```text
/
├── components/         # UI Bricks (Modals, Cards, Lists)
│   ├── SessionDetailModal.tsx  # The core game loop UI
│   ├── Leaderboard.tsx         # Stats and rankings
│   └── ...
├── services/           # External API interactions
│   ├── supabaseClient.ts
│   └── geminiService.ts
├── types.ts            # TypeScript interfaces (User, Session, Bill)
├── utils.ts            # Helper logic (Date formatting, RP calc, Haptics)
├── App.tsx             # Main routing and global state logic
└── index.html          # Entry point & Global CSS Animations
```
