-- ============================================================
-- MONSTAAABEATS — Import automatique depuis Storage
-- ============================================================
-- Colle ce fichier dans Supabase SQL Editor et clique Run.
-- Source : https://supabase.com/dashboard/project/jiwngpuaawprlaxqqfwv/sql
--
-- Ce que ça fait :
--   • Crée une ligne dans "beats" pour chaque MP3 du bucket beats-audio
--   • Si le beat existe déjà (même nom) → met à jour audio_url uniquement
--   • Valeurs par défaut : genre "À définir", type "sale", prix 29€
--   → Modifie ensuite genre/type/prix dans Table Editor
-- ============================================================

INSERT INTO public.beats (name, genre, beat_type, price_eur, audio_url)
SELECT
  -- Nom = nom du fichier sans l'extension .mp3
  regexp_replace(o.name, '\.mp3$', '', 'i')                          AS name,

  'À définir'                                                         AS genre,
  'sale'                                                              AS beat_type,
  29                                                                  AS price_eur,

  -- URL publique du fichier (espaces encodés en %20)
  'https://jiwngpuaawprlaxqqfwv.supabase.co/storage/v1/object/public/beats-audio/'
  || replace(o.name, ' ', '%20')                                      AS audio_url

FROM storage.objects o
WHERE o.bucket_id = 'beats-audio'
  AND o.name ILIKE '%.mp3'

ON CONFLICT (name)
  DO UPDATE SET audio_url = EXCLUDED.audio_url;

-- Résumé : combien de beats dans la table après import
SELECT COUNT(*) AS total_beats FROM public.beats;
