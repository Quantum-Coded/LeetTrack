-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yievhbbonuonmdbpxrcy/sql/new

-- ═══════════════════════════════════════════════════
-- Table: solved_slugs
-- Tracks every unique problem each user has solved.
-- Prevents duplicate counting across refreshes.
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS solved_slugs (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  slug TEXT NOT NULL,
  solved_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(username, slug)
);

-- Index for fast lookups by username
CREATE INDEX IF NOT EXISTS idx_solved_slugs_username ON solved_slugs(username);

-- Enable RLS but allow all operations (anon key access)
ALTER TABLE solved_slugs ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'solved_slugs' AND policyname = 'Allow all operations'
  ) THEN
    CREATE POLICY "Allow all operations" ON solved_slugs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════
-- OPTIONAL: Backfill existing data
-- If you want to seed solved_slugs from your existing
-- daily_records, you can run a manual refresh after
-- creating the table. The first refresh will populate
-- the table with all currently visible slugs.
-- ═══════════════════════════════════════════════════
