#!/usr/bin/env node
/**
 * update-site.js — Sincronizează site-ul de prezentare (docs/) cu tipurile de documente din aplicație.
 *
 * Rulat automat de hook-ul PostToolUse când se editează types/index.ts sau appKnowledge.ts.
 * Poate fi rulat manual: node scripts/update-site.js
 *
 * Ce face:
 * - Extrage DOCUMENT_TYPE_LABELS din types/index.ts via regex
 * - Actualizează numărul de tipuri în docs/index.html (<!-- DOSAR:DOC_COUNT_START -->)
 * - Actualizează lista de chips în docs/index.html (<!-- DOSAR:DOC_CHIPS_START -->)
 * - Actualizează FAQ-ul cu tipuri de documente în docs/support.html (<!-- DOSAR:FAQ_DOC_TYPES_START -->)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── Emoji map pentru tipuri de documente ────────────────────────────────────

const EMOJI_MAP = {
  buletin: '🪪',
  pasaport: '✈️',
  permis_auto: '🚗',
  talon: '📋',
  carte_auto: '📝',
  rca: '🛡️',
  casco: '🛡️',
  itp: '🔧',
  vigneta: '🛣️',
  act_proprietate: '🏠',
  cadastru: '📐',
  factura: '🧾',
  impozit_proprietate: '🏛️',
  contract: '📄',
  card: '💳',
  garantie: '🎟️',
  reteta_medicala: '💊',
  analize_medicale: '🩺',
  bon_cumparaturi: '🧾',
  bon_parcare: '🅿️',
  pad: '🔥',
  stingator_incendiu: '🧯',
  abonament: '🔄',
  vaccin_animal: '💉',
  deparazitare: '🐛',
  vizita_vet: '🐾',
  bilet: '🎫',
  certificat_inregistrare: '🏢',
  autorizatie_activitate: '📋',
  act_constitutiv: '📜',
  certificat_tva: '💼',
  asigurare_profesionala: '🛡️',
  altul: '📁',
  custom: '⭐',
};

// Tipuri evidențiate (chip hl) — cele mai comune/importante
const HIGHLIGHTED_TYPES = new Set([
  'buletin',
  'pasaport',
  'permis_auto',
  'talon',
  'rca',
  'casco',
  'itp',
  'vigneta',
]);

// ─── Extrage DOCUMENT_TYPE_LABELS din types/index.ts ─────────────────────────

function extractDocumentTypes() {
  const typesPath = path.join(ROOT, 'types', 'index.ts');
  const content = fs.readFileSync(typesPath, 'utf8');

  // Găsește blocul DOCUMENT_TYPE_LABELS: { ... }
  const blockMatch = content.match(/DOCUMENT_TYPE_LABELS[^=]*=\s*\{([^}]+)\}/s);
  if (!blockMatch) {
    throw new Error('Nu am găsit DOCUMENT_TYPE_LABELS în types/index.ts');
  }

  const block = blockMatch[1];
  const types = {};

  // Parsează linii de forma: key: 'Label',
  const lineRe = /^\s*(\w+):\s*'([^']+)'/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    types[m[1]] = m[2];
  }

  return types;
}

// ─── Generează HTML chips ─────────────────────────────────────────────────────

function generateChipsHtml(types) {
  const lines = [];

  for (const [key, label] of Object.entries(types)) {
    if (key === 'altul') continue; // "Altele" e implicat
    const emoji = EMOJI_MAP[key] || '📄';
    const isHighlighted = HIGHLIGHTED_TYPES.has(key);
    const cssClass = isHighlighted ? 'chip hl reveal' : 'chip reveal';

    if (key === 'custom') {
      lines.push(`    <span class="${cssClass}">${emoji} Tip personalizat</span>`);
    } else {
      lines.push(`    <span class="${cssClass}">${emoji} ${label}</span>`);
    }
  }

  return lines.join('\n');
}

// ─── Generează textul FAQ cu tipuri de documente ──────────────────────────────

function generateFaqDocTypesHtml(types) {
  const standardTypes = Object.entries(types)
    .filter(([k]) => k !== 'custom' && k !== 'altul')
    .map(([, label]) => label);

  const count = standardTypes.length;
  const typeList = standardTypes.join(', ');

  return `    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">
        Ce tipuri de documente suportă aplicația?
        <span class="faq-arrow">▼</span>
      </button>
      <div class="faq-a">
        Aplicația vine cu ${count} tipuri predefinite: ${typeList}.<br/><br/>
        Pentru orice document care nu se încadrează, poți folosi tipul <strong>„Altele"</strong> sau crea un <strong>tip personalizat</strong> (Acte → Adaugă document → Tip → derulează jos → „Tip personalizat").
      </div>
    </div>`;
}

// ─── Înlocuiește conținut între markeri ───────────────────────────────────────

function replaceMarker(html, markerName, newContent) {
  const startMarker = `<!-- DOSAR:${markerName}_START -->`;
  const endMarker = `<!-- DOSAR:${markerName}_END -->`;

  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(`  [SKIP] Marker ${markerName} nu a fost găsit`);
    return html;
  }

  return (
    html.slice(0, startIdx + startMarker.length) + '\n' + newContent + '\n  ' + html.slice(endIdx)
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('[update-site] Sincronizare docs/ ...');

  let types;
  try {
    types = extractDocumentTypes();
  } catch (e) {
    console.error('[update-site] Eroare extragere tipuri:', e.message);
    process.exit(1);
  }

  const standardCount = Object.keys(types).filter(k => k !== 'custom' && k !== 'altul').length;
  console.log(`  Tipuri găsite: ${Object.keys(types).length} total, ${standardCount} standard`);

  // ── docs/index.html ──────────────────────────────────────────────────────
  const indexPath = path.join(ROOT, 'docs', 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Actualizează numărul
  indexHtml = replaceMarker(indexHtml, 'DOC_COUNT', `${standardCount}+`);

  // Actualizează chips
  const chipsHtml = generateChipsHtml(types);
  // Chips sunt în interiorul <div class="chips-wrap"> — marcajele înconjoară div-ul întreg
  const chipsBlock = `  <div class="chips-wrap">\n${chipsHtml}\n  </div>`;
  indexHtml = replaceMarker(indexHtml, 'DOC_CHIPS', chipsBlock);

  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('  [OK] docs/index.html actualizat');

  // ── docs/support.html ────────────────────────────────────────────────────
  const supportPath = path.join(ROOT, 'docs', 'support.html');
  let supportHtml = fs.readFileSync(supportPath, 'utf8');

  const faqHtml = generateFaqDocTypesHtml(types);
  supportHtml = replaceMarker(supportHtml, 'FAQ_DOC_TYPES', faqHtml);

  fs.writeFileSync(supportPath, supportHtml, 'utf8');
  console.log('  [OK] docs/support.html actualizat');

  console.log('[update-site] Done.');
}

main();
