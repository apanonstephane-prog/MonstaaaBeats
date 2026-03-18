-- ============================================================
-- MONSTAAABEATS — Seed Data (12 beats de démonstration)
-- ============================================================
-- Run AFTER schema.sql
-- audio_url: replace with real Supabase Storage public URLs
-- Format: https://<project>.supabase.co/storage/v1/object/public/beats-audio/<filename>.mp3
-- ============================================================

INSERT INTO public.beats
  (name, genre, bpm, musical_key, duration_seconds, duration_label, beat_type, price_eur, tags, vibe, audio_url, is_featured, sort_order)
VALUES
  -- FREE BEATS
  ('Afrique 3000',   'Afrobeat',        98,  'Am', 204, '3:24', 'free', 0,    ARRAY['afrobeat'],            'Solaire',       '', FALSE, 1),
  ('L''Ovni Revient','Conscient',        85,  'Cm', 242, '4:02', 'free', 0,    ARRAY['conscient'],           'Introspectif',  '', TRUE,  5),
  ('Nuit Étoilée',   'Trap Mélo',       128,  'Bm', 195, '3:15', 'free', 0,    ARRAY['trap'],                'Hypnotique',    '', FALSE, 7),
  ('Plus Loin',      'Trap Conscient',  130,  'Fm', 185, '3:05', 'free', 0,    ARRAY['trap','conscient'],    'Élévation',     '', FALSE, 11),

  -- SALE BEATS
  ('Code Morse',     'Trap Conscient',  140,  'Fm', 178, '2:58', 'sale', 29,   ARRAY['trap','conscient'],    'Cryptique',     '', TRUE,  2),
  ('Morpheus',       'Trap Sombre',     135,  'Dm', 165, '2:45', 'sale', 29,   ARRAY['trap'],                'Onirique',      '', FALSE, 4),
  ('Requiem',        'Afrobeat',        105,  'Em', 213, '3:33', 'sale', 35,   ARRAY['afrobeat'],            'Mélancolique',  '', FALSE, 6),
  ('Gasy Vibes',     'Afrobeat',         92,  'Am', 228, '3:48', 'sale', 29,   ARRAY['afrobeat'],            'Chaleureux',    '', FALSE, 8),
  ('Sekel Block',    'Drill FR',        150,  'Gm', 150, '2:30', 'sale', 29,   ARRAY['drill'],               'Agressif',      '', FALSE, 10),
  ('Cancer Remix',   'Afrobeat Sombre',  72,  'Cm', 235, '3:55', 'sale', 39,   ARRAY['afrobeat'],            'Profond',       '', FALSE, 12),

  -- EXCLUSIVE BEATS
  ('Griffith',       'Drill FR',        145,  'Gm', 190, '3:10', 'excl', 199,  ARRAY['drill'],               'Épique',        '', TRUE,  3),
  ('Quête du Graal', 'Conscient',        90,  'Dm', 260, '4:20', 'excl', 249,  ARRAY['conscient'],           'Mystique',      '', TRUE,  9)
;

-- ============================================================
-- UPDATE AUDIO URLs (after uploading files to Supabase Storage)
-- ============================================================
-- Example:
-- UPDATE public.beats
--   SET audio_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/beats-audio/afrique-3000.mp3'
-- WHERE name = 'Afrique 3000';
--
-- Naming convention: lowercase, hyphens, no accents
-- afrique-3000.mp3, code-morse.mp3, griffith.mp3, etc.
