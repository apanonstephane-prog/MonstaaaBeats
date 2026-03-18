# MONSTAAABEATS

Beat store premium pour **Monstaaa L'Ovni** — vitrine + catalogue interactif avec lecteur audio intégré.

Stack : HTML/CSS/JS vanilla · Supabase · Vercel

---

## Setup rapide

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Noter votre **Project URL** et **anon public key** (Settings → API)

---

### 2. Créer la base de données

Dans l'éditeur SQL Supabase, exécuter dans l'ordre :

```sql
-- Étape 1 : Structure
\i sql/schema.sql

-- Étape 2 : Données de démonstration
\i sql/seed.sql
```

Ou copier-coller le contenu de chaque fichier directement dans l'éditeur SQL.

---

### 3. Créer le bucket Storage

1. Supabase → **Storage** → **New Bucket**
2. Nom : `beats-audio`
3. Activer **Public bucket** : OUI
4. Uploader vos fichiers MP3 dans ce bucket

Convention de nommage conseillée :
```
afrique-3000.mp3
code-morse.mp3
griffith.mp3
morpheus.mp3
lovni-revient.mp3
requiem.mp3
nuit-etoilee.mp3
gasy-vibes.mp3
quete-du-graal.mp3
sekel-block.mp3
plus-loin.mp3
cancer-remix.mp3
```

---

### 4. Mettre à jour les URLs audio

Après upload, mettre à jour les `audio_url` dans la table `beats` :

```sql
UPDATE public.beats
  SET audio_url = 'https://VOTRE_PROJECT.supabase.co/storage/v1/object/public/beats-audio/afrique-3000.mp3'
WHERE name = 'Afrique 3000';
-- Répéter pour chaque beat
```

Ou utiliser le dashboard Supabase → Table Editor → beats.

---

### 5. Variables d'environnement Vercel

1. Aller dans Vercel → Votre projet → **Settings → Environment Variables**
2. Ajouter :

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` (votre anon key) |

Ces variables sont injectées côté client — c'est sécurisé avec la clé `anon` + RLS activé.

---

### 6. Déploiement

```bash
# Via CLI Vercel
npm i -g vercel
vercel --prod

# Ou connecter le repo GitHub dans le dashboard Vercel
# Chaque push sur main déploie automatiquement
```

---

## Personnalisation

### Contacts
Dans `index.html`, chercher la section `/* ========== CONFIG ========== */` :

```javascript
const CONFIG = {
  whatsapp: '33600000000',      // ← Remplacer par votre numéro (sans +)
  email: 'bande2loups@gmail.com', // ← Votre email
  emailSubject: 'MONSTAAABEATS — Demande de licence',
  supabaseUrl: window.SUPABASE_URL || '',
  supabaseKey: window.SUPABASE_ANON_KEY || '',
};
```

### Textes du Hero
Chercher `<!-- HERO -->` dans `index.html` :
- Titre principal : balise `<h1>`
- Accroche éditoriale : balise `<p class="hero-editorial">`
- Sous-titre genres : balise `<p class="hero-genres">`

### Prix
Dans le seed SQL (`sql/seed.sql`) ou directement dans la table Supabase :
- Modifier la colonne `price_eur` pour chaque beat
- Les beats `free` ont toujours `price_eur = 0`
- Les beats `sale` commencent à 29€ (modifiable)
- Les beats `excl` commencent à 199€ (modifiable)

Dans le code JS, les prix sont affichés dynamiquement depuis la donnée.

### Ajouter un beat
```sql
INSERT INTO public.beats
  (name, genre, bpm, musical_key, duration_seconds, duration_label,
   beat_type, price_eur, tags, vibe, audio_url, is_featured, sort_order)
VALUES
  ('Mon Nouveau Beat', 'Trap', 140, 'Am', 180, '3:00',
   'sale', 29, ARRAY['trap'], 'Intense',
   'https://PROJET.supabase.co/storage/v1/object/public/beats-audio/mon-beat.mp3',
   FALSE, 13);
```

### Modifier les licences
Chercher `<!-- LICENCES -->` dans `index.html`.

---

## Structure des fichiers

```
MonstaaaBeats/
├── index.html          # Application complète (HTML + CSS + JS inline)
├── vercel.json         # Configuration déploiement Vercel
├── README.md           # Ce fichier
└── sql/
    ├── schema.sql      # Structure de la base de données
    └── seed.sql        # Données de démonstration (12 beats)
```

---

## Maintenance

- **Ajouter des beats** : INSERT dans la table + upload MP3 dans Storage
- **Modifier un prix** : UPDATE dans la table ou via dashboard
- **Changer un statut** (free → sale) : UPDATE `beat_type` + `price_eur`
- **Mettre en avant un beat** : UPDATE `is_featured = TRUE`
- **Ordonner les beats** : UPDATE `sort_order`
- **Retirer une exclusivité** : `is_featured = FALSE`, changer le type si vendu

---

## Notes techniques

- L'app charge les beats au démarrage via Supabase REST API
- Si Supabase n'est pas configuré, un jeu de données placeholder est utilisé automatiquement
- Un seul objet `Audio` global gère la lecture — pas de conflit possible
- Le sticky player s'affiche au premier play, persiste jusqu'à la fin de session
- Les filtres et la recherche sont côté client (sur les données déjà chargées)
- `prefers-reduced-motion` est respecté pour toutes les animations

---

© 2026 MONSTAAABEATS · Monstaaa L'Ovni · Tous droits réservés
