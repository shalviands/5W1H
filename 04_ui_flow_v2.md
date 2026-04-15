# Antigravity — UI Flow v2.0
## Dashboard-Integrated · INCUBX Platform

---

## DESIGN PRINCIPLE

Antigravity is not a standalone app. It lives inside the INCUBX project dashboard as a dedicated tab or panel. The UI must feel native to the existing platform — not like an embedded foreign tool.

```
INCUBX Dashboard
└── Project: [Project Name]
    ├── Overview
    ├── Team
    ├── Milestones
    ├── Reports
    └── Problem Discovery  ← ANTIGRAVITY LIVES HERE
        ├── Sessions
        ├── Active Session
        ├── Insight Log
        ├── Patterns
        └── Mind Map
```

---

## ENTRY POINT — PROJECT DASHBOARD TAB

**Location:** Inside an existing INCUBX project page, as a new tab "Problem Discovery"

**Who sees it:**
- Founders & students: full access to their project
- Mentors: view + comment on assigned cohort sessions
- Admins: full access across all sessions

**Tab states:**
- `No sessions yet` → shows CTA to start first session
- `Active session` → shows resume button + progress summary
- `Sessions exist` → shows session list with status badges

---

## SCREEN 1 — SESSION DASHBOARD (Entry)

**Route:** `/projects/:project_id/discovery`

