-- ============================================================
-- MONSTAAABEATS — Supabase Schema
-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (optional, we use serial int PK here)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: beats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beats (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  genre           TEXT NOT NULL,
  bpm             INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 400),
  musical_key     TEXT NOT NULL,             -- ex: "Am", "Fm", "Gm"
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  duration_label  TEXT NOT NULL,             -- ex: "3:24" (for display)
  beat_type       TEXT NOT NULL DEFAULT 'sale'
                    CHECK (beat_type IN ('free', 'sale', 'excl')),
  price_eur       NUMERIC(8,2) NOT NULL DEFAULT 0
                    CHECK (price_eur >= 0),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  vibe            TEXT,                      -- ex: "Solaire", "Cryptique"
  audio_url       TEXT NOT NULL DEFAULT '', -- Public Supabase Storage URL
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure price=0 for free beats, price>0 for paid
  CONSTRAINT free_beats_no_price  CHECK (beat_type != 'free' OR price_eur = 0),
  CONSTRAINT paid_beats_have_price CHECK (beat_type = 'free' OR price_eur > 0)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_beats_type      ON public.beats (beat_type);
CREATE INDEX IF NOT EXISTS idx_beats_featured  ON public.beats (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_beats_sort      ON public.beats (sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beats_tags      ON public.beats USING GIN (tags);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read beats (no auth required)
CREATE POLICY "beats_public_read"
  ON public.beats
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- No public insert/update/delete (admin only via Supabase dashboard or service role)
-- To allow authenticated admin writes, add policies here as needed.

-- ============================================================
-- STORAGE BUCKET: beats-audio
-- ============================================================
-- Run this to create the public bucket via SQL
-- (or create it manually in Supabase Storage dashboard)

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('beats-audio', 'beats-audio', TRUE)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can read audio files
-- CREATE POLICY "audio_public_read"
--   ON storage.objects
--   FOR SELECT
--   TO anon, authenticated
--   USING (bucket_id = 'beats-audio');

-- NOTE: Uncomment the storage lines above if you prefer SQL setup.
-- Otherwise, create the bucket manually in the Supabase dashboard:
-- Storage → New Bucket → Name: beats-audio → Public: ON
