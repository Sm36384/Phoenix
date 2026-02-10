# Architecture & Implementation Guide

This document describes the production-ready architecture patterns implemented in Transformation Pulse Global.

---

## Architecture Principles

### 1. Thin Route Handlers

**Pattern:** Route handlers (`app/api/**/route.ts`) are thin adapters that:
- Validate requests (body, params, auth)
- Extract session/auth context
- Call into `lib/*` domain logic
- Serialize responses
- Handle errors

**Example:**
```typescript
// ❌ Before: Business logic in route handler
export async function POST(request: Request) {
  const body = await request.json();
  // ... 50 lines of business logic ...
  return NextResponse.json(result);
}

// ✅ After: Thin adapter
export async function POST(request: Request) {
  const validation = validateBody(await request.json());
  if (!validation.valid) return error(400);
  
  const result = await domainFunction(validation.data);
  return NextResponse.json(result);
}
```

**Files:**
- `src/app/api/cron/refresh-hubs/route.ts` - Delegates to `lib/integrations/job-sourcing/refresh-hubs.ts`
- `src/app/api/draft-pitch/route.ts` - Delegates to `lib/ai/draftPitch`
- `src/app/api/parse-executive-jd/route.ts` - Delegates to `lib/ai/parseExecutiveJD`

---

## 2. Domain Layer (`lib/`)

### Core Domain Logic (Pure Functions)

- **`lib/bridge-algorithm.ts`** - Pure RSS computation, no I/O
- **`lib/privacy/anonymize-history.ts`** - Data transformation, no I/O

### Integration Modules

Each third-party API gets its own module with:
- Clear interface
- Typed DTOs
- Error handling
- Optional fallbacks

**Structure:**
```
lib/integrations/
├── job-sourcing/
│   ├── refresh-hubs.ts      # Core pipeline logic
│   └── ...
├── people-discovery.ts      # Apollo.io wrapper
├── phantombuster.ts         # PhantomBuster wrapper
├── proxycurl.ts             # Proxycurl fallback
└── partner-discovery-with-fallback.ts  # Multi-provider discovery
```

### AI Wrapper

**`lib/ai/index.ts`** centralizes all LLM calls:
- `draftPitch()` - Persona-based pitch generation
- `parseExecutiveJD()` - Deterministic JD parsing with JSON schema

**Benefits:**
- Consistent prompt contracts
- Temperature settings (0.5 for pitch, 0.2 for parsing)
- Single place to swap models/APIs

---

## 3. Data Model & RLS

### Single-Tenant (Current)

- **signals, stakeholders:** All authenticated users can read/write
- **user_professional_history:** User owns own row (`auth.uid() = user_id`)

### Service-Only Tables

These tables are **never** accessed from browser clients:
- `browser_sessions` - Service role only
- `scraper_selectors` - Service role write, authenticated read (dashboard status)
- `heal_events` - Service role insert, authenticated read (audit)

### Multi-Tenant Preparation

