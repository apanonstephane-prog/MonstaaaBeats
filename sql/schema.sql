-- ============================================================
-- MONSTAAABEATS — Supabase Schema (idempotent)
-- ============================================================

-- ============================================================
-- TABLE: beats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beats (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,          -- unique pour ON CONFLICT idempotent
  genre           TEXT NOT NULL,
  bpm             INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 400),
  musical_key     TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  duration_label  TEXT NOT NULL,
  beat_type       TEXT NOT NULL DEFAULT 'sale'
                    CHECK (beat_type IN ('free', 'sale', 'excl')),
  price_eur       NUMERIC(8,2) NOT NULL DEFAULT 0
                    CHECK (price_eur >= 0),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  vibe            TEXT,
  audio_url       TEXT NOT NULL DEFAULT '',
  cover_url       TEXT NOT NULL DEFAULT '',
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT free_beats_no_price  CHECK (beat_type != 'free' OR price_eur = 0),
  CONSTRAINT paid_beats_have_price CHECK (beat_type = 'free' OR price_eur > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beats_type     ON public.beats (beat_type);
CREATE INDEX IF NOT EXISTS idx_beats_featured ON public.beats (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_beats_sort     ON public.beats (sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beats_tags     ON public.beats USING GIN (tags);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'beats'
      AND policyname = 'beats_public_read'
  ) THEN
    CREATE POLICY "beats_public_read"
      ON public.beats
      FOR SELECT
      TO anon, authenticated
      USING (TRUE);
  END IF;
END $$;

-- Migration : ajout cover_url si colonne absente (idempotent)
ALTER TABLE public.beats ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT '';

-- ============================================================
-- STORAGE BUCKET: beats-audio (créé via API dans setup.js)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('beats-audio', 'beats-audio', TRUE)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'audio_public_read'
  ) THEN
    CREATE POLICY "audio_public_read"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'beats-audio');
  END IF;
END $$;
