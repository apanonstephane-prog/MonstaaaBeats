#!/usr/bin/env node
/**
 * MONSTAAABEATS — Générateur de covers automatique
 * =================================================
 * Génère 1 cover SVG par beat (basé sur le nom + genre),
 * l'uploade dans le bucket Supabase "beats-covers",
 * et met à jour le champ cover_url dans la table beats.
 *
 * Usage :
 *   node scripts/generate-covers.js              → tous les beats sans cover
 *   node scripts/generate-covers.js --force      → (ré)génère toutes les covers
 *   node scripts/generate-covers.js --id 42      → un beat précis par ID
 *
 * Aucune dépendance externe — uniquement l'API Supabase REST + Node.js >= 18
 */

'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
const PROJECT_REF  = 'jiwngpuaawprlaxqqfwv';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppd25ncHVhYXdwcmxheHFxZnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjE4NDAsImV4cCI6MjA4OTM5Nzg0MH0.0bWnRqBmPwP93dl-WuORt7t3GrFKGeu85Bm-xRetH0I';
const BUCKET       = 'beats-covers';
const COVER_SIZE   = 500; // px (carré)

// ─── Palettes de couleurs ─────────────────────────────────────────────────────
// Chaque palette = [fond_sombre, accent, accent_clair]
const PALETTES = [
  ['#0d0d1a', '#7c3aed', '#a78bfa'],  // violet
  ['#0a0f1e', '#0ea5e9', '#38bdf8'],  // bleu
  ['#0d1a10', '#16a34a', '#4ade80'],  // vert
  ['#1a0d0a', '#dc2626', '#f87171'],  // rouge
  ['#1a150a', '#d97706', '#fbbf24'],  // or
  ['#1a0d17', '#db2777', '#f472b6'],  // rose
  ['#0d1a1a', '#0d9488', '#2dd4bf'],  // cyan
  ['#150d1a', '#9333ea', '#c084fc'],  // mauve
  ['#1a1209', '#ea580c', '#fb923c'],  // orange
  ['#0a1020', '#3b82f6', '#93c5fd'],  // bleu clair
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Hash simple d'une chaîne → entier positif */
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Choisit une palette cohérente en fonction du nom du beat */
function pickPalette(name) {
  return PALETTES[hashStr(name) % PALETTES.length];
}

/**
 * Découpe un texte long en lignes de max `maxChars` caractères
 * en respectant les mots (pas de coupure en plein mot).
 */
function wrapText(text, maxChars = 16) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

/**
 * Génère le SVG 500×500 pour un beat donné.
 * Retour : string SVG.
 */
function generateSVG(beatName, genre) {
  const [bg, accent, accentLight] = pickPalette(beatName);
  const hash = hashStr(beatName);

  // Positions pseudo-aléatoires des cercles décoratifs (déterministes)
  const c1x = 350 + (hash % 100);
  const c1y = 80  + (hash % 60);
  const c2x = 60  + (hash % 80);
  const c2y = 380 + (hash % 70);
  const c3x = 200 + (hash % 120);
  const c3y = 480 + (hash % 40);

  // Lignes décoratives (waveform stylisé)
  const waveHeights = Array.from({ length: 20 }, (_, i) => {
    const v = Math.abs(Math.sin((hash + i * 7) * 0.4) * 60 + Math.sin((hash + i * 3) * 0.7) * 30);
    return Math.max(8, Math.round(v));
  });
  const barW  = 10;
  const barGap = 4;
  const totalW = waveHeights.length * (barW + barGap) - barGap;
  const waveX0 = (COVER_SIZE - totalW) / 2;
  const waveY  = 340;

  const waveBars = waveHeights.map((h, i) => {
    const x = waveX0 + i * (barW + barGap);
    return `<rect x="${x}" y="${waveY - h}" width="${barW}" height="${h}" rx="3" fill="${accent}" opacity="0.7"/>`;
  }).join('\n    ');

  // Texte du nom (multi-lignes si nécessaire)
  const nameLines = wrapText(beatName.toUpperCase(), 14);
  const fontSize  = nameLines.length > 1 ? 40 : 48;
  const lineH     = fontSize * 1.2;
  const totalTextH = nameLines.length * lineH;
  const textStartY = 195 - totalTextH / 2 + fontSize * 0.35;

  const nameTextEls = nameLines.map((line, i) =>
    `<text x="250" y="${textStartY + i * lineH}"
           text-anchor="middle"
           font-family="Arial Black, Impact, sans-serif"
           font-size="${fontSize}"
           font-weight="900"
           letter-spacing="2"
           fill="white">${escapeXml(line)}</text>`
  ).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${COVER_SIZE}" height="${COVER_SIZE}" viewBox="0 0 ${COVER_SIZE} ${COVER_SIZE}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${shiftColor(bg, 15)}"/>
    </linearGradient>
    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="${COVER_SIZE}" height="${COVER_SIZE}" fill="url(#bg)"/>

  <!-- Cercles décoratifs -->
  <circle cx="${c1x}" cy="${c1y}" r="160" fill="${accent}" opacity="0.07"/>
  <circle cx="${c2x}" cy="${c2y}" r="100" fill="${accentLight}" opacity="0.05"/>
  <circle cx="${c3x}" cy="${c3y}" r="220" fill="${accent}" opacity="0.04"/>

  <!-- Trait accent haut -->
  <rect x="0" y="0" width="${COVER_SIZE}" height="3" fill="${accent}" opacity="0.8"/>

  <!-- Nom du beat -->
  ${nameTextEls}

  <!-- Séparateur -->
  <rect x="140" y="${textStartY + nameLines.length * lineH + 14}"
        width="220" height="1" fill="url(#lineGrad)" opacity="0.6"/>

  <!-- Genre -->
  <text x="250" y="${textStartY + nameLines.length * lineH + 40}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="14"
        font-weight="400"
        letter-spacing="4"
        fill="${accentLight}"
        opacity="0.9">${escapeXml(genre.toUpperCase())}</text>

  <!-- Waveform décoratif -->
  ${waveBars}

  <!-- Trait accent bas -->
  <rect x="0" y="${COVER_SIZE - 3}" width="${COVER_SIZE}" height="3" fill="${accent}" opacity="0.4"/>

  <!-- Branding -->
  <text x="250" y="${COVER_SIZE - 16}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="11"
        letter-spacing="6"
        fill="white"
        opacity="0.3">MONSTAAABEATS</text>
</svg>`.trim();
}

/** Échappe les caractères XML spéciaux dans le texte SVG */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Éclaircit légèrement une couleur hex (pour le dégradé de fond) */
function shiftColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8)  & 0xff) + amount);
  const b = Math.min(255, (n         & 0xff) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// ─── API Supabase ─────────────────────────────────────────────────────────────

const HEADERS = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

async function dbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function dbPatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table}#${id} → HTTP ${res.status}: ${await res.text()}`);
}

