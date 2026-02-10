-- Transformation Pulse Global: Supabase Schema (migration)
-- Apply via: supabase db push  (after supabase link)

-- Signals: job mandates detected from regional portals
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  region TEXT NOT NULL,
  hub TEXT NOT NULL,
  company TEXT NOT NULL,
  headline TEXT NOT NULL,
  source_portal TEXT,
  source_url TEXT,
  complexity_match_pct NUMERIC(5,2) DEFAULT 0,
  signal_keywords TEXT[],
  raw_description TEXT,
  parsed_summary TEXT,
  CONSTRAINT signals_region_check CHECK (region IN ('SEA', 'Middle East', 'India', 'East Asia'))
);

CREATE TYPE stakeholder_type AS ENUM ('recruiter', 'hiring_manager', 'bridge');
CREATE TYPE recruiter_origin AS ENUM ('internal', 'external');

CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  type stakeholder_type NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin_url TEXT,
  email TEXT,
  origin recruiter_origin,
  firm_name TEXT,
  rss_score NUMERIC(8,2),
  tenure_years NUMERIC(4,2),
  recency_years NUMERIC(4,2),
  context_bonus NUMERIC(5,2),
  rank_order INT,
  UNIQUE(signal_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_signals_region ON signals(region);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholders_signal_id ON stakeholders(signal_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON stakeholders(type);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read signals" ON signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert signals" ON signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update signals" ON signals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read stakeholders" ON stakeholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert stakeholders" ON stakeholders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update stakeholders" ON stakeholders FOR UPDATE TO authenticated USING (true);

-- Self-healing
CREATE TABLE IF NOT EXISTS scraper_selectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  source_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  selector_type TEXT NOT NULL DEFAULT 'css',
  selector_value TEXT NOT NULL,
  selector_previous TEXT,
  last_verified_at TIMESTAMPTZ,
  UNIQUE(source_id, field_name)
);
CREATE INDEX IF NOT EXISTS idx_scraper_selectors_source ON scraper_selectors(source_id);

CREATE TYPE source_status AS ENUM ('ok', 'healing', 'healed');
CREATE TABLE IF NOT EXISTS scrape_sources (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  region TEXT,
  status source_status NOT NULL DEFAULT 'ok',
  last_scraped_at TIMESTAMPTZ,
  last_heal_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS heal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  source_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  trigger_reason TEXT,
  selector_before TEXT,
  selector_after TEXT,
  success BOOLEAN NOT NULL,
  trace_id TEXT,
  raw_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_heal_events_source ON heal_events(source_id);
CREATE INDEX IF NOT EXISTS idx_heal_events_created ON heal_events(created_at DESC);

ALTER TABLE scraper_selectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE heal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read scraper_selectors" ON scraper_selectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service write scraper_selectors" ON scraper_selectors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read scrape_sources" ON scrape_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service write scrape_sources" ON scrape_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read heal_events" ON heal_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service insert heal_events" ON heal_events FOR INSERT TO service_role WITH CHECK (true);

-- Stealth / sessions
CREATE TABLE IF NOT EXISTS browser_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  hub_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  cookies_encrypted TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(hub_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_hub ON browser_sessions(hub_id);

CREATE TABLE IF NOT EXISTS regional_profiles (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  timezone_iana TEXT NOT NULL,
  proxy_provider TEXT,
  proxy_region TEXT,
  business_start_hour INT DEFAULT 9,
  business_end_hour INT DEFAULT 18,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO regional_profiles (id, hub_id, timezone_iana, proxy_region) VALUES
  ('sg', 'Singapore', 'Asia/Singapore', 'StarHub/Singtel'),
  ('riyadh', 'Riyadh', 'Asia/Riyadh', 'STC/Mobily')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service browser_sessions" ON browser_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read regional_profiles" ON regional_profiles FOR SELECT TO authenticated USING (true);

-- User professional history
CREATE TABLE IF NOT EXISTS user_professional_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  positions JSONB NOT NULL DEFAULT '[]',
  person JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_professional_history_user ON user_professional_history(user_id);
ALTER TABLE user_professional_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own professional history" ON user_professional_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
