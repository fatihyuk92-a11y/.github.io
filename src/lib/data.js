// Indlæser og normaliserer indhold fra _data/. Ugyldigt indhold springes over med en advarsel,
// så en tastefejl i admin aldrig vælter hele sitet.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { parseNumber, isoDate, slugify, tvSymbol, readTime, riskReward } = require('./util');
const { renderMarkdown, teaserMarkdown } = require('./markdown');

const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, '_data');

const warnings = [];
const warn = (msg) => { warnings.push(msg); console.warn('  ⚠ ' + msg); };

const DEFAULT_SETTINGS = {
  sitenavn: 'Aktiekompas',
  forfatter: 'Aktiekompas',
  forfatter_titel: '',
  email: '',
  firmanavn: '',
  cvr: '',
  hero_titel: 'Forstå markedet, før du handler.',
  hero_tekst: '',
  premium_visning: 'teaser',
  forside_marked: 'us',
  betalingslinks: { intro: '', plus: '', premium: '' },
  nyhedsbrev_url: '',
  om_tekst: '',
  ticker: [],
  indeks: [],
  danske_aktier: [],
  us_aktier: [],
  valuta_raavarer: [],
};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (fs.existsSync(file)) warn(`Kunne ikke læse ${path.relative(ROOT, file)}: ${err.message}`);
    return fallback;
  }
}

function cleanSymbolList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const symbol = String((item && item.symbol) || '').trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({ symbol, navn: String(item.navn || symbol).trim(), tv: String(item.tv || tvSymbol(symbol)).trim() });
  }
  return out;
}

function loadSettings() {
  const s = { ...DEFAULT_SETTINGS, ...readJson(path.join(DATA, 'settings.json'), {}) };
  s.betalingslinks = { ...DEFAULT_SETTINGS.betalingslinks, ...(s.betalingslinks || {}) };
  for (const key of ['ticker', 'indeks', 'danske_aktier', 'us_aktier', 'valuta_raavarer']) s[key] = cleanSymbolList(s[key]);
  s.premium_visning = s.premium_visning === 'fuld' ? 'fuld' : 'teaser';
  s.forside_marked = s.forside_marked === 'dk' ? 'dk' : 'us';
  s.priser = (Array.isArray(s.priser) ? s.priser : []).map((t, i) => ({
    id: String(t.id || ['intro', 'plus', 'premium'][i] || `tier${i}`),
    navn: String(t.navn || ''),
    pris: String(t.pris || ''),
    periode: String(t.periode || ''),
    beskrivelse: String(t.beskrivelse || ''),
    features: (Array.isArray(t.features) ? t.features : []).filter((f) => f && f.tekst).map((f) => ({ tekst: String(f.tekst), med: f.med !== false })),
    note: String(t.note || ''),
    knap: String(t.knap || ''),
    fremhaevet: t.fremhaevet === true,
  })).filter((t) => t.navn);
  return s;
}

const SETUPS = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' };

/** Klokkeslæt som "HH:MM". YAML 1.1 læser et ucitieret 16:42 som tallet 1002 (60-talssystem) – det rettes her. */
function normTime(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 24 * 60) return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Kilder: liste eller tekst med én kilde pr. linje. */
function normList(v) {
  const arr = Array.isArray(v) ? v : String(v == null ? '' : v).split(/\r?\n/);
  return arr.map((x) => String(x == null ? '' : x).trim()).filter(Boolean).slice(0, 30);
}
const TYPES = ['Teknisk', 'Fundamental', 'Makro'];

function normalizeAnalysis(data, body, file) {
  const titel = String(data.titel || '').trim();
  const aktie = String(data.aktie_navn || '').trim();
  if (!titel) throw new Error('mangler titel');
  const status = String(data.status || 'udgivet').toLowerCase();
  const setup = SETUPS[String(data.setup_type || 'neutral').toLowerCase()] || 'Neutral';
  let types = Array.isArray(data.analyse_type) ? data.analyse_type : (data.analyse_type ? [data.analyse_type] : []);
  types = types.map((t) => TYPES.find((x) => x.toLowerCase() === String(t).toLowerCase())).filter(Boolean);
  if (!types.length) types = ['Teknisk'];

  const niv = data.niveauer || {};
  const kurs = parseNumber(niv.kurs);
  const maal = parseNumber(niv.maal);
  const stop = parseNumber(niv.stop);
  const rr = riskReward(kurs, maal, stop);

  const fakta = data.fakta || {};
  const symbol = String(data.symbol || fakta.ticker || '').trim().toUpperCase();
  const valuta = String(data.valuta || (symbol.endsWith('.CO') ? 'DKK' : symbol ? 'USD' : '')).trim().toUpperCase();
  const marked = ['dansk', 'internationalt', 'makro'].includes(data.marked) ? data.marked : (symbol.endsWith('.CO') ? 'dansk' : 'internationalt');

  const slug = slugify(data.slug || `${aktie} ${titel}`) || slugify(path.basename(file, '.md'));
  const dato = isoDate(data.dato) || isoDate(fs.statSync(file).mtime);
  const { html, headings } = renderMarkdown(body);
  const teaser = renderMarkdown(teaserMarkdown(body));

  return {
    file: path.basename(file),
    slug,
    titel,
    aktie: aktie || symbol || 'Analyse',
    symbol,
    tv: String(data.tv_symbol || tvSymbol(symbol) || '').trim(),
    valuta,
    dato,
    status,
    demo: data.demo === true,
    setup,
    types,
    sektor: String(data.sektor || fakta.sektor || '').trim(),
    marked,
    tier: data.tier === 'premium' ? 'premium' : 'free',
    lede: String(data.lede || '').trim(),
    niveauer: { kurs, maal, stop, rr },
    fakta: {
      market_cap: fakta.market_cap || '', pe: fakta.pe || '', ev_ebitda: fakta.ev_ebitda || '',
      udbytte: fakta.udbytte || '', h52: fakta.h52 || '', l52: fakta.l52 || '',
    },
    position: {
      ejer: !!(data.position && data.position.ejer),
      tekst: String((data.position && data.position.tekst) || '').trim(),
    },
    billede: String(data.billede || '').trim(),
    // Oplysninger, som Finanstilsynet kræver ved investeringsanbefalinger
    tid: normTime(data.tid),
    kilder: normList(data.kilder),
    forudsaetninger: String(data.forudsaetninger || '').trim(),
    forelagt: data.forelagt === true,
    laesetid: readTime(body),
    html,
    headings,
    teaserHtml: teaser.html,
  };
}

