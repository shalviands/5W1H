# Antigravity — Error Handling, Loading States & Prompt Versioning
## INCUBX Platform Module · v2.0

---

## PART 1: ERROR HANDLING

### Error Classification

```typescript
enum AgentErrorType {
  // Agent-level
  MODEL_UNAVAILABLE    = 'MODEL_UNAVAILABLE',     // OpenRouter model down
  MODEL_TIMEOUT        = 'MODEL_TIMEOUT',          // Response took too long
  CONTEXT_OVERFLOW     = 'CONTEXT_OVERFLOW',       // Too many tokens in history
  INVALID_OUTPUT       = 'INVALID_OUTPUT',          // Agent returned malformed JSON

  // Data-level
  CAPTURE_FAILED       = 'CAPTURE_FAILED',         // Insight couldn't be stored
  SESSION_NOT_FOUND    = 'SESSION_NOT_FOUND',
  PERMISSION_DENIED    = 'PERMISSION_DENIED',      // Role doesn't allow action

  // Platform-level
  RATE_LIMITED         = 'RATE_LIMITED',           // Platform rate limit hit
  AUTH_EXPIRED         = 'AUTH_EXPIRED',           // JWT expired mid-session
  DB_WRITE_FAILED      = 'DB_WRITE_FAILED',

  // Synthesis-level
  SYNTHESIS_TIMEOUT    = 'SYNTHESIS_TIMEOUT',
  INSUFFICIENT_DATA    = 'INSUFFICIENT_DATA',      // Not enough insights to synthesise
}
```

---

### Error Handling by Layer

#### 1. Agent Call Failures

```typescript
async function callAgentWithRetry(
  agentConfig: AgentConfig,
  messages: Message[],
  context: PlatformContext,
  maxRetries = 2
): Promise<AgentResponse> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAgent(agentConfig, messages, context);
    } catch (err) {
      lastError = err;

      if (err.status === 429) {
        // Rate limited — wait with exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      if (err.status === 503 || err.code === 'MODEL_UNAVAILABLE') {
        // Try next model in fallback chain
        agentConfig = getNextFallback(agentConfig);
        if (!agentConfig) break;
        continue;
      }

      if (err.code === 'CONTEXT_OVERFLOW') {
        // Trim oldest messages and retry once
        messages = trimConversationHistory(messages, 0.7);
        continue;
      }

      // Non-retryable — throw immediately
      throw err;
    }
  }

  throw lastError;
}
```

#### 2. Insight Capture Failures

Insight capture is the most critical operation. If it fails, the user's input must NOT be lost.

```typescript
async function captureInsightWithFallback(input: CaptureInput): Promise<InsightRecord> {
  try {
    return await CaptureAgent.run(input);
  } catch (err) {
    // Primary capture failed — write raw to a recovery queue
    await supabase
      .from('ag_capture_recovery_queue')
      .insert({
        session_id: input.session_id,
        user_id: input.user_id,
        raw_text: input.raw_text,        // verbatim, always
        raw_input: JSON.stringify(input),
        error: err.message,
        created_at: new Date().toISOString()
      });

    // Notify system (not user) — process queue async
    await triggerRecoveryProcessor(input.session_id);

    // Return a provisional record so the session continues
    return buildProvisionalInsight(input);
  }
}
```

