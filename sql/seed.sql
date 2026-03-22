-- ============================================================
-- MONSTAAABEATS — Seed Data (idempotent via ON CONFLICT)
-- ============================================================
-- Prérequis : schema.sql déjà appliqué
-- audio_url : URL publique du MP3 depuis le bucket beats-audio
-- cover_url : URL publique de la cover (optionnel, pour compilations futures)
-- beat_type : 'free' | 'sale' | 'excl'
-- price_eur : 0 si free, sinon prix en euros
-- ============================================================

INSERT INTO public.beats
  (name, genre, beat_type, price_eur, audio_url, cover_url, is_featured)
VALUES
  -- FREE BEATS
  ('Afrique 3000',    'Afrobeat',        'free', 0,   '', '', FALSE),
  ('L''Ovni Revient', 'Conscient',        'free', 0,   '', '', TRUE),
  ('Nuit Étoilée',    'Trap Mélo',        'free', 0,   '', '', FALSE),
  ('Plus Loin',       'Trap Conscient',   'free', 0,   '', '', FALSE),

  -- SALE BEATS
  ('Code Morse',      'Trap Conscient',   'sale', 29,  '', '', TRUE),
  ('Morpheus',        'Trap Sombre',      'sale', 29,  '', '', FALSE),
  ('Requiem',         'Afrobeat',         'sale', 35,  '', '', FALSE),
  ('Gasy Vibes',      'Afrobeat',         'sale', 29,  '', '', FALSE),
  ('Sekel Block',     'Drill FR',         'sale', 29,  '', '', FALSE),
  ('Cancer Remix',    'Afrobeat Sombre',  'sale', 39,  '', '', FALSE),

  -- EXCLUSIVE BEATS
  ('Griffith',        'Drill FR',         'excl', 199, '', '', TRUE),
  ('Quête du Graal',  'Conscient',        'excl', 249, '', '', TRUE)
ON CONFLICT (name) DO NOTHING;
