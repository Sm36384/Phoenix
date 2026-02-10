-- Performance indexes for scaling (Risk 10.4)
-- Run: npx supabase db push or paste in Supabase SQL Editor

-- Composite index for dashboard queries (region + created_at)
CREATE INDEX IF NOT EXISTS idx_signals_region_created_at ON signals(region, created_at DESC);

-- Composite index for stakeholders (signal_id + type for filtering)
CREATE INDEX IF NOT EXISTS idx_stakeholders_signal_type ON stakeholders(signal_id, type);

-- Index for partner caching lookup (name + company)
CREATE INDEX IF NOT EXISTS idx_stakeholders_name_company ON stakeholders(name, company) WHERE linkedin_url IS NOT NULL;

-- Index for heal events by source and date
CREATE INDEX IF NOT EXISTS idx_heal_events_source_created ON heal_events(source_id, created_at DESC);

-- Index for browser sessions lookup (hub + source)
CREATE INDEX IF NOT EXISTS idx_browser_sessions_hub_source ON browser_sessions(hub_id, source_id);

-- Index for user professional history lookup
CREATE INDEX IF NOT EXISTS idx_user_professional_history_user_updated ON user_professional_history(user_id, updated_at DESC);

-- Partial index for active scrape sources (status filtering)
CREATE INDEX IF NOT EXISTS idx_scrape_sources_status ON scrape_sources(status) WHERE status IN ('healing', 'healed');

-- Low confidence parses table (for manual review)
CREATE TABLE IF NOT EXISTS low_confidence_parses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  source_id TEXT,
  jd_text_preview TEXT,
  parsed_entities JSONB NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  parse_method TEXT NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_low_confidence_parses_confidence ON low_confidence_parses(confidence, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_low_confidence_parses_reviewed ON low_confidence_parses(reviewed, created_at DESC);

ALTER TABLE low_confidence_parses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service insert low_confidence_parses" ON low_confidence_parses FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Allow authenticated read low_confidence_parses" ON low_confidence_parses FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE low_confidence_parses IS 'Low-confidence JD parses for manual review (Risk 10.1)';