**Recovery queue table:**
```sql
CREATE TABLE ag_capture_recovery_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  raw_text    TEXT NOT NULL,
  raw_input   JSONB NOT NULL,
  error       TEXT,
  processed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3. Session Auth Expiry

```typescript
// Middleware on every agent call
async function validateSessionAuth(token: string, session_id: string) {
  const { user, error } = await platform.auth.getUser(token);

  if (error?.message === 'JWT expired') {
    // Pause session, preserve state
    await pauseSession(session_id, 'AUTH_EXPIRED');

    // Surface to client
    throw new AgentError('AUTH_EXPIRED', 'Session paused — please refresh to continue.');
  }

  if (error) throw new AgentError('AUTH_FAILED', error.message);
  return user;
}
```

#### 4. Append-Only Violation

```typescript
// Any attempt to update or delete an insight throws at DB level (trigger enforced)
// At application level, add a guard too:
function assertAppendOnly(operation: string) {
  if (operation === 'update' || operation === 'delete') {
    throw new Error(
      `ag_insights is append-only. Operation "${operation}" is not permitted. ` +
      `If frequency changed, call incrementFrequency() instead.`
    );
  }
}
```

#### 5. Raw Text Integrity Guard

```typescript
// Before every DB write from CaptureAgent
function assertRawTextIntegrity(captured: InsightRecord, original: CaptureInput) {
  if (captured.raw_text !== original.raw_text) {
    // Log the violation — this is a system error, not a user error
    logger.error('RAW_TEXT_INTEGRITY_VIOLATION', {
      original: original.raw_text,
      captured: captured.raw_text,
      session_id: original.session_id,
      user_id: original.user_id
    });

    // Use original — never the paraphrased version
    captured.raw_text = original.raw_text;
    captured.language = original.language_detected;
  }
}
```

#### 6. Synthesis Failures

```typescript
async function synthesiseWithTimeout(session_id: string, timeout_ms = 30000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SYNTHESIS_TIMEOUT')), timeout_ms)
  );

  try {
    const result = await Promise.race([
      SynthesisAgent.run(session_id),
      timeoutPromise
    ]);
    return result;
  } catch (err) {
    if (err.message === 'SYNTHESIS_TIMEOUT') {
      // Save partial output if available
      await savePartialSynthesis(session_id);
      throw new AgentError('SYNTHESIS_TIMEOUT',
        'Mind map generation is taking longer than usual. We\'ll notify you when it\'s ready.'
      );
    }
    throw err;
  }
}
```

---

## PART 2: LOADING STATES

### Loading State Definitions

```typescript
enum LoadingState {
  IDLE              = 'idle',
  SESSION_LOADING   = 'session_loading',
  AI_THINKING       = 'ai_thinking',
  AI_STREAMING      = 'ai_streaming',
  CAPTURING         = 'capturing',
  CLUSTERING        = 'clustering',
  SYNTHESISING      = 'synthesising',
  EXPORTING         = 'exporting',
}
```

### UI Behaviour Per State

| State | Chat Panel | Log Panel | Patterns Tab | Notes |
|---|---|---|---|---|
| `session_loading` | Skeleton cards | Skeleton list | — | Max 2s. If longer → "Loading session..." |
| `ai_thinking` | Typing indicator (3 dots) | Normal | Normal | Non-blocking |
| `ai_streaming` | Text streams in | Normal | Normal | Token-by-token via SSE |
| `capturing` | Capture confirmation fades in | Card slides in | Normal | < 500ms expected |
| `clustering` | Normal | Normal | "Analysing patterns..." banner | Non-blocking — interview continues |
| `synthesising` | Normal | Normal | Normal | Skeleton mind map + progress indicator |
| `exporting` | — | — | — | Button spinner + "Preparing..." |

### Synthesis Loading (detailed)

Synthesis can take 10–30 seconds. The skeleton must communicate structure, not emptiness.

```
┌─────────────────────────────────────────────────────────┐
│  Generating your mind map...                            │
│  ████████████████░░░░░░░░░░░░  ~15s remaining          │
│                                                         │
│  [Core Problem]                                         │
│    ├── WHO ░░░░░░░░░░░░░░░░░░░░░░░                     │
│    ├── WHAT ░░░░░░░░░░░░░░░░░░░░                       │
│    ├── WHY ░░░░░░░░░░░░░░░░░░░░░░░                     │
│    └── HOW ░░░░░░░░░░░░                                │
│                                                         │
│  Analysing 14 insights across 3 stakeholders...        │
└─────────────────────────────────────────────────────────┘
```

Rules:
- Show skeleton tree structure based on dimensions already covered
- Show actual counts ("14 insights, 3 stakeholders") — these are known before synthesis runs
- Progress bar is estimated (not real) — based on average synthesis time
- If it exceeds 40s, show: "This is taking longer than usual — we'll notify you when it's ready"

---

## PART 3: PROMPT VERSIONING STRATEGY

### Why Versioning Matters

Prompts are code. Changing the intake prompt changes every future session. Without versioning:
- Regressions are invisible
- A/B testing is impossible
- You can't roll back a bad prompt update

---

### Version Tag Format

```
v{MAJOR}.{MINOR}[-{experiment}]

