-- RLS Policy Simplification and Service-Only Tables
-- Run: npx supabase db push or paste in Supabase SQL Editor

-- =============================================================================
-- SERVICE-ONLY TABLES (no direct browser access)
-- =============================================================================

-- These tables should only be accessed via service_role or backend-only clients.
-- Remove any authenticated policies and rely on service_role only.

-- browser_sessions: service_role only (already correct)
DROP POLICY IF EXISTS "Allow authenticated read browser_sessions" ON browser_sessions;
DROP POLICY IF EXISTS "Allow authenticated write browser_sessions" ON browser_sessions;

-- scraper_selectors: service_role write, authenticated read (for dashboard status)
-- Keep read policy for dashboard, but writes are service-only
DROP POLICY IF EXISTS "Allow authenticated write scraper_selectors" ON scraper_selectors;

-- heal_events: service_role insert, authenticated read (for audit)
-- Already correct, but ensure no write policies for authenticated

-- =============================================================================
-- SIMPLIFIED RLS POLICIES
-- =============================================================================

-- Signals: Single-tenant for now (all authenticated users can read)
-- If multi-tenant needed later, add tenant_id column and update policies
DROP POLICY IF EXISTS "Allow authenticated read signals" ON signals;
DROP POLICY IF EXISTS "Allow authenticated insert signals" ON signals;
DROP POLICY IF EXISTS "Allow authenticated update signals" ON signals;

CREATE POLICY "Authenticated users can read signals" ON signals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert signals" ON signals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update signals" ON signals
  FOR UPDATE TO authenticated USING (true);

-- Stakeholders: Same as signals (single-tenant)
DROP POLICY IF EXISTS "Allow authenticated read stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Allow authenticated insert stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Allow authenticated update stakeholders" ON stakeholders;

CREATE POLICY "Authenticated users can read stakeholders" ON stakeholders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stakeholders" ON stakeholders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update stakeholders" ON stakeholders
  FOR UPDATE TO authenticated USING (true);

-- user_professional_history: Already correct (user owns own row)
-- No changes needed

-- scrape_sources: Read-only for authenticated (status display)
DROP POLICY IF EXISTS "Allow authenticated write scrape_sources" ON scrape_sources;

-- =============================================================================
-- MULTI-TENANT PREPARATION (Optional - uncomment if needed)
-- =============================================================================

-- If you need multi-tenant support later:
-- ALTER TABLE signals ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- CREATE INDEX IF NOT EXISTS idx_signals_tenant ON signals(tenant_id);
-- CREATE INDEX IF NOT EXISTS idx_stakeholders_tenant ON stakeholders(tenant_id);
-- 
-- Then update policies:
-- CREATE POLICY "Tenant-scoped signals" ON signals
--   FOR ALL TO authenticated
--   USING (auth.jwt()->>'tenant_id' = tenant_id::text)
--   WITH CHECK (auth.jwt()->>'tenant_id' = tenant_id::text);

COMMENT ON POLICY "Authenticated users can read signals" ON signals IS 'Single-tenant: all authenticated users can read signals. For multi-tenant, add tenant_id and update policy.';
COMMENT ON POLICY "Authenticated users can read stakeholders" ON stakeholders IS 'Single-tenant: all authenticated users can read stakeholders. For multi-tenant, add tenant_id and update policy.';
