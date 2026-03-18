#!/usr/bin/env node
/**
 * MONSTAAABEATS — Script de build Vercel
 * ========================================
 * Injecte les variables d'environnement Supabase dans index.html
 * et sort le résultat dans dist/index.html pour Vercel.
 *
 * Variables attendues :
 *   SUPABASE_URL       (ex: https://xxxx.supabase.co)
 *   SUPABASE_ANON_KEY  (clé JWT anon, publique)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const supabaseUrl = process.env.SUPABASE_URL      || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  // Ne pas planter le build — Vercel peut builder avant que les secrets soient configurés
  console.warn('[build] ATTENTION : SUPABASE_URL ou SUPABASE_ANON_KEY manquant.');
  console.warn('[build] Le site utilisera le fallback de données hardcodées.');
}

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Injecter les credentials Supabase
if (supabaseUrl) {
  html = html.replace(
    /supabaseUrl:\s*(?:\(typeof window[^)]*\)\s*\|\|\s*)?'[^']*'/,
    `supabaseUrl: '${supabaseUrl}'`,
  );
}
if (supabaseKey) {
  html = html.replace(
    /supabaseKey:\s*(?:\(typeof window[^)]*\)\s*\|\|\s*)?'[^']*'/,
    `supabaseKey: '${supabaseKey}'`,
  );
}

// Créer le dossier dist/
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

console.log(`[build] dist/index.html généré (${(html.length / 1024).toFixed(1)} KB)`);
if (supabaseUrl) console.log(`[build] Supabase URL : ${supabaseUrl}`);
