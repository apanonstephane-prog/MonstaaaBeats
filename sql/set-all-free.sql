-- ============================================================
-- MONSTAAABEATS — Passe tous les beats actuels en Gratuit
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- Passer tous les beats en gratuit + prix 0
UPDATE public.beats
SET beat_type = 'free',
    price_eur = 0;

-- Vérification
SELECT
  COUNT(*)                                    AS total,
  COUNT(*) FILTER (WHERE beat_type = 'free') AS gratuits,
  COUNT(*) FILTER (WHERE beat_type = 'sale') AS a_vendre,
  COUNT(*) FILTER (WHERE beat_type = 'excl') AS exclusifs
FROM public.beats;
