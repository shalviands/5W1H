# Antigravity — Architecture v2.0
## Modular Plugin for INCUBX Platform · OpenRouter-Compatible

---

## ARCHITECTURAL PRINCIPLE

Antigravity is a **self-contained module** that plugs into the INCUBX platform. It does NOT own auth, users, teams, or cohorts. It BORROWS them from the host platform via context injection and shared database extension.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INCUBX PLATFORM                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Auth/Users  │  │ Teams/Cohorts│  │  Projects/Dashboard  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                       │               │
│         └─────────────────┴───────────────────────┘               │
│                           │ Context Injection                      │
│                           ▼                                        │
│         ┌─────────────────────────────────────┐                   │
│         │         ANTIGRAVITY MODULE           │                   │
│         │                                      │                   │
│         │  ┌──────────────────────────────┐   │                   │
│         │  │      ORCHESTRATOR AGENT      │   │                   │
│         │  └───┬──────┬──────┬────────────┘   │                   │
│         │      │      │      │                 │                   │
│         │  ┌───▼─┐ ┌──▼──┐ ┌▼──────┐ ┌─────┐ │                   │
│         │  │INT- │ │CAP- │ │CLUST- │ │SYN- │ │                   │
│         │  │TAKE │ │TURE │ │ER    │ │THES.│ │                   │
│         │  └─────┘ └─────┘ └───────┘ └─────┘ │                   │
│         │                                      │                   │
│         │  ┌──────────────────────────────┐   │                   │
│         │  │   EXTENDED SUPABASE TABLES   │   │                   │
│         │  │   (linked to platform schema)│   │                   │
│         │  └──────────────────────────────┘   │                   │
│         └─────────────────────────────────────┘                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## MODULE BOUNDARIES

### What Antigravity OWNS
- Discovery session lifecycle
- 5W1H questioning logic
- Insight capture and tagging
- Clustering and pattern detection
- Mind map generation
- Its own DB tables (extended, not separate)
- Prompt versioning