async function storageEnsureBucket() {
  // Essaie de créer le bucket (idempotent — pas d'erreur si déjà existant)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // 200 = créé, 409 = déjà existant → les deux sont OK
  if (!res.ok && res.status !== 409) {
    const txt = await res.text();
    // Certaines versions retournent 400 "already exists" — on l'ignore
    if (!txt.includes('already exists') && !txt.includes('duplicate')) {
      console.warn(`  ⚠ Impossible de créer le bucket "${BUCKET}": ${txt}`);
    }
  }
}

async function storageUpload(filename, svgContent) {
  const bytes   = Buffer.from(svgContent, 'utf8');
  const url     = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

  // Tente un upsert (POST + x-upsert: true)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type':  'image/svg+xml',
      'Cache-Control': '3600',
      'x-upsert':      'true',
    },
    body: bytes,
  });

  if (!res.ok) throw new Error(`Upload "${filename}" → HTTP ${res.status}: ${await res.text()}`);

  // URL publique
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args  = process.argv.slice(2);
  const force = args.includes('--force');
  const idArg = args.includes('--id') ? parseInt(args[args.indexOf('--id') + 1]) : null;

  console.log('🎨  MONSTAAABEATS — Générateur de covers\n');

  // 1. Récupérer les beats
  let query = 'beats?select=id,name,genre,cover_url&order=id.asc';
  if (idArg) query = `beats?select=id,name,genre,cover_url&id=eq.${idArg}`;
  const beats = await dbGet(query);

  const targets = force ? beats : beats.filter(b => !b.cover_url);
  console.log(`   ${beats.length} beat(s) en base — ${targets.length} à traiter\n`);

  if (targets.length === 0) {
    console.log('✅  Tous les beats ont déjà une cover. Utilisez --force pour les régénérer.');
    return;
  }

  // 2. Créer le bucket si besoin
  await storageEnsureBucket();

  // 3. Générer + uploader + mettre à jour
  let ok = 0;
  let fail = 0;

  for (const beat of targets) {
    const label = `[${String(beat.id).padStart(3, ' ')}] ${beat.name}`;
    try {
      const svg      = generateSVG(beat.name, beat.genre);
      const filename = `${beat.id}-${beat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
      const url      = await storageUpload(filename, svg);
      await dbPatch('beats', beat.id, { cover_url: url });
      console.log(`   ✓  ${label}`);
      console.log(`       → ${url}`);
      ok++;
    } catch (err) {
      console.error(`   ✗  ${label} — ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`   ✅  ${ok} cover(s) générée(s) avec succès${fail ? `   ❌  ${fail} échec(s)` : ''}`);
  console.log(`   💡  Rechargez le site pour voir les covers.\n`);
}

main().catch(err => {
  console.error('❌  Erreur fatale:', err.message);
  process.exit(1);
});