Examples:
  v2          → stable production
  v2.1        → minor refinement to v2
  v3          → major behaviour change
  v2-hindi    → hindi-language optimisation experiment
  v2-mentor   → mentor-assisted session variant
```

---

### Storage

Prompts are stored in the `ag_prompt_versions` table (defined in DB schema).
They are NOT stored in code files — they're loaded from DB at runtime.

```typescript
// Load the active prompt for a given agent
async function getActivePrompt(agent_name: string, version?: string): Promise<string> {
  const query = supabase
    .from('ag_prompt_versions')
    .select('prompt_text')
    .eq('agent_name', agent_name)
    .eq('is_active', true);

  if (version) {
    query.eq('version_tag', version);
  } else {
    query.eq('is_default', true);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    // Fallback to hardcoded default — never fail silently
    logger.warn('PROMPT_LOAD_FAILED', { agent_name, version });
    return HARDCODED_FALLBACK_PROMPTS[agent_name];
  }

  return data.prompt_text;
}
```

---

### Promotion Workflow

```
[Draft in ag_prompt_versions (is_active: false)]
        │
        ▼
[Test on staging with is_active: true, is_default: false]
        │
        ▼
[A/B test: route X% of sessions to new version]
        │
        ▼
[If metrics pass → set is_default: true on new version]
[Set is_default: false on old version]
        │
        ▼
[Old version: set deprecated_at timestamp]
[Old version remains in DB — never deleted]
```

---

### Session-Level Version Pinning

Each session records which prompt version it used. This means:
- A resumed session uses the SAME prompt version it started with
- Changing the default prompt does NOT affect in-progress sessions
- You can audit exactly which prompt produced which mind map

```typescript
// On session create
const prompt_version = version_override ?? await getDefaultVersion('intake');
await supabase.from('ag_sessions').insert({ ..., prompt_version });

// On session resume
const { prompt_version } = await getSession(session_id);
const prompt = await getActivePrompt('intake', prompt_version); // pinned version
```

---

### A/B Testing Framework

```typescript
// Assign a version to a session based on cohort-level experiment config
async function resolvePromptVersion(cohort_id: string, agent: string): Promise<string> {
  const experiment = await getActiveExperiment(cohort_id, agent);

  if (!experiment) return getDefaultVersion(agent);

  // Deterministic assignment based on user_id hash
  const bucket = hashToBucket(user_id, experiment.buckets);
  return experiment.version_map[bucket];
}
```

---

### Changelog Convention

Every prompt version entry must include a `changelog` field:

```
v2.0 — Initial INCUBX-integrated version. Role-aware, language-aware, multi-user.
v2.1 — Refined why-chain to max 3 levels (was open-ended). Added divergence detection.
v2-hindi — Rewritten for Hindi-first response in hi/mixed sessions. Under test.
v3 — Breaking: new context payload schema. Requires session migration before rollout.
```

---

### Rollback Procedure

```sql
-- Step 1: Demote current default
UPDATE ag_prompt_versions
SET is_default = FALSE, deprecated_at = NOW()
WHERE agent_name = 'intake' AND is_default = TRUE;

-- Step 2: Promote previous version
UPDATE ag_prompt_versions
SET is_default = TRUE, deprecated_at = NULL
WHERE agent_name = 'intake' AND version_tag = 'v2.0';

-- All new sessions now use v2.0
-- Existing sessions: unaffected (pinned to their version)
```

---

*Antigravity Error Handling, Loading States & Prompt Versioning v2.0*