If multi-tenant needed later:
1. Add `tenant_id UUID` to `signals`, `stakeholders`
2. Update RLS policies: `auth.jwt()->>'tenant_id' = tenant_id::text`
3. Always filter by tenant in queries (don't rely on RLS alone)

**Migration:** `supabase/migrations/20260210000001_rls_policies.sql`

---

## 4. Configuration Management

**`lib/config.ts`** centralizes all environment variables:
- Fail-fast validation at module load
- Type-safe access
- Feature flags (`isFeatureAvailable()`)

**Usage:**
```typescript
import { config, isFeatureAvailable } from "@/lib/config";

if (isFeatureAvailable("openai")) {
  await draftPitch(...);
}
```

---

## 5. Validation

**`lib/validation/schemas.ts`** provides request validation:
- Simple object validation (can be replaced with zod if needed)
- Returns `{ valid: boolean, data?, errors? }`

**Future:** Add `zod` for stronger type inference:
```bash
npm install zod
```

---

## 6. Observability

### OTLP Tracing

**`lib/observability/otlp-wrapper.ts`** wraps operations:
```typescript
import { withSpan } from "@/lib/observability/otlp-wrapper";

const result = await withSpan(
  { name: "draft_pitch", attributes: { persona } },
  async () => draftPitch(...)
);
```

**Traced Operations:**
- Cron refresh pipelines
- Self-healing attempts
- AI draft pitch calls
- JD parsing

**Phoenix Integration:**
- `PHOENIX_COLLECTOR_URL` → `/v1/traces` endpoint
- Traces exported via `phoenixFlush()`

---

## 7. Scraping Architecture

### Separation of Concerns

**Next.js App (Vercel):**
- Thin API routes
- Domain logic (`lib/integrations/job-sourcing`)
- Database operations

**Scraping Workers (External):**
- Playwright/Camoufox
- Human-mimicry (jitter, mouse, business hours)
- Selector healing
- Proxy rotation

**Communication:**
- Scrapers call `/api/cron/refresh-hubs` via queue/webhook
- Or scrapers write directly to Supabase (service_role)
- Healing updates `scraper_selectors` table

### Human-Mimicry

**Stays with scraper runtime:**
- Jitter (Gaussian delays)
- Business hours enforcement
- Human-flow protocol
- Bézier mouse paths
- Session persistence

**Configuration:**
- `regional_profiles` table (read-only config)
- `browser_sessions` table (encrypted cookies)

---

## 8. Bridge Discovery

**`lib/bridge-discovery/index.ts`** resolves mutual connections:

**Input:**
- Target stakeholder (with past companies)
- Candidate list (from Apollo/PhantomBuster)
- User history (from DB)

**Output:**
- Ranked list with RSS scores
- Warm lead flags
- Overlap details

**Flow:**
1. Find overlap between user history and candidate past companies
2. Compute RSS for each candidate
3. Rank by RSS
4. Return top N with annotations

---

## 9. Cron Flow

### Thin Adapter Pattern

**Route Handler (`app/api/cron/refresh-hubs/route.ts`):**
1. Validate `Authorization: Bearer CRON_SECRET`
2. Get hubs in business hours
3. Delegate to `lib/integrations/job-sourcing/refresh-hubs.ts`

**Domain Logic (`lib/integrations/job-sourcing/refresh-hubs.ts`):**
1. Fetch jobs from Apify per hub
2. Filter for transformation roles
3. Resolve Hiring Managers via Apollo
4. Build signals + stakeholders in memory
5. Batch insert with service_role
6. Emit OTLP traces

**Benefits:**
- Testable domain logic (no HTTP mocks)
- Observable pipeline (single span per hub)
- Clean separation of concerns

---

## 10. UI Implementation

### Server Components (Initial Load)

- Dashboard page fetches initial data server-side
- Pagination handled on server (`?page=1&limit=20`)

### Client Components (Interactions)

- War Room drawer loads details **on open** (lazy)
- Live Trace shows demo by default
- Integration banners read `/api/integration-status` once

**Benefits:**
- Fast initial load
- Responsive even with 10k+ signals
- Minimal client-side state

---

## 11. Security & Operations

### Supabase

- **Separate projects:** dev/staging/prod (same schema, different env)
- **service_role key:** Backend only, never shipped to browser
- **RLS:** Primary guardrail, but always filter in queries

### Route Handlers

- **Validation:** Use `lib/validation/schemas.ts` or zod
- **Auth:** Extract session early, pass to domain logic
- **Errors:** Return typed error responses

### Secrets

- **Centralized:** `lib/config.ts` validates at boot
- **Fail-fast:** Missing required vars throw immediately
- **Feature flags:** Graceful degradation when APIs unavailable

---

## File Structure Summary

```
src/
├── app/                    # Next.js App Router (thin adapters)
│   ├── api/               # Route handlers (validation → lib → response)
│   ├── page.tsx           # Dashboard (server components + client interactions)
│   └── ...
├── lib/                   # Domain layer
│   ├── ai/                # AI/LLM wrapper (draftPitch, parseExecutiveJD)
│   ├── bridge-algorithm.ts # Pure RSS computation
│   ├── bridge-discovery/   # Bridge resolution logic
│   ├── config.ts          # Centralized env validation
│   ├── integrations/      # Third-party API wrappers
│   ├── observability/     # OTLP tracing wrapper
│   ├── privacy/          # Anonymization for LLM
│   ├── validation/       # Request validation schemas
│   └── ...
└── ...
```

---

## Migration Checklist

1. ✅ **Config centralization** - `lib/config.ts`
2. ✅ **AI wrapper** - `lib/ai/index.ts`
3. ✅ **Thin route handlers** - Cron, draft-pitch, parse-executive-jd
4. ✅ **Bridge discovery** - `lib/bridge-discovery/index.ts`
5. ✅ **RLS policies** - Simplified, service-only tables marked
6. ✅ **OTLP tracing** - Wrapper for key operations
7. ✅ **Validation** - Simple schemas (can upgrade to zod)
8. ⏳ **Queue system** - Future: BullMQ or Vercel Queue for cron
9. ⏳ **Batch healing** - Future: Group heal events by source

---

## Next Steps

1. **Add zod** (optional but recommended):
   ```bash
   npm install zod
   ```
   Then replace `lib/validation/schemas.ts` with zod schemas.

2. **Run migrations:**
   ```bash
   npm run db:push
   ```

3. **Set up scraping workers** (external to Vercel):
   - Use `regional_profiles` table for config
   - Call `/api/cron/refresh-hubs` or write directly to Supabase
   - Update `scraper_selectors` when healing succeeds

4. **Monitor Phoenix traces:**
   - Set `PHOENIX_COLLECTOR_URL`
   - View traces in Phoenix UI for debugging

---

*Last updated: 2026-02-10*
