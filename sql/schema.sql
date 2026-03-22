-- ============================================================
-- MONSTAAABEATS — Supabase Schema (idempotent)
-- ============================================================

-- ============================================================
-- TABLE: beats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beats (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  genre           TEXT NOT NULL,
  beat_type       TEXT NOT NULL DEFAULT 'sale'
                    CHECK (beat_type IN ('free', 'sale', 'excl')),
  price_eur       NUMERIC(8,2) NOT NULL DEFAULT 0
                    CHECK (price_eur >= 0),
  audio_url       TEXT NOT NULL DEFAULT '',
  cover_url       TEXT NOT NULL DEFAULT '',
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT free_beats_no_price  CHECK (beat_type != 'free' OR price_eur = 0),
  CONSTRAINT paid_beats_have_price CHECK (beat_type = 'free' OR price_eur > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beats_type     ON public.beats (beat_type);
CREATE INDEX IF NOT EXISTS idx_beats_featured ON public.beats (is_featured) WHERE is_featured = TRUE;

-- ============================================================
-- MIGRATIONS (idempotent — pour bases existantes)
-- ============================================================
ALTER TABLE public.beats ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.beats DROP COLUMN IF EXISTS bpm;
ALTER TABLE public.beats DROP COLUMN IF EXISTS musical_key;
ALTER TABLE public.beats DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE public.beats DROP COLUMN IF EXISTS duration_label;
ALTER TABLE public.beats DROP COLUMN IF EXISTS vibe;
ALTER TABLE public.beats DROP COLUMN IF EXISTS tags;
ALTER TABLE public.beats DROP COLUMN IF EXISTS sort_order;

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