```
┌─ INCUBX Nav ─────────────────────────────────────────────────┐
│  Project: AgriTrack  /  Problem Discovery                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Problem Discovery                 [ + New Session ]         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ACTIVE SESSION                              [Resume]│    │
│  │  Cold chain logistics · Team: 3 members              │    │
│  │  Progress: WHO ✓ WHAT ✓ WHY → WHEN ○ WHERE ○ HOW ○  │    │
│  │  14 insights captured · Last active: 2 hours ago     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  Past Sessions                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Supply chain bottlenecks · Completed · Mind Map ↗  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Components:**
- Active session card (if exists) with progress pills + Resume button
- Past sessions list with status badge + mind map link
- "New Session" button → opens setup modal (Screen 2)

---

## SCREEN 2 — NEW SESSION SETUP (Modal)

**Trigger:** Clicking "+ New Session"
**Type:** Overlay modal on top of dashboard — not a full page

```
┌─────────────────────────────────────────────┐
│  Start Problem Discovery Session        [×] │
├─────────────────────────────────────────────┤
│                                             │
│  Problem Domain *                           │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Session Type                               │
│  ○ Individual  ● Team  ○ Mentor-assisted    │
│                                             │
│  Invite Team Members                        │
│  [Aarav ✓] [Priya ✓] [Rohan ○]             │
│  (Pre-populated from team roster)           │
│                                             │
│  Stakeholders (Who are you designing for?)  │
│  [+ Farmer] [+ Distributor] [+ Add...]      │
│                                             │
│  Language Preference                        │
│  ○ English  ○ Hindi  ● Mixed (Hinglish)     │
│                                             │
│  [ Cancel ]          [ Begin Discovery → ]  │
└─────────────────────────────────────────────┘
```

**UX Rules:**
- Team members pre-populated from existing INCUBX team — no manual entry
- Problem domain required (min 10 chars)
- At least 1 stakeholder required
- Session type defaults to "Team" if multiple members selected
- "Begin Discovery" → creates session via API → transitions to Screen 3

---

## SCREEN 3 — DISCOVERY INTERVIEW (Full Panel)

**Route:** `/projects/:project_id/discovery/:session_id`
**Layout:** Split panel — chat left, live insight log right (collapsible on mobile)

```
┌─ INCUBX Nav ─────────────────────────────────────────────────┐
│  AgriTrack / Problem Discovery / Session #2                   │
├──────────────────────────────┬────────────────────────────────┤
│  DISCOVERY CHAT              │  LIVE INSIGHT LOG              │
│                              │                                 │
│  Dimensions:                 │  14 captured  4/6 dims          │
│  WHO✓ WHAT✓ WHY→ WHEN○ ...  │  Filter: [All ▾] [All dims ▾]  │
│  ─────────────────────────  │  ─────────────────────────────  │
│                              │  [Aarav][Farmer][WHY][×3]       │
│  [AI] You mentioned          │  "No one tracks the trucks"     │
│  transport delays happen     │                                 │
│  weekly. Why does this       │  [Priya][Dist.][WHY][×1]        │
│  keep repeating?             │  "No one tracks the trucks"     │
│                              │  ↑ same cluster — HIGH signal   │
│  [Aarav] Because no one      │                                 │
│  tracks the trucks. We       │  [Aarav][Farmer][HOW][×2]       │
│  just call and hope.         │  "Call driver every hour"       │
│                              │                                 │
│  ────────────────────────    │  🔴 HIGH ×4                     │
│  Speaking as: [Farmer ▾]     │  🟡 MED ×6                      │
│  ┌─────────────────────┐    │  🟢 LOW ×4                      │
│  │ Type response...    │    │                                 │
│  │              [Send] │    │  [ View Patterns → ]            │
│  └─────────────────────┘    │                                 │
│                              │                                 │
│  [Aarav] speaking as Farmer  │                                 │
│  ↗ Captured · WHY · HIGH ✓  │                                 │
└──────────────────────────────┴────────────────────────────────┘
```

**Left panel — Chat:**
- AI messages stream token-by-token (SSE)
- User messages tagged with avatar + name
- Stakeholder selector persists across turns (defaults to last used)
- Capture confirmation: subtle inline "↗ Captured · [dimension] · [signal]"
- Dimension tracker bar always visible at top
- "Pause Session" in header → saves state, returns to Screen 1

**Right panel — Live Log:**
- Appends in real-time as insights are captured
- Filter by dimension, stakeholder, signal, user
- Insight cards are read-only (append-only)
- Same insight from 2+ users shows "↑ same cluster" tag
- Collapsible on tablet/mobile (toggle button)

**Multi-user indicator:**
- When another team member is actively typing: "[Priya is contributing...]"
- Role badge on each message: founder / student / mentor (distinct colours)
- Mentor messages have subtle left border accent

---

## SCREEN 4 — PATTERN VIEW

**Route:** `/projects/:project_id/discovery/:session_id/patterns`
**Access:** "View Patterns" button from Screen 3, or tab in session header

```
┌─ INCUBX Nav ──────────────────────────────────────────────────┐
│  AgriTrack / Discovery / Session #2 / Patterns                 │
├───────────────────────────────────────────────────────────────┤
│  ClusterAgent · last run 3 min ago          [ Re-analyse ]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🔴 Transport tracking gap                             │  │
│  │  5 insights · 3 contributors · WHY dimension           │  │
│  │  Aarav (Farmer) · Priya (Dist.) · Rohan (Retailer)    │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  [Aarav][×3] "No one tracks the trucks"               │  │
│  │  [Priya][×1] "No one tracks the trucks"               │  │
│  │  [Rohan][×1] "We never know when deliveries arrive"   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ⚡ DIVERGENCE: Frequency perception                    │  │
│  │  Aarav says "daily problem" · Rohan says "weekly"      │  │
│  │  Both views preserved — explore with team              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Coverage                                                     │
│  WHO ████████ ✓   WHAT ██████░░ ✓   WHY ████████ ✓          │
│  WHEN ░░░░░░░░ ○   WHERE ░░░░░░░░ ○   HOW ████░░░░ →         │
│                                                               │
│  [ ← Continue Interview ]    [ Generate Mind Map → ]         │
└───────────────────────────────────────────────────────────────┘
```

**Components:**
- Cluster cards (expandable to show raw insights)
- Divergence cards (highlighted differently — amber border)
- Coverage bar per dimension
- "Generate Mind Map" enabled only when ≥ 2 HIGH/MED clusters exist

---

## SCREEN 5 — MIND MAP OUTPUT

**Route:** `/projects/:project_id/discovery/:session_id/mindmap`

```
┌─ INCUBX Nav ──────────────────────────────────────────────────┐
│  AgriTrack / Discovery / Session #2 / Mind Map                 │
│                                    [ Export MD ] [ Share ]    │
├─────────────────────────────┬─────────────────────────────────┤
│  MIND MAP                   │  INSIGHT REPORT                  │
│                             │                                  │
│  Cold chain logistics       │  Signal Summary                  │
│  ├── WHY 🔴 ×5              │  ──────────────────────────     │
│  │   ├── Transport gap      │  Transport gap · ×5 · 3 users   │
│  │   │   ├─[Aarav×3]"..."   │  Comm. breakdown · ×4 · 2 users │
│  │   │   └─[Priya×1]"..."   │  Seasonal issue · ×2 · 1 user   │
│  ├── HOW 🟡 ×4              │                                  │
│  │   └── Workarounds        │  Opportunity Gaps               │
│  │       └─[Aarav×2]"..."   │  ──────────────────────────     │
│  ├── WHEN 🟢 ×2             │  1. Real-time tracking          │
│  └── ⚡ Divergence: WHEN     │     → workaround: calls ×4      │
│      ├─[Aarav] "daily"      │  2. Structured comms layer      │
│      └─[Rohan] "weekly"     │     → workaround: WhatsApp ×3   │
│                             │                                  │
│                             │  Coverage                        │
│                             │  4/6 dims explored              │
│                             │  WHEN + WHERE need more work    │
└─────────────────────────────┴─────────────────────────────────┘
│  [ Export Markdown ]  [ Continue Discovery ]  [ Share with Mentor ] │
└───────────────────────────────────────────────────────────────┘
```

**Share with Mentor:** sends notification to assigned mentor via INCUBX notification system — not a separate email link.

---

## ERROR STATES

| Situation | UI Behaviour |
|---|---|
| Agent API failure mid-turn | Show inline error banner: "Something went wrong. Your message was saved — tap to retry." Session data preserved. |
| OpenRouter model unavailable | Transparent fallback to next model. User sees nothing. |
| Session conflict (two users submit simultaneously) | Both captured. Sequence determined by server timestamp. No UI collision. |
| Session idle > 10 minutes | Auto-pause. On next load: "Your session was paused. Resume?" |
| Network loss during typing | Input preserved in localStorage. On reconnect: "You were offline. Reconnected — your message is ready to send." |
| ClusterAgent times out | Show: "Pattern analysis is taking longer than usual — continue the interview while we process." Log panel still works. |
| Synthesis takes > 15 seconds | Show skeleton loader with: "Building your mind map..." + animated progress bar. Do NOT show spinner alone. |

---

## LOADING STATES

| Event | Loading UI |
|---|---|
| Session load/resume | Skeleton cards for chat + insight log. "Loading session..." label. |
| AI response generating | Typing indicator (three animated dots) in AI bubble. Stream text as it arrives. |
| Insight being captured | Subtle pulse on log panel header. New card slides in when ready. |
| ClusterAgent running | "Analysing patterns..." banner in Patterns tab. Non-blocking. |
| Synthesis running | Full skeleton of mind map structure with "Generating..." labels. Estimated wait shown. |
| Export generating | Button shows spinner + "Preparing export..." |

---

## RESPONSIVE BEHAVIOUR

| Breakpoint | Layout Change |
|---|---|
| Desktop > 1280px | Full split panel (chat + log side by side) |
| Tablet 768–1280px | Collapsible log panel (toggle button). Chat full width by default. |
| Mobile < 768px | Single column. Log panel as bottom sheet. Mind map in vertical scroll. |

---

## ACCESSIBILITY

- Dimension pills: `aria-label="WHY dimension — active"` / `"covered"` / `"pending"`
- Insight log: `aria-live="polite"` — new insights announced to screen readers
- Cluster cards: keyboard expandable (Enter/Space)
- Language toggle: labelled with `lang` attribute on body to assist translation tools
- Signal indicators: always paired with text (never colour-only)
- Mind map tree: keyboard navigable (arrow keys expand/collapse)
- All modals: focus trap on open, restore focus on close

---

*Antigravity UI Flow v2.0 — INCUBX Dashboard Integration*
