// ════════════════════════════════════════════════════════════════
// AKTIEKOMPAS — BUILD SCRIPT
// ════════════════════════════════════════════════════════════════
// Læser markdown-filer fra _data/analyser/ og genererer HTML-sider
// i analyser/<slug>/index.html med Aktiekompas-designet.
//
// Køres automatisk når Vercel deployer.
// ════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, '_data', 'analyser');
const OUT_DIR = path.join(ROOT, 'analyser');
const TEMPLATE_PATH = path.join(ROOT, '_templates', 'analyse.html');

// Sample data so the demo works even before user creates content
const DEMO_ANALYSES = ['vestas-vinden-vender', 'tesla-kanalbrudd-nedad', 'genmab-pipeline-undervurderes'];

function main() {
  // Make sure folders exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✓ Created _data/analyser folder');
  }
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Read all markdown files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
  console.log(`Building ${files.length} analyses...`);

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('✗ Template not found at ' + TEMPLATE_PATH);
    process.exit(1);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const analyses = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // Compute slug from filename
    const slug = file.replace(/\.md$/, '');

    // Render markdown to HTML
    const bodyHtml = marked.parse(content);

    // Build the page from template
    const page = renderTemplate(template, data, bodyHtml, slug);

    // Write to output folder
    const outFolder = path.join(OUT_DIR, slug);
    if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });
    fs.writeFileSync(path.join(outFolder, 'index.html'), page);

    analyses.push({ slug, ...data });
    console.log(`  ✓ /analyser/${slug}/`);
  }

  // Re-generate the analyser/index.html (the listing page) so new analyses show up
  rebuildListingPage(analyses);
  console.log('✓ Updated /analyser/ listing page');

  console.log(`\nDone! ${analyses.length} analyses built.`);
}

function renderTemplate(template, data, bodyHtml, slug) {
  const setupClass = data.setup_type === 'Bearish' ? 'pill-bear' : (data.setup_type === 'Bullish' ? 'pill-bull' : 'pill');
  const typeLabel = Array.isArray(data.analyse_type) ? data.analyse_type.join(' + ') : (data.analyse_type || '');
  const fakta = data.fakta || {};
  const niveauer = data.niveauer || {};
  const pos = data.position || {};

  // Format date in Danish
  const dateStr = data.dato ? formatDanishDate(data.dato) : '';

  // Build fakta rows (only show non-empty)
  const faktaRows = [
    { label: 'Ticker', value: fakta.ticker },
    { label: 'Sektor', value: fakta.sektor },
    { label: 'Market Cap', value: fakta.market_cap },
    { label: 'P/E (fwd)', value: fakta.pe },
    { label: 'EV/EBITDA', value: fakta.ev_ebitda },
    { label: 'Udbytte', value: fakta.udbytte },
    { label: '52-uge høj', value: fakta.h52 },
    { label: '52-uge lav', value: fakta.l52 },
  ]
    .filter(r => r.value)
    .map(r => `<div class="row"><span>${escapeHtml(r.label)}</span><span>${escapeHtml(r.value)}</span></div>`)
    .join('\n');

  return template
    .replace(/{{titel}}/g, escapeHtml(data.titel || ''))
    .replace(/{{slug}}/g, slug)
    .replace(/{{aktie_navn}}/g, escapeHtml(data.aktie_navn || ''))
    .replace(/{{lede}}/g, escapeHtml(data.lede || ''))
    .replace(/{{dato}}/g, dateStr)
    .replace(/{{laesetid}}/g, escapeHtml(data.laesetid || ''))
    .replace(/{{setup_type}}/g, escapeHtml(data.setup_type || 'Setup'))
    .replace(/{{setup_class}}/g, setupClass)
    .replace(/{{type_label}}/g, escapeHtml(typeLabel))
    .replace(/{{sektor}}/g, escapeHtml(data.sektor || ''))
    .replace(/{{tier_badge}}/g, data.tier === 'premium' ? '<span class="pill pill-gold">★ Premium</span>' : '')
    .replace(/{{kurs}}/g, escapeHtml(niveauer.kurs || '—'))
    .replace(/{{maal}}/g, escapeHtml(niveauer.maal || '—'))
    .replace(/{{stop}}/g, escapeHtml(niveauer.stop || '—'))
    .replace(/{{rr}}/g, escapeHtml(niveauer.rr || '—'))
    .replace(/{{fakta_rows}}/g, faktaRows || '<div class="row"><span style="color:var(--ink-mute);font-style:italic">Ingen ekstra fakta</span></div>')
    .replace(/{{body}}/g, bodyHtml)
    .replace(/{{position_tekst}}/g, escapeHtml(pos.tekst || 'Udgiveren har ingen position på publikationstidspunktet.'));
}

