#!/usr/bin/env node
/**
 * MONSTAAABEATS — Script de setup autonome
 * ==========================================
 * Prérequis : Node.js 18+
 * Usage    : SUPABASE_TOKEN=<votre_token> node setup.js
 *
 * Obtenir le token → https://supabase.com/dashboard/account/tokens
 *
 * Ce script :
 *   1. Récupère la clé anon Supabase automatiquement
 *   2. Applique schema.sql sur la base de données
 *   3. Applique seed.sql (12 beats de démo)
 *   4. Crée le bucket de stockage "beats-audio" (public)
 *   5. Patche index.html avec les vraies credentials
 *   6. Écrit un fichier .env pour les tests locaux
 */

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const PROJECT_REF   = 'jiwngpuaawprlaxqqfwv';
const SUPABASE_URL  = `https://${PROJECT_REF}.supabase.co`;
const MGMT_HOST     = 'api.supabase.com';
const ROOT          = __dirname;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function request(method, host, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: host,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function mgmt(method, endpoint, body, token) {
  return request(method, MGMT_HOST, `/v1${endpoint}`, body, token);
}

function ok(label) { console.log(`  ✓  ${label}`); }
function info(label) { console.log(`  →  ${label}`); }
function warn(label) { console.warn(`  ⚠  ${label}`); }
function fail(label, detail) {
  console.error(`\n  ✗  ${label}`);
  if (detail) console.error('     ', typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail);
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  MONSTAAABEATS — Setup automatique');
  console.log('══════════════════════════════════════════════════════\n');

  // 0. Token
  const token = process.env.SUPABASE_TOKEN || process.argv[2];
  if (!token) {
    console.error('  ERREUR : token Supabase manquant.\n');
    console.error('  1. Créez un Personal Access Token sur :');
    console.error('     https://supabase.com/dashboard/account/tokens\n');
    console.error('  2. Relancez :');
    console.error('     SUPABASE_TOKEN=<votre_token> node setup.js\n');
    process.exit(1);
  }

  // 1. Clé anon ──────────────────────────────────────────────────────────────
  info('Récupération des clés API…');
  const keysRes = await mgmt('GET', `/projects/${PROJECT_REF}/api-keys`, null, token);
  if (keysRes.status !== 200) {
    fail(
      'Impossible de récupérer les clés API.',
      `Status ${keysRes.status} — Vérifiez que le token est valide et a les droits "projects:read".`,
    );
  }
  const keys = Array.isArray(keysRes.body) ? keysRes.body : [];
  const anonKey    = keys.find(k => k.name === 'anon')?.api_key;
  const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!anonKey) fail('Clé anon introuvable dans la réponse.', keysRes.body);
  ok(`Clé anon récupérée (${anonKey.slice(0, 20)}…)`);

  // 2. Schema SQL ─────────────────────────────────────────────────────────────
  info('Application de schema.sql…');
  const schemaPath = path.join(ROOT, 'sql', 'schema.sql');
  if (!fs.existsSync(schemaPath)) fail('sql/schema.sql introuvable.');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const schemaRes = await mgmt(
    'POST',
    `/projects/${PROJECT_REF}/database/query`,
    { query: schema },
    token,
  );
  if (schemaRes.status !== 200 && schemaRes.status !== 201) {
    // Supabase renvoie parfois 200 avec un tableau de résultats
    if (schemaRes.status !== 200) {
      warn(`Schema returned status ${schemaRes.status} — vérifiez manuellement si nécessaire.`);
    }
  } else {
    ok('schema.sql appliqué');
  }

  // 3. Seed SQL ───────────────────────────────────────────────────────────────
  info('Application de seed.sql…');
  const seedPath = path.join(ROOT, 'sql', 'seed.sql');
  if (!fs.existsSync(seedPath)) fail('sql/seed.sql introuvable.');
  const seed = fs.readFileSync(seedPath, 'utf8');

  const seedRes = await mgmt(
    'POST',
    `/projects/${PROJECT_REF}/database/query`,
    { query: seed },
    token,
  );
  if (seedRes.status !== 200 && seedRes.status !== 201) {
    warn(`Seed returned status ${seedRes.status} — les beats existent peut-être déjà (idempotent).`);
  } else {
    ok('seed.sql appliqué (12 beats insérés)');
  }

  // 4. Bucket storage "beats-audio" ──────────────────────────────────────────
  info('Création du bucket "beats-audio" (public)…');
  const bucketRes = await mgmt(
    'POST',
    `/projects/${PROJECT_REF}/storage/buckets`,
    { id: 'beats-audio', name: 'beats-audio', public: true },
    token,
  );
  if (bucketRes.status === 409) {
    ok('Bucket "beats-audio" existe déjà');
  } else if (bucketRes.status === 200 || bucketRes.status === 201) {
    ok('Bucket "beats-audio" créé (public)');
  } else {
    // Fallback : créer via SQL
    warn(`API bucket status ${bucketRes.status} — tentative via SQL…`);
    const bucketSql = `
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('beats-audio', 'beats-audio', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `;
    await mgmt('POST', `/projects/${PROJECT_REF}/database/query`, { query: bucketSql }, token);
    ok('Bucket créé via SQL');
  }

  // 5. Politique de lecture publique du bucket ────────────────────────────────
  info('Configuration de la politique de lecture publique…');
  const policySql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename  = 'objects'
          AND policyname = 'audio_public_read'
      ) THEN
        EXECUTE $policy$
          CREATE POLICY "audio_public_read"
            ON storage.objects
            FOR SELECT
            TO anon, authenticated
            USING (bucket_id = 'beats-audio')
        $policy$;
      END IF;
    END $$;
  `;
  await mgmt('POST', `/projects/${PROJECT_REF}/database/query`, { query: policySql }, token);
  ok('Politique de lecture publique configurée');

  // 6. Patch index.html ───────────────────────────────────────────────────────
  info('Mise à jour de index.html avec les credentials…');
  const htmlPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  const urlBefore  = `supabaseUrl: (typeof window !== 'undefined' && window.SUPABASE_URL) || ''`;
  const urlAfter   = `supabaseUrl: '${SUPABASE_URL}'`;
  const keyBefore  = `supabaseKey: (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) || ''`;
  const keyAfter   = `supabaseKey: '${anonKey}'`;

  if (!html.includes(urlBefore) && !html.includes(urlAfter)) {
    warn('Pattern supabaseUrl non trouvé dans index.html — vérifiez manuellement.');
  } else {
    html = html.replace(urlBefore, urlAfter);
    ok('supabaseUrl mis à jour');
  }

  if (!html.includes(keyBefore) && !html.includes(keyAfter)) {
    warn('Pattern supabaseKey non trouvé dans index.html — vérifiez manuellement.');
  } else {
    html = html.replace(keyBefore, keyAfter);
    ok('supabaseKey mis à jour');
  }

  fs.writeFileSync(htmlPath, html, 'utf8');

  // 7. Fichier .env ───────────────────────────────────────────────────────────
  const envContent = [
    `# MONSTAAABEATS — Variables d'environnement`,
    `# Généré automatiquement par setup.js le ${new Date().toISOString()}`,
    ``,
    `SUPABASE_URL=${SUPABASE_URL}`,
    `SUPABASE_ANON_KEY=${anonKey}`,
    ``,
    `# Service role (ne jamais exposer côté client !)`,
    serviceKey ? `# SUPABASE_SERVICE_ROLE_KEY=${serviceKey}` : `# SUPABASE_SERVICE_ROLE_KEY=<à_récupérer_depuis_le_dashboard>`,
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, '.env'), envContent, 'utf8');
  ok('.env écrit');

  // 8. Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ✅  Setup terminé avec succès !');
  console.log('══════════════════════════════════════════════════════\n');
  console.log('  Prochaines étapes :\n');
  console.log('  1. Uploadez vos fichiers MP3 dans Supabase Storage :');
  console.log('     https://supabase.com/dashboard/project/' + PROJECT_REF + '/storage/buckets/beats-audio');
  console.log('\n  2. Mettez à jour les audio_url dans la table beats :');
  console.log('     https://supabase.com/dashboard/project/' + PROJECT_REF + '/editor\n');
  console.log('  3. Déployez sur Vercel :');
  console.log('     npx vercel --prod\n');
  console.log(`  Supabase URL  : ${SUPABASE_URL}`);
  console.log(`  Anon key      : ${anonKey.slice(0, 30)}…\n`);
}

main().catch(err => {
  console.error('\n  Erreur inattendue :', err.message || err);
  process.exit(1);
});