### What Antigravity BORROWS from INCUBX
- User authentication (JWT from platform)
- User roles and permissions
- team_id, cohort_id, project_id
- Platform-level rate limiting
- Notification system (for session invites)
- File/export storage (platform's S3/storage bucket)

---

## AGENT ARCHITECTURE

### 1. ORCHESTRATOR AGENT
**Role:** Receives platform context, manages session state, routes to sub-agents.

**Model:** `anthropic/claude-sonnet-4-5` via OpenRouter

**Receives from INCUBX:**
```typescript
interface PlatformContext {
  auth_token: string;          // Platform JWT — validated before session starts
  user_id: string;
  role: 'founder' | 'student' | 'mentor' | 'admin';
  project_id: string;
  team_id: string;
  cohort_id: string;
  session_language: 'en' | 'hi' | 'mixed';
}
```

**OpenRouter Config:**
```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.3,
  "max_tokens": 2048,
  "route": "fallback",
  "fallback": ["openai/gpt-4o", "google/gemini-pro-1.5"]
}
```

---

### 2. INTAKE AGENT
**Role:** Conducts adaptive 5W1H interview. Language-aware. Role-aware.

**Model:** `anthropic/claude-sonnet-4-5` (primary) / `openai/gpt-4o` (fallback)

**Language handling:**
- Detects language from user input (en / hi / mixed)
- Responds in same language
- Passes `language_detected` to CaptureAgent

**Input:**
```typescript
interface IntakeInput {
  session_id: string;
  user_id: string;
  user_role: string;
  user_message: string;
  conversation_history: Message[];
  covered_dimensions: Dimension[];
  session_language: string;
  team_context: TeamMember[];
}
```

**Output:**
```typescript
interface IntakeOutput {
  next_question: string;
  dimension_targeted: Dimension;
  signal_strength: 'HIGH' | 'MEDIUM' | 'LOW';
  raw_insight: string;
  language_detected: 'en' | 'hi' | 'mixed';
  divergence_flag: boolean;    // true if contradicts existing insight
}
```

---

### 3. CAPTURE AGENT
**Role:** Tags and stores every insight. JSON only. Zero paraphrasing.

**Model:** `openai/gpt-4o-mini` (lightweight structured task)

**Critical rules enforced at agent level:**
- raw_text stored verbatim (no translation, no cleanup)
- user_id always from platform auth — never from user input
- frequency incremented on repetition, NOT deduplicated
- language preserved as typed

**Input:**
```typescript
interface CaptureInput {
  raw_text: string;
  user_id: string;
  user_role: string;
  stakeholder_tag: string;
  dimension: Dimension;
  session_id: string;
  project_id: string;
  team_id: string;
  cohort_id: string;
  language_detected: string;
}
```

**Output (stored to DB):**
```typescript
interface InsightRecord {
  id: string;
  session_id: string;
  project_id: string;
  team_id: string;
  cohort_id: string;
  user_id: string;
  user_role: string;
  stakeholder_tag: string;
  dimension: Dimension;
  raw_text: string;              // VERBATIM
  language: string;
  frequency: number;
  signal: SignalLevel;
  cluster_id?: string;
  divergence_flag: boolean;
  created_at: string;
}
```

---

### 4. CLUSTER AGENT
**Role:** Groups semantically related insights. Detects cross-user convergences.

**Model:** `anthropic/claude-3-haiku` (fast, cost-efficient)

**Triggered:** Every 5 new insights OR on manual "analyse patterns" request

**Clustering rules:**
- Groups by semantic similarity — NOT by exact match
- Preserves all source entries (no merging)
- Cross-user same insight = STRONG SIGNAL
- Mentor + founder agreement = VALIDATED SIGNAL
- Contradictions between users = DIVERGENCE SIGNAL

**Output:**
```typescript
interface Cluster {
  id: string;
  session_id: string;
  theme: string;
  primary_dimension: Dimension;
  entries: InsightRecord[];       // original refs, not copies
  signal: SignalLevel;
  contributing_users: string[];   // user_ids
  contributing_roles: string[];
  divergence: boolean;
  evidence_count: number;
}
```

---

### 5. SYNTHESIS AGENT
**Role:** Generates mind map, signal report, opportunity gaps, divergence report.

**Model:** `anthropic/claude-sonnet-4-5`

**Triggered:** On user/mentor request OR when all 6 dimensions are covered

**Outputs:**
- Markdown mind map (linked to project record)
- Signal summary table
- Opportunity gaps list
- Divergence report (if applicable)
- Coverage report (which dimensions need more exploration)

---

## OPENROUTER INTEGRATION

```typescript
const OPENROUTER_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://incubx.in',
    'X-Title': 'INCUBX Antigravity Module',
    'Content-Type': 'application/json'
  }
};

// Unified call wrapper
async function callAgent(
  agentConfig: AgentConfig,
  messages: Message[],
  platformContext: PlatformContext
): Promise<AgentResponse> {
  const response = await fetch(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: OPENROUTER_CONFIG.headers,
    body: JSON.stringify({
      model: agentConfig.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(agentConfig, platformContext) },
        ...messages
      ],
      temperature: agentConfig.temperature,
      max_tokens: agentConfig.max_tokens,
      ...(agentConfig.response_format && {
        response_format: agentConfig.response_format
      })
    })
  });

  if (!response.ok) {
    throw new AgentError(response.status, agentConfig.name, await response.text());
  }

  return response.json();
}
```

### Model Routing Table

| Agent | Primary Model | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Orchestrator | claude-sonnet-4-5 | gpt-4o | gemini-pro-1.5 |
| Intake | claude-sonnet-4-5 | gpt-4o | gemini-pro-1.5 |
| Capture | gpt-4o-mini | claude-3-haiku | gemini-flash |
| Cluster | claude-3-haiku | gpt-4o-mini | gemini-flash |
| Synthesis | claude-sonnet-4-5 | gpt-4o | gemini-pro-1.5 |

---

## PERMISSION MATRIX

| Action | founder | student | mentor | admin |
|---|---|---|---|---|
| Create session | ✅ | ✅ | ❌ | ✅ |
| Contribute insights | ✅ | ✅ | ✅ (flagged as mentor) | ❌ |
| View session insights | ✅ | ✅ (own team) | ✅ (assigned cohort) | ✅ |
| Trigger synthesis | ✅ | ✅ | ✅ | ✅ |
| Export mind map | ✅ | ✅ | ✅ | ✅ |
| Delete session | ❌ | ❌ | ❌ | ✅ |
| View all cohort sessions | ❌ | ❌ | ✅ (assigned) | ✅ |

Permission checks run against the INCUBX platform's existing RBAC — Antigravity does NOT implement its own.

---

## RATE LIMITING

Antigravity respects platform-level rate limits. No independent rate limiting layer.

```typescript
// Middleware — runs before every agent call
async function checkRateLimit(user_id: string, action: string) {
  // Delegate to INCUBX platform rate limit service
  return await platform.rateLimit.check(user_id, `antigravity:${action}`);
}
```

---

## SESSION RESUMABILITY

Sessions are persistent, not ephemeral. Stored in DB with `status` field.

```
CREATED → ACTIVE → PAUSED → RESUMED → SYNTHESIS_READY → COMPLETED
                    ↑_____________↓
```

On resume, Orchestrator:
1. Loads full session history from DB
2. Identifies uncovered dimensions
3. Generates 3-line summary of last session
4. Continues from next uncovered dimension

---

## DATA FLOW

```
INCUBX Platform (auth + context)
        │
        ▼
[ORCHESTRATOR] ← validates JWT, loads session
        │
        ├──→ [INTAKE AGENT]
        │         │ (user responds)
        │         ▼
        ├──→ [CAPTURE AGENT] → [SUPABASE: ag_insights]
        │         │
        │         ▼ (every 5 insights)
        ├──→ [CLUSTER AGENT] → [SUPABASE: ag_clusters]
        │
        └──→ [SYNTHESIS AGENT] → [SUPABASE: ag_sessions.mind_map_md]
                    │
                    └──→ [INCUBX: project reports / mentor dashboard]
```

---

## MODULE INTEGRATION POINTS

```typescript
// How INCUBX calls Antigravity
import { AntigravityModule } from '@incubx/antigravity';

const antigravity = new AntigravityModule({
  supabase: platform.supabase,           // shared client
  rateLimiter: platform.rateLimiter,     // platform rate limiter
  storage: platform.storage,            // for exports
  promptVersion: 'v2'                   // see prompt versioning doc
});

// Start a session
const session = await antigravity.createSession({
  project_id,
  team_id,
  cohort_id,
  created_by: user_id,
  problem_domain,
  stakeholders,
  session_language
});

// Process a turn
const response = await antigravity.turn({
  session_id: session.id,
  user_id,
  user_role,
  message,
  stakeholder_tag
});
```

---

*Antigravity Architecture v2.0 — INCUBX Embedded Module*
