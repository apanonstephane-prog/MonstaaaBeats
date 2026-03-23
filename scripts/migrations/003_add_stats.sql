-- ============================================================
-- Migration 003 — Statistiques : écoutes, likes, visites
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Colonnes play_count et like_count sur la table beats
ALTER TABLE beats
  ADD COLUMN IF NOT EXISTS play_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count BIGINT NOT NULL DEFAULT 0;

-- 2. Table compteur de visites (une seule ligne, id=1)
CREATE TABLE IF NOT EXISTS site_visits (
  id    INT PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO site_visits (id, count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. RPC : incrémenter les écoutes d'un beat
CREATE OR REPLACE FUNCTION increment_play_count(beat_id BIGINT)
RETURNS void LANGUAGE sql AS $$
  UPDATE beats SET play_count = play_count + 1 WHERE id = beat_id;
$$;

-- 4. RPC : ajouter un like à un beat
CREATE OR REPLACE FUNCTION increment_like_count(beat_id BIGINT)
RETURNS void LANGUAGE sql AS $$
  UPDATE beats SET like_count = like_count + 1 WHERE id = beat_id;
$$;

-- 5. RPC : retirer un like d'un beat
CREATE OR REPLACE FUNCTION decrement_like_count(beat_id BIGINT)
RETURNS void LANGUAGE sql AS $$
  UPDATE beats SET like_count = GREATEST(0, like_count - 1) WHERE id = beat_id;
$$;

-- 6. RPC : incrémenter les visites du site et retourner le nouveau total
CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE v BIGINT;
BEGIN
  UPDATE site_visits
  SET count = count + 1, last_updated = NOW()
  WHERE id = 1
  RETURNING count INTO v;
  RETURN v;
END;
$$;

-- 7. Activer les fonctions pour la clé anon (accès public)
GRANT EXECUTE ON FUNCTION increment_play_count(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION increment_like_count(BIGINT)  TO anon;
GRANT EXECUTE ON FUNCTION decrement_like_count(BIGINT)  TO anon;
GRANT EXECUTE ON FUNCTION increment_site_visits()       TO anon;