function loadAnalyses() {
  const dir = path.join(DATA, 'analyser');
  if (!fs.existsSync(dir)) return [];
  const all = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const file = path.join(dir, name);
    try {
      const { data, content } = matter(fs.readFileSync(file, 'utf8'));
      const a = normalizeAnalysis(data, content, file);
      if (a.status === 'kladde') continue; // kladder vises ikke på sitet
      all.push(a);
    } catch (err) {
      warn(`Sprang analysen "${name}" over: ${err.message}`);
    }
  }
  // Unikke slugs — to analyser med samme slug får et suffiks i stedet for at overskrive hinanden.
  // Filen hvis navn matcher slug'en beholder adressen; ellers den ældste.
  const groups = new Map();
  for (const a of all) {
    if (!groups.has(a.slug)) groups.set(a.slug, []);
    groups.get(a.slug).push(a);
  }
  const taken = new Set(all.map((a) => a.slug));
  for (const [slug, group] of groups) {
    if (group.length < 2) continue;
    group.sort((a, b) => (a.file === `${slug}.md` ? -1 : b.file === `${slug}.md` ? 1 : (a.dato || '').localeCompare(b.dato || '')));
    group.slice(1).forEach((a) => {
      let n = 2;
      while (taken.has(`${slug}-${n}`)) n++;
      a.slug = `${slug}-${n}`;
      taken.add(a.slug);
      warn(`Slug "${slug}" bruges af flere analyser — "${a.file}" vises på /analyser/${a.slug}/`);
    });
  }
  all.sort((a, b) => (b.dato || '').localeCompare(a.dato || '') || a.titel.localeCompare(b.titel, 'da'));
  return all;
}

function loadPortfolio() {
  const raw = readJson(path.join(DATA, 'portefolje.json'), { positioner: [] });
  const list = Array.isArray(raw.positioner) ? raw.positioner : [];
  const out = [];
  list.forEach((p, i) => {
    const symbol = String(p.symbol || '').trim().toUpperCase();
    const koebskurs = parseNumber(p.koebskurs);
    if (!symbol || koebskurs == null) {
      warn(`Sprang position nr. ${i + 1} over: mangler symbol eller købskurs`);
      return;
    }
    const status = p.status === 'lukket' ? 'lukket' : 'aaben';
    out.push({
      id: String(p.id || `${slugify(p.navn || symbol)}-${i}`),
      navn: String(p.navn || symbol).trim(),
      symbol,
      tv: String(p.tv_symbol || tvSymbol(symbol)),
      valuta: String(p.valuta || (symbol.endsWith('.CO') ? 'DKK' : 'USD')).toUpperCase(),
      marked: p.marked === 'dansk' || symbol.endsWith('.CO') ? 'dansk' : 'internationalt',
      sektor: String(p.sektor || 'Øvrige').trim() || 'Øvrige',
      status,
      koebsdato: isoDate(p.koebsdato),
      koebskurs,
      vaegt: parseNumber(p.vaegt) || 0,
      salgsdato: isoDate(p.salgsdato),
      salgskurs: parseNumber(p.salgskurs),
      kommentar: String(p.kommentar || '').trim(),
      analyse: String(p.analyse || '').trim(),
      synlighed: p.synlighed === 'medlemmer' ? 'medlemmer' : 'offentlig',
      demo: p.demo === true,
    });
  });
  out.sort((a, b) => (a.status === b.status ? (b.vaegt - a.vaegt) || (b.koebsdato || '').localeCompare(a.koebsdato || '') : a.status === 'aaben' ? -1 : 1));
  return out;
}

module.exports = { loadSettings, loadAnalyses, loadPortfolio, warnings, ROOT, DATA };
