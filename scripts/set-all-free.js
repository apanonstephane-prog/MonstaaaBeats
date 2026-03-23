#!/usr/bin/env node
/**
 * MONSTAAABEATS — Passe tous les beats actuels en "Gratuit"
 * Usage : node scripts/set-all-free.js
 */
'use strict';

const PROJECT_REF = 'jiwngpuaawprlaxqqfwv';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppd25ncHVhYXdwcmxheHFxZnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjE4NDAsImV4cCI6MjA4OTM5Nzg0MH0.0bWnRqBmPwP93dl-WuORt7t3GrFKGeu85Bm-xRetH0I';

async function api(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('🔄 Passage de tous les beats en Gratuit...\n');

  // Count before
  const before = await api('GET', '/rest/v1/beats?select=id,name,beat_type,price_eur');
  console.log(`   → ${before.length} beat(s) trouvé(s) en base`);
  const alreadyFree = before.filter(b => b.beat_type === 'free').length;
  const toUpdate = before.filter(b => b.beat_type !== 'free').length;
  console.log(`   → ${alreadyFree} déjà gratuit(s), ${toUpdate} à mettre à jour\n`);

  // Update all to free + price 0
  const updated = await api('PATCH', '/rest/v1/beats?id=gte.0', {
    beat_type: 'free',
    price_eur: 0,
  });

  console.log(`✅ ${updated.length} beat(s) mis à jour → beat_type=free, price_eur=0`);
  console.log('\nTous les beats sont maintenant gratuits et téléchargeables.');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