function rebuildListingPage(analyses) {
  // Sort newest first — coerce dates to ISO strings for comparison
  // (YAML may parse them as Date objects, strings, or undefined)
  const toISO = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString();
    if (typeof d === 'string') return d;
    try { return new Date(d).toISOString(); } catch { return ''; }
  };
  analyses.sort((a, b) => toISO(b.dato).localeCompare(toISO(a.dato)));

  const listingPath = path.join(OUT_DIR, 'index.html');
  if (!fs.existsSync(listingPath)) {
    console.log('  ⚠ /analyser/index.html not found — skipping listing rebuild');
    return;
  }

  let html = fs.readFileSync(listingPath, 'utf-8');

  // Build cards HTML
  const cards = analyses.map(a => {
    const setupClass = a.setup_type === 'Bearish' ? 'pill-bear' : (a.setup_type === 'Bullish' ? 'pill-bull' : 'pill');
    const typeLabel = Array.isArray(a.analyse_type) ? a.analyse_type[0] : (a.analyse_type || '');
    const catData = (a.analyse_type || []).map(t => t.toLowerCase()).concat([a.marked || '']).join(' ');
    const dateShort = a.dato ? formatDanishDateShort(a.dato) : '';
    const targetText = a.niveauer && a.niveauer.maal ? a.niveauer.maal : '';
    const isLocked = a.tier === 'premium';
    const lockClass = isLocked ? 'locked' : '';
    const lockAttr = isLocked ? '' : `<a href="/analyser/${a.slug}/" class="card-link" aria-label="Læs analyse: ${escapeHtml(a.titel || '')}"></a>`;
    const chartPath = a.setup_type === 'Bearish'
      ? 'M10,20 L50,30 L90,25 L130,40 L170,45 L210,55 L250,70'
      : 'M10,60 L50,55 L90,50 L130,40 L170,35 L210,25 L250,15';
    const chartColor = a.setup_type === 'Bearish' ? '#f87171' : '#4ade80';
    const targetColor = a.setup_type === 'Bearish' ? 'style="color:var(--bear)"' : '';

    return `      <article class="ana-card ${lockClass} reveal" data-cat="${catData}">
        ${lockAttr}
        <div>
          <div class="ana-tags">
            <span class="pill ${setupClass}">${escapeHtml(a.setup_type || '')}</span>
            <span class="pill">${escapeHtml(typeLabel)}</span>
            ${isLocked ? '<span class="pill pill-gold">Premium</span>' : ''}
          </div>
          <h3 class="ana-title">${escapeHtml(a.aktie_navn || '')}: ${escapeHtml(a.titel || '')}</h3>
          <p class="ana-excerpt">${escapeHtml((a.lede || '').slice(0, 140))}${(a.lede || '').length > 140 ? '...' : ''}</p>
          <div class="ana-chart-mini">
            <svg viewBox="0 0 300 80" preserveAspectRatio="none" width="100%" height="100%">
              <path d="${chartPath}" fill="none" stroke="${chartColor}" stroke-width="1.8"/>
            </svg>
          </div>
        </div>
        <div class="ana-foot"><span>${dateShort} · ${escapeHtml(typeLabel)}</span><span class="price-target" ${targetColor}>${escapeHtml(targetText)}</span></div>
      </article>`;
  }).join('\n\n');

  // Replace cards section
  const marker = '<div class="analyses-flat">';
  const endMarker = '</div>\n\n    <div class="center mt-lg">';
  const startIdx = html.indexOf(marker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.log('  ⚠ Could not find card section markers — skipping listing rebuild');
    return;
  }

  html = html.slice(0, startIdx + marker.length) + '\n\n' + cards + '\n\n    ' + html.slice(endIdx);
  fs.writeFileSync(listingPath, html);
}

// ─── HELPERS ─────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDanishDate(dateStr) {
  const months = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d)) return String(dateStr || '');
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDanishDateShort(dateStr) {
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d)) return String(dateStr || '');
  return `${d.getDate()}. ${months[d.getMonth()]}`;
}

main();
