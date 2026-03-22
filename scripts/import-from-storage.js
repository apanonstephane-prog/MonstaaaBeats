#!/usr/bin/env node
/**
 * MONSTAAABEATS — Import beats depuis le Storage Bucket
 * ======================================================
 * Lit tous les fichiers du bucket "beats-audio" et les insère
 * automatiquement dans la table "beats".
 *
 * Usage :
 *   node scripts/import-from-storage.js
 *
 * Comportement :
 *   - Beat absent de la table  → créé avec les valeurs par défaut ci-dessous
 *   - Beat déjà présent        → seul audio_url est mis à jour (genre/prix conservés)
 *
 * Valeurs par défaut (modifiables ci-dessous) :
 *   genre     = "À définir"
 *   beat_type = "sale"
 *   price_eur = 29
 */

'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
const PROJECT_REF = 'jiwngpuaawprlaxqqfwv';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppd25ncHVhYXdwcmxheHFxZnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjE4NDAsImV4cCI6MjA4OTM5Nzg0MH0.0bWnRqBmPwP93dl-WuORt7t3GrFKGeu85Bm-xRetH0I';
const BUCKET      = 'beats-audio';

const DEFAULTS = {
  genre:     'À définir',  // ← modifie si tu veux un genre par défaut différent
  beat_type: 'sale',
  price_eur: 29,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const headers = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type':  'application/json',
};

async function api(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path} — ${text}`);
  return text ? JSON.parse(text) : null;
}

function publicUrl(filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Lister tous les MP3 du bucket
  console.log(`\n📦 Lecture du bucket "${BUCKET}"…`);
  const files = await api('POST', `/storage/v1/object/list/${BUCKET}`, {
    limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' },
  });
  const mp3s = (files || []).filter(f => f.name?.toLowerCase().endsWith('.mp3'));
  console.log(`   → ${mp3s.length} fichier(s) MP3 trouvé(s)`);
  if (mp3s.length === 0) return;

  // 2. Récupérer les beats déjà dans la table
  const existing = await api('GET', '/rest/v1/beats?select=id,name&limit=1000');
  const existingMap = new Map((existing || []).map(b => [b.name, b.id]));
  console.log(`   → ${existingMap.size} beat(s) déjà en table\n`);

  const toInsert = [];
  const toUpdate = [];

  for (const f of mp3s) {
    const name = f.name.replace(/\.mp3$/i, '');
    const audio_url = publicUrl(f.name);
    if (existingMap.has(name)) {
      toUpdate.push({ id: existingMap.get(name), name, audio_url });
    } else {
      toInsert.push({ name, audio_url, ...DEFAULTS });
    }
  }

  // 3. Insérer les nouveaux beats
  if (toInsert.length > 0) {
    await api('POST', '/rest/v1/beats', toInsert, {
      'Prefer': 'return=minimal',
    });
    console.log(`✅ ${toInsert.length} nouveau(x) beat(s) créé(s) :`);
    toInsert.forEach(r => console.log(`   + ${r.name}`));
  }

  // 4. Mettre à jour audio_url des beats existants (sans toucher genre/prix)
  if (toUpdate.length > 0) {
    for (const b of toUpdate) {
      await api('PATCH', `/rest/v1/beats?id=eq.${b.id}`, { audio_url: b.audio_url }, {
        'Prefer': 'return=minimal',
      });
    }
    console.log(`\n🔄 ${toUpdate.length} beat(s) existant(s) mis à jour (audio_url uniquement) :`);
    toUpdate.forEach(r => console.log(`   ~ ${r.name}`));
  }

  console.log('\n💡 Ajuste genre, beat_type et price_eur dans Table Editor pour les nouveaux beats.\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});
