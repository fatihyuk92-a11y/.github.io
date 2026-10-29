// Aktiekompas admin – opret og redigér analyser, investeringer og indstillinger.
// Alt gemmes som filer i GitHub-repoet; Vercel bygger siden automatisk efter hver gemning.
import { GitHub, GitHubError, blobToBase64 } from './gh.js';
import './lint.js';
import { marked } from '/vendor/marked.esm.js';
import * as yaml from '/vendor/js-yaml.esm.min.js';

/* =====================================================================
   Hjælpere
   ===================================================================== */
let uid = 0; // løbenummer til unikke id'er

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const ICONS = {
  home: '<path d="M4 11.5L12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M7.5 15l3.5-4 3 2.5 4.5-6"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="17" r=".9"/>',
  olist: '<path d="M10 7h10M10 12h10M10 17h10M4 5.5h1.5V9M4 9h3M4 15.2c.3-.6 1-1 1.7-.8.8.2 1 1.1.4 1.7L4 18.5h3"/>',
  quote: '<path d="M6 17c-1.2-1-2-2.4-2-4.2C4 9.6 6 7.3 9 6.5l.6 1.4C7.8 8.6 7 9.8 7 11h2.5v6zM15 17c-1.2-1-2-2.4-2-4.2 0-3.2 2-5.5 5-6.3l.6 1.4c-1.8.7-2.6 1.9-2.6 3.1h2.5v6z"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4M12 16.8v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close2: '<path d="M7 7l10 10M17 7L7 17"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M11 5h7M6 19h7M14.5 5l-5 14"/>',
  template: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v11"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
};
function icon(name, size = 18) {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return t.content.firstChild;
}

function slugify(input) {
  return String(input || '').toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, '-og-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80).replace(/-+$/g, '');
}
/** Læser tal skrevet på dansk ("1.234,50") og engelsk ("1,234.50"). */
function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null || v === '') return null;
  let s = String(v).replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  const hasC = s.includes(','), hasD = s.includes('.');
  if (hasC && hasD) {
    s = s.lastIndexOf('.') > s.lastIndexOf(',') ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (hasC) {
    s = (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasD) {
    // "12.450" er dansk for 12450, men "0.125" og "12.45" er decimaltal.
    if ((s.match(/\./g) || []).length > 1 || (/^-?[1-9]\d{0,2}\.\d{3}$/.test(s))) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
const NF2 = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NF1 = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtNum = (n) => (n == null || !Number.isFinite(n) ? '' : NF2.format(n));
const fmtPct = (n) => (n == null || !Number.isFinite(n) ? '–' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${NF1.format(Math.abs(n))} %`);
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function ago(date) {
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'lige nu';
  if (s < 3600) return `for ${Math.round(s / 60)} min. siden`;
  if (s < 86400) return `for ${Math.round(s / 3600)} timer siden`;
  return new Date(date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
async function pool(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

const SECTORS = { Healthcare: 'Sundhed', Technology: 'Teknologi', Industrials: 'Industri', 'Financial Services': 'Finans', Financial: 'Finans', 'Consumer Cyclical': 'Forbrugsgoder', 'Consumer Defensive': 'Dagligvarer', Energy: 'Energi', Utilities: 'Forsyning', 'Basic Materials': 'Materialer', 'Communication Services': 'Kommunikation', 'Real Estate': 'Ejendomme' };
const sectorDa = (s) => SECTORS[s] || s || '';
function cleanName(name) {
  return String(name || '').replace(/\s*\(The\)$/i, '')
    .replace(/[,\s]+(A\/S|AS|ASA|AB|AG|SE|SA|S\.A\.|NV|N\.V\.|plc|PLC|Plc|Inc\.?|Incorporated|Corporation|Corp\.?|Co\.|Company|Holding|Holdings|Ltd\.?|Limited|Group|Oyj|ApS)\.?$/g, '')
    .replace(/[,\s]+(A\/S|AS|ASA|AB|AG|SE|SA|NV|plc|PLC|Inc\.?|Corp\.?|Ltd\.?)$/g, '')
    .trim();
}
const isDanish = (sym) => /\.CO$/i.test(sym || '');
/** Datoer fra YAML kan være Date-objekter eller tekst – altid "ÅÅÅÅ-MM-DD". */
function isoDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  const s = String(v || '').trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}
const slugOf = (a) => String(a.data.slug || a.file.replace(/\.md$/, ''));
const nowTime = () => new Date().toLocaleTimeString('da-DK', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
/** "HH:MM" – også hvis en ældre fil har gemt 16:42 uden anførselstegn (YAML 1.1 læser det som 1002). */
function normTime(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1440) return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})[:.](\d{2})/);
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/* =====================================================================
   Tilstand
   ===================================================================== */
const S = {
  cfg: { owner: '', repo: '', branch: 'main' },
  gh: null,
  user: null,
  analyses: null, // [{ file, path, sha, data, body }]
  portfolio: null, // { sha, data }
  settings: null, // { sha, data }
  dirty: false,
  cleanup: [], // ryddes ved hvert sideskift (fx tastaturgenveje)
};
const PATHS = { analyser: '_data/analyser', portfolio: '_data/portefolje.json', settings: '_data/settings.json' };
const root = document.getElementById('app');

/* =====================================================================
   Toasts og dialoger
   ===================================================================== */
function toast(message, type = 'info', ms = 4200) {
  let box = document.querySelector('.toasts');
  if (!box) { box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `toast toast--${type}` }, icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info'), h('span', { text: message }));
  box.append(t);
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, ms);
}

/** Dialog med felter. Returnerer værdierne eller null, hvis brugeren annullerer. */
function dialog({ title, text, fields = [], confirm = 'OK', cancel = 'Annullér', danger = false }) {
  return new Promise((resolve) => {
    const inputs = {};
    const dlgId = `dlg${++uid}`;
    const form = h('form', { method: 'dialog', class: 'dlg__form' },
      h('h2', { class: 'dlg__title', text: title }),
      text ? h('p', { class: 'dlg__text', text }) : null,
      fields.map((f) => {
        const id = `${dlgId}-${f.name}`;
        const input = f.type === 'textarea'
          ? h('textarea', { id, class: 'in', rows: 3, value: f.value || '' })
          : h('input', { id, class: 'in', type: f.type || 'text', value: f.value ?? '', inputmode: f.inputmode, placeholder: f.placeholder || '', required: f.required });
        inputs[f.name] = input;
        return h('div', { class: 'f' }, h('label', { for: id, text: f.label }), input, f.hint ? h('p', { class: 'f__hint', text: f.hint }) : null);
      }),
      h('div', { class: 'dlg__actions' },
        h('button', { type: 'button', class: 'btn btn--ghost', value: 'cancel', onclick: () => { dlg.close('cancel'); } }, cancel),
        h('button', { type: 'submit', class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, value: 'ok' }, confirm)));
    const dlg = h('dialog', { class: 'dlg' }, form);
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue === 'ok';
      const out = ok ? Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value])) : null;
      dlg.remove();
      resolve(ok ? out : null);
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); dlg.close('ok'); });
    dlg.showModal();
    const first = Object.values(inputs)[0];
    if (first) setTimeout(() => first.focus(), 30);
  });
}

/* =====================================================================
   Byggestatus – vises øverst, efter du har gemt
   ===================================================================== */
const Deploy = {
  el: null,
  timer: null,
  mount(el) { this.el = el; this.resume(); },
  set(state, extra = {}) {
    if (!this.el) return;
    const map = {
      idle: ['ok', 'check', 'Siden er opdateret'],
      saving: ['busy', null, 'Gemmer …'],
      building: ['busy', null, 'Siden opdateres – normalt ca. 1 minut'],
      live: ['ok', 'check', 'Ændringerne er live'],
      failed: ['bad', 'alert', 'Opdateringen fejlede – den tidligere version er stadig online'],
      unknown: ['warn', 'info', 'Kunne ikke bekræfte opdateringen'],
    };
    const [tone, ic, label] = map[state] || map.idle;
    this.el.className = `deploy deploy--${tone}`;
    this.el.replaceChildren(...[
      ic ? icon(ic, 16) : h('span', { class: 'spin', 'aria-hidden': 'true' }),
      h('span', { text: extra.label || label }),
      extra.url ? h('a', { href: extra.url, target: '_blank', rel: 'noopener', text: state === 'failed' ? 'Se fejlen' : 'Se siden' }) : null,
    ].filter(Boolean));
  },
  track(sha, prevBuild) {
    const job = { sha, at: Date.now(), prev: prevBuild || null };
    try { sessionStorage.setItem('ak_deploy', JSON.stringify(job)); } catch { /* ignorer */ }
    this.poll(job);
  },
  async currentBuild() {
    try { return (await fetch('/data/build.json', { cache: 'no-store' }).then((r) => r.json())).buildId || null; } catch { return null; }
  },
  resume() {
    try {
      const job = JSON.parse(sessionStorage.getItem('ak_deploy') || 'null');
      if (job && Date.now() - job.at < 10 * 60e3) return this.poll(job);
    } catch { /* ignorer */ }
    this.showLastBuild();
  },
  async showLastBuild() {
    try {
      const b = await fetch('/data/build.json', { cache: 'no-store' }).then((r) => r.json());
      this.set('idle', { label: `Siden er opdateret ${ago(b.built)}` });
    } catch { this.set('idle'); }
  },
  poll(job) {
    clearTimeout(this.timer);
    this.set('building');
    let successTicks = 0;
    const done = (state, extra) => {
      try { sessionStorage.removeItem('ak_deploy'); } catch { /* ignorer */ }
      this.set(state, extra);
    };
    const tick = async () => {
      if (!S.gh) return;
      let built = null;
      try { built = await fetch('/data/build.json', { cache: 'no-store' }).then((r) => r.json()); } catch { /* ignorer */ }
      // Ny bygning online = ændringen er live (sammenlignes med bygningen fra før gemningen, så urets tid ikke betyder noget).
      const changed = built && built.buildId && (job.prev ? built.buildId !== job.prev : new Date(built.built).getTime() > job.at - 60e3);
      if (changed) {
        done('live', { url: '/' });
        if (built.warnings && built.warnings.length) toast(`Siden er bygget med ${built.warnings.length} advarsel(er) – se Overblik.`, 'info', 7000);
        return;
      }
      const st = await S.gh.buildStatus(job.sha).catch(() => ({ state: 'unknown' }));
      if (st.state === 'failure') return done('failed', { url: st.url });
      if (st.state === 'success' && ++successTicks >= 3) return done('live', { url: '/' });
      if (Date.now() - job.at > 6 * 60e3) return done('unknown', { url: st.url || '' });
      this.timer = setTimeout(tick, 7000);
    };
    this.timer = setTimeout(tick, 5000);
  },
};

/** Gemmer filer i ét commit. Returnerer { sha, blobs: { [sti]: ny sha } }. */
async function save(changes, message, expect) {
  Deploy.set('saving');
  const prev = await Deploy.currentBuild();
  try {
    const commit = await S.gh.commit(changes, message, { expect });
    Deploy.track(commit.sha, prev);
    return commit;
  } catch (err) {
    Deploy.showLastBuild();
    throw err;
  }
}

/** Gå til en side – også hvis man allerede står på den (så vises den nyeste version). */
function go(hash) {
  if (location.hash === hash) onRoute(); else location.hash = hash;
}

/* =====================================================================
   Indlæsning af indhold
   ===================================================================== */
function parseMd(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: String(text), error: 'Mangler frontmatter' };
  try {
    let data = yaml.load(m[1]) || {};
    if (typeof data !== 'object' || Array.isArray(data)) data = {};
    if (data.dato != null) data.dato = isoDate(data.dato);
    return { data, body: m[2].replace(/^\r?\n/, '') };
  } catch (err) {
    return { data: {}, body: m[2], error: err.message };
  }
}

const KEY_ORDER = ['titel', 'slug', 'aktie_navn', 'symbol', 'tv_symbol', 'valuta', 'dato', 'tid', 'status', 'setup_type', 'analyse_type', 'sektor', 'marked', 'tier', 'lede', 'niveauer', 'forudsaetninger', 'fakta', 'position', 'kilder', 'forelagt', 'billede', 'demo'];
function stringifyMd(data, body) {
  const ordered = {};
  for (const k of KEY_ORDER) if (data[k] !== undefined) ordered[k] = data[k];
  for (const [k, v] of Object.entries(data)) if (!(k in ordered) && v !== undefined) ordered[k] = v;
  // forceQuotes: alle tekster skrives i anførselstegn, så sidens bygger (YAML 1.1) læser dem præcis som skrevet – fx "16:42" og "yes".
  return `---\n${yaml.dump(ordered, { lineWidth: -1, noRefs: true, forceQuotes: true, quotingType: '"' })}---\n\n${String(body || '').trim()}\n`;
}

const byDate = (a, b) => String(b.data.dato || '').localeCompare(String(a.data.dato || '')) || a.file.localeCompare(b.file);

async function loadAnalyses(force = false) {
  if (S.analyses && !force) return S.analyses;
  const files = (await S.gh.list(PATHS.analyser)).filter((f) => f.name.endsWith('.md'));
  S.analyses = (await pool(files, 6, async (f) => {
    const text = await S.gh.readRaw(f.path);
    const p = parseMd(text);
    return { file: f.name, path: f.path, sha: f.sha, data: p.data, body: p.body, error: p.error };
  })).sort(byDate);
  return S.analyses;
}

/** Opdatér listen lokalt efter en gemning, så vi ikke er afhængige af, at GitHub straks viser den nye version. */
function rememberAnalysis(entry, removedFile) {
  if (!S.analyses) return;
  S.analyses = S.analyses.filter((a) => a.file !== removedFile && (!entry || a.file !== entry.file));
  if (entry) S.analyses.push(entry);
  S.analyses.sort(byDate);
}

async function loadJson(key, fallback) {
  if (S[key]) return S[key];
  const f = await S.gh.read(PATHS[key]);
  let data = fallback;
  if (f) { try { data = JSON.parse(f.text); } catch { toast(`${PATHS[key]} kunne ikke læses – der bruges standardværdier.`, 'error'); } }
  S[key] = { sha: f ? f.sha : null, data };
  return S[key];
}

/** Gem en JSON-fil (portefølje eller indstillinger) og husk den nye version lokalt. */
async function saveJson(key, data, message, extra = []) {
  const path = PATHS[key];
  const res = await save([...extra, { path, text: JSON.stringify(data, null, 2) + '\n' }], message, { [path]: S[key] ? S[key].sha : null });
  S[key] = { sha: res.blobs[path], data: JSON.parse(JSON.stringify(data)) };
  return res;
}

async function quotes(symbols) {
  const list = [...new Set(symbols.filter(Boolean))];
  if (!list.length) return new Map();
  try {
    const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(list.join(','))}`);
    const j = await r.json();
    return new Map((j.quotes || []).map((q) => [q.symbol, q]));
  } catch { return new Map(); }
}

/* =====================================================================
   Login og opstart
   ===================================================================== */
function getToken() { return sessionStorage.getItem('ak_admin_token') || localStorage.getItem('ak_admin_token'); }
function logout() {
  try { sessionStorage.removeItem('ak_admin_token'); localStorage.removeItem('ak_admin_token'); } catch { /* ignorer */ }
  window.removeEventListener('hashchange', onRoute);
  S.cleanup.splice(0).forEach((fn) => fn());
  clearTimeout(Deploy.timer);
  Object.assign(S, { gh: null, user: null, analyses: null, portfolio: null, settings: null, dirty: false });
  history.replaceState(null, '', location.pathname);
  showLogin();
}

function showLogin(message = '') {
  let remember = false;
  try { remember = localStorage.getItem('ak_admin_remember') === '1'; } catch { /* ignorer */ }
  const box = h('input', { type: 'checkbox', id: 'remember', checked: remember });
  root.replaceChildren(h('main', { class: 'login' },
    h('div', { class: 'login__card' },
      h('div', { class: 'login__brand' }, h('img', { src: '/favicon.svg', alt: '', width: 40, height: 40 }), h('span', { text: 'Aktiekompas' })),
      h('h1', { text: 'Log ind i admin' }),
      h('p', { text: 'Her opretter og redigerer du analyser, investeringer og sidens indstillinger. Du logger ind med den GitHub-konto, der ejer sidens repo.' }),
      message ? h('p', { class: 'login__msg', text: message }) : null,
      h('button', {
        class: 'btn btn--primary btn--lg btn--block',
        onclick: () => {
          try { localStorage.setItem('ak_admin_remember', box.checked ? '1' : '0'); } catch { /* ignorer */ }
          location.href = '/api/auth';
        },
      }, icon('github', 20), 'Log ind med GitHub'),
      h('label', { class: 'check' }, box, h('span', { text: 'Husk mig på denne computer' })),
      h('p', { class: 'login__fine', text: 'Brug kun "Husk mig" på din egen computer.' }))));
}

function showFatal(title, text) {
  root.replaceChildren(h('main', { class: 'login' }, h('div', { class: 'login__card' },
    h('h1', { text: title }), h('p', { text }),
    h('div', { class: 'row' }, h('button', { class: 'btn btn--secondary', onclick: logout }, 'Log ud'), h('a', { class: 'btn btn--ghost', href: '/' }, 'Til forsiden')))));
}

async function boot() {
  try { S.cfg = { ...S.cfg, ...(await fetch('/admin/config.json', { cache: 'no-store' }).then((r) => r.json())) }; } catch { /* standard */ }
  const token = getToken();
  if (!token) return showLogin();
  S.gh = new GitHub({ token, ...S.cfg });
  root.replaceChildren(h('div', { class: 'boot' }, h('span', { class: 'spin' }), 'Henter dine data …'));
  try {
    S.user = await S.gh.user();
  } catch (err) {
    if (err.status === 401) { sessionStorage.removeItem('ak_admin_token'); localStorage.removeItem('ak_admin_token'); return showLogin('Dit login er udløbet. Log ind igen.'); }
    return showFatal('Ingen forbindelse til GitHub', `GitHub svarer ikke lige nu (${err.message}). Prøv igen om lidt.`);
  }
  try {
    const repo = await S.gh.repoInfo();
    if (!repo.permissions || !repo.permissions.push) return showFatal('Kun læseadgang', `Din GitHub-bruger (${S.user.login}) kan ikke gemme ændringer i ${S.cfg.owner}/${S.cfg.repo}. Log ind med den konto, der ejer repoet.`);
    if (repo.private === false) S.publicRepo = true;
  } catch (err) {
    return showFatal('Repoet blev ikke fundet', `Admin forsøger at bruge ${S.cfg.owner}/${S.cfg.repo}, men din GitHub-bruger (${S.user.login}) har ikke adgang til det. Tjek at du er logget ind med den rigtige konto.`);
  }
  renderShell();
  window.addEventListener('hashchange', onRoute);
  onRoute();
}
window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* =====================================================================
   Skal og navigation
   ===================================================================== */
const NAV = [
  { href: '#/', label: 'Overblik', icon: 'home', key: '' },
  { href: '#/analyser', label: 'Analyser', icon: 'chart', key: 'analyser' },
  { href: '#/portefolje', label: 'Portefølje', icon: 'briefcase', key: 'portefolje' },
  { href: '#/indstillinger', label: 'Indstillinger', icon: 'settings', key: 'indstillinger' },
];
let view, navEl, deployEl;
function renderShell() {
  navEl = h('nav', { class: 'side__nav', 'aria-label': 'Admin' }, NAV.map((n) => h('a', { href: n.href, dataset: { key: n.key } }, icon(n.icon), h('span', { text: n.label }))));
  deployEl = h('div', { class: 'deploy', role: 'status', 'aria-live': 'polite' });
  view = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  root.replaceChildren(h('div', { class: 'shell' },
    h('aside', { class: 'side' },
      h('a', { class: 'side__brand', href: '#/' }, h('img', { src: '/favicon.svg', alt: '', width: 30, height: 30 }), h('span', null, 'Aktiekompas', h('small', { text: 'Admin' }))),
      navEl,
      h('div', { class: 'side__foot' },
        h('a', { class: 'side__link', href: '/', target: '_blank', rel: 'noopener' }, icon('external', 16), 'Se siden'),
        h('div', { class: 'side__user' },
          S.user.avatar_url ? h('img', { src: S.user.avatar_url, alt: '', width: 28, height: 28 }) : null,
          h('span', { text: S.user.name || S.user.login }),
          h('button', { class: 'iconbtn', title: 'Log ud', 'aria-label': 'Log ud', onclick: logout }, icon('logout', 18))))),
    h('div', { class: 'main' }, h('header', { class: 'top' }, deployEl), view)));
  Deploy.mount(deployEl);
}

let lastHash = location.hash;
let routeSeq = 0;
async function onRoute() {
  if (!S.gh) return;
  if (S.dirty && location.hash !== lastHash) {
    if (!confirm('Du har ændringer, der ikke er gemt. Vil du forlade siden uden at gemme?')) {
      history.replaceState(null, '', lastHash || '#/');
      return;
    }
  }
  S.dirty = false;
  S.cleanup.splice(0).forEach((fn) => fn());
  lastHash = location.hash;
  const seq = ++routeSeq;
  const parts = location.hash.replace(/^#\/?/, '').split('/').map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  const [section, action, arg] = parts;
  navEl.querySelectorAll('a').forEach((a) => {
    if (a.dataset.key === (section || '')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  view.replaceChildren(h('div', { class: 'loading' }, h('span', { class: 'spin' }), 'Indlæser …'));
  view.dataset.seq = seq;
  try {
    if (!section) await viewOverview();
    else if (section === 'analyser' && !action) await viewAnalyses();
    else if (section === 'analyser') await viewAnalysisEditor(action, arg);
    else if (section === 'portefolje' && !action) await viewPortfolio();
    else if (section === 'portefolje') await viewPositionEditor(action, arg);
    else if (section === 'indstillinger') await viewSettings(action || 'generelt');
    else view.replaceChildren(h('p', { text: 'Siden findes ikke.' }));
  } catch (err) {
    console.error(err);
    if (err instanceof GitHubError && err.status === 401) return logout();
    view.replaceChildren(h('div', { class: 'card card--error' }, h('h2', { text: 'Noget gik galt' }), h('p', { text: err.message }), h('button', { class: 'btn btn--secondary', onclick: () => onRoute() }, icon('refresh', 16), 'Prøv igen')));
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function markDirty() { S.dirty = true; }
/** Tegner kun visningen, hvis brugeren stadig er på samme side (ellers kan et langsomt svar overskrive en ny side). */
function painter() {
  const mine = routeSeq;
  return (...kids) => {
    if (mine !== routeSeq) return false;
    view.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
    return true;
  };
}

function pageHead(title, sub, ...actions) {
  return h('div', { class: 'phead' }, h('div', null, h('h1', { text: title }), sub ? h('p', { text: sub }) : null), h('div', { class: 'phead__actions' }, actions));
}

/* =====================================================================
   Formularfelter
   ===================================================================== */
function field(label, control, { hint, required, wide } = {}) {
  // Labelen peger på selve inputfeltet – også når kontrollen er en sammensat komponent (fx aktiesøgningen).
  const target = control.matches && control.matches('input,select,textarea') ? control : control.querySelector && control.querySelector('input,select,textarea');
  if (target && !target.id) target.id = `f${++uid}`;
  const hintEl = hint ? h('p', { class: 'f__hint', id: `h${++uid}`, text: hint }) : null;
  if (target && hintEl) target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby'), hintEl.id].filter(Boolean).join(' '));
  return h('div', { class: `f${wide ? ' f--wide' : ''}` },
    h('label', { for: target ? target.id : null }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null),
    control,
    hintEl);
}
function input(value, opts = {}) {
  const el = h('input', { class: 'in', type: opts.type || 'text', value: value ?? '', placeholder: opts.placeholder, inputmode: opts.inputmode, maxlength: opts.max, required: opts.required, oninput: opts.oninput, autocomplete: 'off' });
  // Talfelter vises i dansk format, når man forlader feltet – så man kan se, hvordan tallet er forstået.
  if (opts.inputmode === 'decimal') {
    el.addEventListener('change', () => {
      const n = parseNumber(el.value);
      if (n != null) el.value = opts.digits === 1 ? NF1.format(n) : fmtNum(n);
    });
  }
  return el;
}
function textarea(value, opts = {}) {
  const t = h('textarea', { class: 'in', rows: opts.rows || 3, value: value ?? '', placeholder: opts.placeholder, maxlength: opts.max, oninput: opts.oninput });
  return t;
}
/** Knapgruppe med ét valg. */
function segmented(options, value, onChange, { name } = {}) {
  name = name || `seg${++uid}`;
  const wrap = h('div', { class: 'segm', role: 'radiogroup' });
  for (const [v, label] of options) {
    const r = h('input', { type: 'radio', name, value: v, checked: v === value, onchange: () => onChange(v) });
    wrap.append(h('label', { class: 'segm__opt' }, r, h('span', { text: label })));
  }
  return wrap;
}
function checkChips(options, values, onChange) {
  const wrap = h('div', { class: 'chips' });
  const cur = new Set(values);
  for (const [v, label] of options) {
    const c = h('input', { type: 'checkbox', value: v, checked: cur.has(v), onchange: () => { if (c.checked) cur.add(v); else cur.delete(v); onChange([...cur]); } });
    wrap.append(h('label', { class: 'chipcheck' }, c, h('span', { text: label })));
  }
  return wrap;
}
function toggle(label, checked, onChange, hint) {
  const c = h('input', { type: 'checkbox', checked, onchange: () => onChange(c.checked) });
  return h('label', { class: 'toggle' }, c, h('span', { class: 'toggle__ui', 'aria-hidden': 'true' }), h('span', { class: 'toggle__text' }, h('strong', { text: label }), hint ? h('small', { text: hint }) : null));
}
function section(title, sub, ...kids) {
  return h('section', { class: 'fsec' }, h('div', { class: 'fsec__head' }, h('h2', { text: title }), sub ? h('p', { text: sub }) : null), h('div', { class: 'fsec__body' }, kids));
}

/* ---------- Aktiesøgning ---------- */
function stockPicker({ initial = '', onPick, placeholder = 'Søg fx Novo, Vestas eller AAPL' }) {
  const listId = `pick${++uid}`;
  const inp = h('input', { class: 'in in--search', type: 'search', value: initial, placeholder, autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': listId, 'aria-autocomplete': 'list' });
  const list = h('ul', { class: 'picker__list', role: 'listbox', id: listId, hidden: true });
  const status = h('p', { class: 'picker__status', 'aria-live': 'polite' });
  let items = [], active = -1, seq = 0;
  const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); active = -1; };
  const choose = async (it) => {
    if (it.manual) it = { ...it, name: it.symbol };
    close();
    inp.value = `${it.name} (${it.symbol})`;
    status.textContent = 'Henter kurs …';
    const q = (await quotes([it.symbol])).get(it.symbol);
    status.textContent = q ? `Aktuel kurs: ${fmtNum(q.price)} ${q.currency || ''}` : 'Kursen kunne ikke hentes lige nu – du kan skrive den selv.';
    onPick({ ...it, cleanName: cleanName(it.name), sectorDa: sectorDa(it.sector), currency: q ? q.currency : '', price: q ? q.price : null });
  };
  const render = () => {
    list.replaceChildren(...items.map((it, i) => h('li', {
      role: 'option', id: `${listId}-${i}`, 'aria-selected': String(i === active), class: i === active ? 'is-active' : '',
      onmousedown: (e) => { e.preventDefault(); choose(it); },
    }, h('strong', { text: it.symbol }), h('span', { text: it.name }), h('small', { text: [it.exchange, it.type === 'EQUITY' ? 'Aktie' : it.type].filter(Boolean).join(', ') }))));
    list.hidden = !items.length;
    inp.setAttribute('aria-expanded', String(!list.hidden));
    if (active >= 0) inp.setAttribute('aria-activedescendant', `${listId}-${active}`); else inp.removeAttribute('aria-activedescendant');
  };
  const search = debounce(async (q) => {
    const my = ++seq;
    if (q.length < 1) { items = []; render(); return; }
    let results = [];
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      results = j.results || [];
      if (!r.ok) status.textContent = j.error || '';
    } catch { status.textContent = 'Søgningen virker ikke lige nu – skriv symbolet selv, fx NOVO-B.CO.'; }
    if (my !== seq) return;
    results.sort((a, b) => (isDanish(b.symbol) ? 1 : 0) - (isDanish(a.symbol) ? 1 : 0));
    const typed = q.trim().toUpperCase();
    if (/^[\^A-Z0-9][A-Z0-9.\-=^]{0,19}$/.test(typed) && !results.some((x) => x.symbol === typed)) results.push({ symbol: typed, name: `Brug symbolet ${typed}`, exchange: '', type: '' , manual: true });
    items = results.slice(0, 9);
    active = -1;
    render();
  }, 250);
  inp.addEventListener('input', () => search(inp.value.trim()));
  inp.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') close();
  });
  inp.addEventListener('blur', () => setTimeout(close, 150));
  return h('div', { class: 'picker' }, h('span', { class: 'picker__icon' }, icon('search', 18)), inp, list, status);
}

/* ---------- Markdown-editor med billeder ---------- */
const staged = new Map(); // offentlig url -> { path, blob, objectUrl }

async function prepareImage(file) {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error('Vælg et billede i PNG, JPG, WebP eller GIF.');
  if (file.size > 15e6) throw new Error('Billedet er for stort. Maks 15 MB.');
  if (file.type === 'image/gif') return { blob: file, ext: 'gif' };
  const bmp = await createImageBitmap(file);
  const max = 1800;
  if (bmp.width <= max && file.size < 900e3) return { blob: file, ext: file.type.split('/')[1].replace('jpeg', 'jpg') };
  const scale = Math.min(1, max / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.88));
  if (blob && blob.type === 'image/webp') return { blob, ext: 'webp' };
  const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88));
  return { blob: jpg, ext: 'jpg' };
}

function sanitize(htmlStr) {
  const doc = new DOMParser().parseFromString(`<div>${htmlStr}</div>`, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,style,link,meta,form').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }
  });
  return doc.body.firstChild.innerHTML;
}

function mdEditor({ value = '', onInput, uploadName = () => 'billede', minRows = 18 }) {
  const ta = h('textarea', { class: 'in md__ta', rows: minRows, value, spellcheck: 'true', 'aria-label': 'Tekst' });
  const preview = h('div', { class: 'md__preview prose', hidden: true });
  const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
  const emit = () => { onInput && onInput(ta.value); };

  const replaceSel = (fn) => {
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    const r = fn(v.slice(s, e), v, s, e);
    const start = r.start ?? s, end = r.end ?? e;
    ta.focus();
    ta.setSelectionRange(start, end);
    // insertText bevarer fortryd (Ctrl+Z); setRangeText er reserve, hvis browseren ikke understøtter det.
    let ok = false;
    try { ok = document.execCommand('insertText', false, r.text); } catch { ok = false; }
    if (!ok || ta.value.slice(start, start + r.text.length) !== r.text) {
      ta.value = v;
      ta.setRangeText(r.text, start, end, 'end');
    }
    if (r.selStart != null) ta.setSelectionRange(r.selStart, r.selEnd);
    emit();
  };
  const wrap = (a, b, ph) => replaceSel((sel, v, s) => {
    const t = sel || ph;
    return { text: a + t + b, selStart: s + a.length, selEnd: s + a.length + t.length };
  });
  const linePrefix = (prefixFn) => replaceSel((sel, v, s, e) => {
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    const le = v.indexOf('\n', e); const end = le === -1 ? v.length : le;
    const lines = v.slice(ls, end).split('\n').map((l, i) => prefixFn(i) + l.replace(/^(#{1,6}\s|>\s|[-*]\s|\d+\.\s)/, ''));
    const text = lines.join('\n');
    return { text, start: ls, end, selStart: ls, selEnd: ls + text.length };
  });
  const insertBlock = (block) => replaceSel((sel, v, s) => {
    const before = v.slice(0, s);
    const pre = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    return { text: `${pre}${block}\n`, selStart: s + pre.length + block.length + 1, selEnd: s + pre.length + block.length + 1 };
  });

  async function addImage(file) {
    try {
      const { blob, ext } = await prepareImage(file);
      const d = new Date();
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
      const base = slugify(uploadName() || file.name.replace(/\.[^.]+$/, '')) || 'billede';
      const name = `${base}-${Date.now().toString(36)}.${ext}`;
      const url = `/uploads/${y}/${m}/${name}`;
      staged.set(url, { path: `public/uploads/${y}/${m}/${name}`, blob, objectUrl: URL.createObjectURL(blob) });
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Graf';
      insertBlock(`![${alt}](${url})`);
      toast('Billedet er tilføjet. Det gemmes sammen med teksten.', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }
  fileIn.addEventListener('change', () => { if (fileIn.files[0]) addImage(fileIn.files[0]); fileIn.value = ''; });
  ta.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); addImage(f); }
  });
  ta.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) { e.preventDefault(); ta.classList.add('is-drop'); } });
  ta.addEventListener('dragleave', () => ta.classList.remove('is-drop'));
  ta.addEventListener('drop', (e) => {
    ta.classList.remove('is-drop');
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); addImage(f); }
  });
  ta.addEventListener('input', emit);
  ta.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === 'b') { e.preventDefault(); wrap('**', '**', 'fed tekst'); }
    else if (e.key === 'i') { e.preventDefault(); wrap('*', '*', 'kursiv'); }
    else if (e.key === 'k') { e.preventDefault(); askLink(); }
  });

  async function askLink() {
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    const r = await dialog({ title: 'Indsæt link', fields: [{ name: 'text', label: 'Tekst', value: sel || '' }, { name: 'url', label: 'Adresse', value: 'https://', type: 'url' }], confirm: 'Indsæt' });
    if (r && r.url) replaceSel(() => ({ text: `[${r.text || r.url}](${r.url})` }));
  }

  const tb = (ic, label, fn) => h('button', { type: 'button', class: 'md__btn', title: label, 'aria-label': label, onclick: fn }, typeof ic === 'string' && ICONS[ic] ? icon(ic, 17) : h('span', { class: 'md__txt', text: ic }));
  const tabWrite = h('button', { type: 'button', class: 'md__tab', 'aria-pressed': 'true' }, 'Skriv');
  const tabPrev = h('button', { type: 'button', class: 'md__tab', 'aria-pressed': 'false' }, 'Forhåndsvis');
  const toolbar = h('div', { class: 'md__tools' },
    tb('H2', 'Overskrift', () => linePrefix(() => '## ')),
    tb('H3', 'Underoverskrift', () => linePrefix(() => '### ')),
    tb('bold', 'Fed (Ctrl+B)', () => wrap('**', '**', 'fed tekst')),
    tb('italic', 'Kursiv (Ctrl+I)', () => wrap('*', '*', 'kursiv')),
    h('span', { class: 'md__sep' }),
    tb('list', 'Punktliste', () => linePrefix(() => '- ')),
    tb('olist', 'Nummereret liste', () => linePrefix((i) => `${i + 1}. `)),
    tb('quote', 'Citat', () => linePrefix(() => '> ')),
    h('span', { class: 'md__sep' }),
    tb('link', 'Link (Ctrl+K)', askLink),
    tb('image', 'Billede eller graf', () => fileIn.click()),
    tb('table', 'Tabel', () => insertBlock('| Overskrift | Overskrift |\n| --- | --- |\n| Værdi | Værdi |')),
  );
  const showPreview = (on) => {
    tabWrite.setAttribute('aria-pressed', String(!on));
    tabPrev.setAttribute('aria-pressed', String(on));
    ta.hidden = on; toolbar.classList.toggle('is-off', on);
    preview.hidden = !on;
    if (on) {
      let out = sanitize(marked.parse(ta.value || '*Der er ingen tekst endnu.*'));
      for (const [url, f] of staged) out = out.split(url).join(f.objectUrl);
      preview.innerHTML = out;
    }
  };
  tabWrite.addEventListener('click', () => showPreview(false));
  tabPrev.addEventListener('click', () => showPreview(true));
  const el = h('div', { class: 'md' },
    h('div', { class: 'md__bar' }, toolbar, h('div', { class: 'md__tabs' }, tabWrite, tabPrev)),
    ta, preview, fileIn,
    h('p', { class: 'f__hint', text: 'Tip: Indsæt et skærmbillede af en graf direkte med Ctrl+V, eller træk et billede ind i feltet.' }));
  return { el, ta, get value() { return ta.value; }, set value(v) { ta.value = v; } };
}

/** Billeder, der er tilføjet i editoren og stadig bruges i teksten, gemmes med i samme commit. */
async function stagedChangesFor(...texts) {
  const all = texts.join('\n');
  const out = [];
  for (const [url, f] of staged) {
    if (all.includes(url)) out.push({ path: f.path, base64: await blobToBase64(f.blob) });
  }
  return out;
}
function clearStaged(...texts) {
  const all = texts.join('\n');
  for (const [url, f] of staged) if (all.includes(url)) { URL.revokeObjectURL(f.objectUrl); staged.delete(url); }
}

/* =====================================================================
   Sprogtjek: formuleringer, der kan læses som en anbefaling eller kursvurdering
   (bruges i undervisningstilstand, hvor siden ikke må anbefale noget)
   ===================================================================== */
const { checkLanguage } = globalThis.AkLint; // reglerne ligger i lint.js, som byggeren også bruger
function lintBox() {
  const el = h('div', { class: 'lint', 'aria-live': 'polite' });
  return {
    el,
    update(hits) {
      if (!hits.length) {
        el.className = 'lint lint--ok';
        el.replaceChildren(icon('check', 16), h('span', { text: 'Sprogtjek: ingen formuleringer, der lyder som køb/salg eller kursprognoser.' }));
        return;
      }
      el.className = 'lint lint--warn';
      el.replaceChildren(icon('alert', 16), h('div', null,
        h('strong', { text: `Sprogtjek: ${hits.length} ${hits.length === 1 ? 'formulering kan' : 'formuleringer kan'} læses som en anbefaling eller kursvurdering` }),
        h('ul', null, hits.slice(0, 6).map((x) => h('li', { title: x.context }, h('b', { text: `«${x.phrase}»` }), ` ${x.why}${x.count > 1 ? ` (${x.count} gange)` : ''}`))),
        h('p', { text: 'Beskriv hvad der er sket, og forklar metoden – fx "kursen har testet 400 kr. tre gange" i stedet for "køb ved 400 kr.".' })));
    },
  };
}

/* =====================================================================
   Overblik
   ===================================================================== */
async function viewOverview() {
  const paint = painter();
  const [analyses, pf, st, health, build, commits] = await Promise.all([
    loadAnalyses(), loadJson('portfolio', { positioner: [] }), loadJson('settings', {}),
    fetch('/api/health', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    fetch('/data/build.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    S.gh.commits(6).catch(() => []),
  ]);
  const pub = analyses.filter((a) => (a.data.status || 'udgivet') !== 'kladde');
  const drafts = analyses.length - pub.length;
  const pos = pf.data.positioner || [];
  const open = pos.filter((p) => p.status !== 'lukket').length;
  const demoCount = analyses.filter((a) => a.data.demo).length + pos.filter((p) => p.demo).length;
  const first = (S.user.name || S.user.login || '').split(' ')[0];
  const sd = st.data || {};
  const missingSender = !String(sd.forfatter || '').trim() || sd.forfatter === (sd.sitenavn || 'Aktiekompas') || !String(sd.forfatter_titel || '').trim();
  const edu = sd.indholdstype !== 'anbefalinger';
  const missingCompany = ['firmanavn', 'cvr', 'adresse', 'email'].filter((k) => !String(sd[k] || '').trim());

  const check = (ok, label, okText, badText) => h('li', { class: ok ? 'is-ok' : 'is-bad' }, icon(ok ? 'check' : 'alert', 18), h('div', null, h('strong', { text: label }), h('span', { text: ok ? okText : badText })));

  paint(
    pageHead(`Hej ${first}`, 'Her er status for din side.',
      h('a', { class: 'btn btn--secondary', href: '#/portefolje/ny' }, icon('plus', 18), 'Ny investering'),
      h('a', { class: 'btn btn--primary', href: '#/analyser/ny' }, icon('plus', 18), 'Ny analyse')),
    demoCount ? h('div', { class: 'note note--warn' }, icon('info', 18), h('p', null, `Siden indeholder ${demoCount} ${demoCount === 1 ? 'eksempel' : 'eksempler'} fra opsætningen (mærket "Eksempel"). Erstat eller slet ${demoCount === 1 ? 'det' : 'dem'}, før du lancerer, så besøgende kun ser dine rigtige analyser og positioner.`)) : null,
    missingSender ? h('div', { class: 'note note--warn' }, icon('alert', 18), h('div', { class: 'note__body' },
      h('p', null, edu ? 'Skriv dit navn og din titel som afsender. Det vises på alle cases og giver læserne tillid til, hvem der står bag.' : 'Skriv dit navn og din titel som afsender. Finanstilsynet kræver, at det fremgår, hvem der står bag analyser med kursmål – en ansvarsfraskrivelse er ikke nok i sig selv.'),
      h('a', { class: 'btn btn--secondary btn--sm', href: '#/indstillinger/generelt' }, 'Udfyld afsender'))) : null,
    missingCompany.length ? h('div', { class: 'note note--warn' }, icon('alert', 18), h('div', { class: 'note__body' },
      h('p', null, `Udfyld ${missingCompany.map((k) => ({ firmanavn: 'firmanavn', cvr: 'CVR-nummer', adresse: 'adresse', email: 'e-mail' }[k])).join(', ')} under Indstillinger. Oplysningerne bruges i handelsbetingelserne og privatlivspolitikken, som skal være på plads, før du tager betaling.`),
      h('a', { class: 'btn btn--secondary btn--sm', href: '#/indstillinger/generelt' }, 'Udfyld oplysninger'))) : null,
    S.publicRepo ? h('div', { class: 'note' }, icon('lock', 18), h('p', null, 'Dit GitHub-repo er offentligt, så alle kan læse premium-tekster og skjulte positioner på GitHub. Gør repoet privat under Settings → General → Danger Zone på GitHub. Siden og admin virker uændret.')) : null,
    h('div', { class: 'stats' },
      h('a', { class: 'stat', href: '#/analyser' }, h('span', { class: 'stat__label', text: 'Analyser' }), h('span', { class: 'stat__value', text: String(pub.length) }), h('span', { class: 'stat__sub', text: drafts ? `${drafts} kladde${drafts === 1 ? '' : 'r'}` : 'Ingen kladder' })),
      h('a', { class: 'stat', href: '#/portefolje' }, h('span', { class: 'stat__label', text: 'Åbne positioner' }), h('span', { class: 'stat__value', text: String(open) }), h('span', { class: 'stat__sub', text: `${pos.length - open} ${pos.length - open === 1 ? 'lukket' : 'lukkede'}` })),
      h('div', { class: 'stat' }, h('span', { class: 'stat__label', text: 'Siden blev sidst bygget' }), h('span', { class: 'stat__value stat__value--sm', text: build ? ago(build.built) : 'Ukendt' }), h('span', { class: 'stat__sub', text: build && build.warnings && build.warnings.length ? `${build.warnings.length} advarsel(er)` : 'Ingen advarsler' }))),
    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('h2', { text: 'Systemtjek' }),
        health ? h('ul', { class: 'checks' },
          check(health.quotes && health.quotes.ok, 'Kursdata', 'Live kurser hentes fra Yahoo Finance.', 'Kurserne kan ikke hentes lige nu. Siden viser "–" og bruger TradingView til grafer, indtil det virker igen.'),
          check(health.ai, 'AI-assistent', `Slået til (model: ${health.aiModel}).`, 'Mangler ANTHROPIC_API_KEY i Vercel. Indtil den er sat, viser chatten en besked om, at den ikke er slået til.'),
          check(health.login, 'Admin-login', 'GitHub-login er sat op.', 'Mangler OAuth-nøgler i Vercel.'),
          check(edu, 'Indholdstype', 'Undervisning: ingen kursmål, stop eller køb og salg på siden.', 'Analyser med kursmål: husk reglerne for investeringsanbefalinger i hver analyse.'),
          sd.vis_portefolje !== false ? check(true, 'Portefølje', isModel(sd) ? 'Modelportefølje: tænkte handler, tydeligt mærket på siden.' : 'Dine egne handler. Er de ikke rigtige, så vælg Modelportefølje under Indstillinger.', '') : null,
          sd.vis_portefolje !== false && Number(sd.portefolje_forsinkelse ?? 30) > 0
            ? check(health.rebuild, 'Daglig opdatering', 'Siden bygges igen hver nat, så handler kommer med, når forsinkelsen er udløbet.', 'Ikke sat op. Handler vises først, når forsinkelsen er udløbet og du har gemt noget i admin. Se README, afsnit 2.')
            : null) : h('p', { class: 'muted', text: 'Systemtjekket kunne ikke hentes.' }),
        build && build.warnings && build.warnings.length ? h('div', { class: 'warns' }, h('h3', { text: 'Advarsler fra seneste bygning' }), h('ul', null, build.warnings.map((w) => h('li', { text: w })))) : null),
      h('section', { class: 'card' },
        h('h2', { text: 'Seneste ændringer' }),
        commits.length ? h('ol', { class: 'commits' }, commits.map((c, i) => {
          const li = h('li', null, h('span', { class: 'dot dot--unknown', 'aria-hidden': 'true' }), h('div', null, h('strong', { text: c.commit.message.split('\n')[0] }), h('span', { text: `${ago(c.commit.author.date)}${c.commit.author.name ? `, ${c.commit.author.name}` : ''}` })));
          if (i < 3) S.gh.buildStatus(c.sha).then((st) => { const d = li.querySelector('.dot'); d.className = `dot dot--${st.state}`; d.title = { success: 'Bygget', pending: 'Bygger', failure: 'Fejlede', unknown: 'Ukendt' }[st.state]; }).catch(() => {});
          return li;
        })) : h('p', { class: 'muted', text: 'Ingen ændringer endnu.' }))),
  );
}

/* =====================================================================
   Analyser – liste
   ===================================================================== */
async function viewAnalyses() {
  const paint = painter();
  const list = await loadAnalyses();
  const q = h('input', { class: 'in in--search', type: 'search', placeholder: 'Søg i analyser', 'aria-label': 'Søg i analyser' });
  let filter = 'alle';
  const body = h('tbody');
  const render = () => {
    const term = q.value.trim().toLowerCase();
    const rows = list.filter((a) => {
      const st = a.data.status === 'kladde' ? 'kladde' : 'udgivet';
      if (filter !== 'alle' && st !== filter) return false;
      return !term || `${a.data.aktie_navn} ${a.data.titel} ${a.data.symbol} ${a.file}`.toLowerCase().includes(term);
    });
    body.replaceChildren(...rows.map((a) => {
      const d = a.data;
      const draft = d.status === 'kladde';
      const slug = slugOf(a);
      return h('tr', null,
        h('td', { class: 'c-main' }, h('a', { class: 'rowlink', href: `#/analyser/rediger/${encodeURIComponent(a.file)}` }, h('strong', { text: `${d.aktie_navn || '(mangler aktie)'}: ${d.titel || '(mangler titel)'}` })),
          h('span', { class: 'sub', text: [d.symbol, a.error ? `Fejl i filen: ${a.error}` : ''].filter(Boolean).join(' · ') || a.file })),
        h('td', { class: 'nowrap c-date' }, fmtDate(d.dato)),
        h('td', { class: 'c-status' }, h('span', { class: `badge ${draft ? 'badge--draft' : 'badge--live'}`, text: draft ? 'Kladde' : 'Udgivet' }), d.demo ? h('span', { class: 'badge badge--demo', text: 'Eksempel' }) : null),
        h('td', { class: 'hide-sm' }, d.tier === 'premium' ? h('span', { class: 'badge badge--premium', text: 'Premium' }) : h('span', { class: 'muted is-free', text: 'Gratis' })),
        h('td', { class: 'actions' },
          h('a', { class: 'iconbtn', href: `#/analyser/rediger/${encodeURIComponent(a.file)}`, title: 'Redigér', 'aria-label': 'Redigér' }, icon('edit')),
          h('a', { class: 'iconbtn', href: `#/analyser/kopi/${encodeURIComponent(a.file)}`, title: 'Lav en kopi', 'aria-label': 'Lav en kopi' }, icon('copy')),
          draft ? null : h('a', { class: 'iconbtn', href: `/analyser/${slug}/`, target: '_blank', rel: 'noopener', title: 'Se på siden', 'aria-label': 'Se på siden' }, icon('external'))));
    }));
    empty.hidden = rows.length > 0;
  };
  const empty = h('div', { class: 'empty', hidden: true }, h('p', { text: list.length ? 'Ingen analyser matcher søgningen.' : 'Du har ingen analyser endnu.' }), h('a', { class: 'btn btn--primary', href: '#/analyser/ny' }, icon('plus', 18), 'Opret din første analyse'));
  q.addEventListener('input', render);
  paint(
    pageHead('Analyser', `${list.length} i alt. Klik på en analyse for at redigere den.`, h('a', { class: 'btn btn--primary', href: '#/analyser/ny' }, icon('plus', 18), 'Ny analyse')),
    h('div', { class: 'toolbar' }, h('div', { class: 'searchwrap' }, icon('search', 18), q), segmented([['alle', 'Alle'], ['udgivet', 'Udgivet'], ['kladde', 'Kladder']], filter, (v) => { filter = v; render(); })),
    h('div', { class: 'card card--flush' }, h('div', { class: 'tablewrap' }, h('table', { class: 'tbl tbl--stack' },
      h('thead', null, h('tr', null, h('th', { text: 'Analyse' }), h('th', { text: 'Dato' }), h('th', { text: 'Status' }), h('th', { class: 'hide-sm', text: 'Adgang' }), h('th', null, h('span', { class: 'sr-only', text: 'Handlinger' })))), body)), empty));
  render();
}

/* =====================================================================
   Analyser – editor
   ===================================================================== */
const TEMPLATE = `## Det tekniske setup

Beskriv trend, støtte og modstand, og hvad chartet viser lige nu.

## Den fundamentale case

Regnskab, værdiansættelse og hvad der driver aktien.

## Hvad kan gå galt?

- Risiko 1
- Risiko 2

## Sammenfatning

Hvad betyder det samlet set, og hvilke niveauer holder du øje med?`;

// Skabelon til undervisningscases: forløb og metode – ingen handelsinstrukser
const TEMPLATE_EDU = `## Hvad viser chartet?

Beskriv forløbet: trend, støtte og modstand, og hvordan kursen har reageret på dem. Brug gerne historiske eksempler.

## Den fundamentale case

Regnskab, værdiansættelse og hvad der driver forretningen – og hvordan man selv kan regne på det.

## Hvad kan gå galt?

- Risiko 1
- Risiko 2

## Hvad kan du lære af casen?

De vigtigste pointer om metoden, som du kan bruge på andre aktier.`;

async function viewAnalysisEditor(action, arg) {
  const paint = painter();
  const [list, settingsFile] = await Promise.all([loadAnalyses(), loadJson('settings', {})]);
  const edu = (settingsFile.data || {}).indholdstype !== 'anbefalinger'; // undervisningstilstand
  const src = arg ? list.find((a) => a.file === arg) : null;
  if ((action === 'rediger' || action === 'kopi') && !src) throw new Error('Analysen blev ikke fundet. Den kan være slettet.');
  const isNew = action !== 'rediger';
  const base = src ? JSON.parse(JSON.stringify(src.data)) : {};
  const m = {
    titel: base.titel || '', aktie_navn: base.aktie_navn || '', symbol: base.symbol || (base.fakta && base.fakta.ticker) || '',
    valuta: base.valuta || '', dato: action === 'kopi' || !base.dato ? today() : isoDate(base.dato) || today(),
    status: action === 'rediger' ? (base.status === 'kladde' ? 'kladde' : 'udgivet') : 'kladde',
    setup_type: base.setup_type || (edu ? 'Neutral' : 'Bullish'), analyse_type: Array.isArray(base.analyse_type) ? base.analyse_type : base.analyse_type ? [base.analyse_type] : ['Teknisk'],
    sektor: base.sektor || '', marked: base.marked || '', tier: base.tier || 'free', lede: base.lede || '',
    kurs: parseNumber(base.niveauer && base.niveauer.kurs), maal: parseNumber(base.niveauer && base.niveauer.maal), stop: parseNumber(base.niveauer && base.niveauer.stop),
    fakta: { market_cap: '', pe: '', ev_ebitda: '', udbytte: '', h52: '', l52: '', ...(base.fakta || {}) },
    ejer: !!(base.position && base.position.ejer), posTekst: (base.position && base.position.tekst) || '',
    slug: action === 'rediger' ? base.slug || src.file.replace(/\.md$/, '') : '',
    demo: action === 'rediger' && !!base.demo, // en kopi af et eksempel er din egen analyse
    tid: action === 'rediger' ? normTime(base.tid) : nowTime(),
    forudsaetninger: base.forudsaetninger || '',
    kilder: (Array.isArray(base.kilder) ? base.kilder : String(base.kilder || '').split(/\r?\n/)).map((x) => String(x || '').trim()).filter(Boolean).join('\n'),
    forelagt: base.forelagt === true,
    body: src ? src.body : edu ? TEMPLATE_EDU : TEMPLATE,
  };
  delete m.fakta.ticker; delete m.fakta.sektor;
  let slugTouched = action === 'rediger';
  // Standardteksten om position følger aktiens navn og "Jeg ejer aktien" – indtil du selv skriver noget andet.
  const autoText = () => { const name = m.aktie_navn || 'aktien'; return m.ejer ? `Udgiveren ejer aktier i ${name} på publikationstidspunktet.` : `Udgiveren har ingen position i ${name} på publikationstidspunktet.`; };
  let posTouched = !!m.posTekst && m.posTekst !== autoText();
  const others = action === 'rediger' ? list.filter((a) => a !== src) : list;
  const wasPublished = action === 'rediger' && m.status === 'udgivet';

  const autoSlug = () => {
    if (slugTouched) return;
    let s = slugify(`${m.aktie_navn} ${m.titel}`) || 'analyse';
    const taken = new Set(others.map(slugOf));
    let n = 2; const b = s;
    while (taken.has(s)) s = `${b}-${n++}`;
    m.slug = s; slugIn.value = s; urlHint.textContent = `/analyser/${s}/`;
  };
  const autoPos = () => {
    if (posTouched) return;
    m.posTekst = autoText();
    posIn.value = m.posTekst;
  };
  const change = (fn) => (e) => { fn(e && e.target ? e.target.value : e); markDirty(); };

  // Felter
  const titelIn = input(m.titel, { placeholder: 'Fx Vinden vender – men chartet kræver tålmodighed', max: 140, oninput: change((v) => { m.titel = v; autoSlug(); }) });
  const navnIn = input(m.aktie_navn, { placeholder: 'Fx Vestas', oninput: change((v) => { m.aktie_navn = v; autoSlug(); autoPos(); }) });
  const symIn = input(m.symbol, { placeholder: 'Fx VWS.CO', oninput: change((v) => { m.symbol = v.trim().toUpperCase(); }) });
  const valIn = input(m.valuta, { placeholder: 'DKK', max: 5, oninput: change((v) => { m.valuta = v.trim().toUpperCase(); }) });
  const sekIn = input(m.sektor, { placeholder: 'Fx Industri', oninput: change((v) => { m.sektor = v; }) });
  const ledeIn = textarea(m.lede, { rows: 3, max: 600, placeholder: 'To-tre sætninger, der fortæller, hvad analysen handler om. Vises på forsiden og i arkivet.', oninput: change((v) => { m.lede = v; ledeCount.textContent = `${v.length} tegn`; }) });
  const ledeCount = h('span', { class: 'counter', text: `${m.lede.length} tegn` });
  let whenTouched = false; // har brugeren selv sat dato/klokkeslæt?
  const datoIn = input(m.dato, { type: 'date', oninput: change((v) => { m.dato = v; whenTouched = true; }) });
  const tidIn = input(m.tid, { type: 'time', oninput: change((v) => { m.tid = v; whenTouched = true; }) });
  const assIn = textarea(m.forudsaetninger, { rows: 3, max: 800, placeholder: 'Fx Omsætningen vokser 8 % om året, og EBIT-marginen når 12 %. Kursmålet svarer til P/E 20 på 2027-indtjeningen.', oninput: change((v) => { m.forudsaetninger = v; }) });
  const kildeIn = textarea(m.kilder, { rows: 3, placeholder: 'Én kilde pr. linje, fx\nVestas, delårsrapport 3. kvartal 2026\nhttps://…', oninput: change((v) => { m.kilder = v; }) });
  const slugIn = input(m.slug, { oninput: change((v) => { slugTouched = true; m.slug = slugify(v); urlHint.textContent = `/analyser/${m.slug}/`; }) });
  const urlHint = h('code', { text: `/analyser/${m.slug}/` });
  const posIn = textarea(m.posTekst, { rows: 2, oninput: change((v) => { posTouched = true; m.posTekst = v; }) });

  const numIn = (key, ph) => input(m[key] == null ? '' : fmtNum(m[key]), { inputmode: 'decimal', placeholder: ph, oninput: change((v) => { m[key] = parseNumber(v); updateLevels(); }) });
  const kursIn = numIn('kurs', 'Fx 156,80');
  const maalIn = numIn('maal', 'Fx 195');
  const stopIn = numIn('stop', 'Fx 134');
  const levelInfo = h('div', { class: 'levelinfo', 'aria-live': 'polite' });
  const priceNow = h('p', { class: 'f__hint' });
  let livePrice = null;
  const useLive = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', hidden: true, onclick: () => { m.kurs = livePrice; kursIn.value = fmtNum(livePrice); markDirty(); updateLevels(); } }, 'Brug aktuel kurs');
  function updateLevels() {
    const { kurs, maal, stop } = m;
    const parts = [];
    if (kurs && maal) parts.push(h('span', null, 'Potentiale ', h('strong', { text: fmtPct(((maal - kurs) / kurs) * 100) })));
    if (kurs && stop) parts.push(h('span', null, 'Risiko til stop ', h('strong', { text: fmtPct(((stop - kurs) / kurs) * 100) })));
    if (kurs && maal && stop && Math.abs(kurs - stop) > 0) parts.push(h('span', null, 'Risk/reward ', h('strong', { text: `${NF1.format(Math.abs(maal - kurs) / Math.abs(kurs - stop))} : 1` })));
    const warn = [];
    if (kurs && maal && stop) {
      if (m.setup_type === 'Bullish' && !(maal > kurs && stop < kurs)) warn.push('Ved et bullish setup ligger kursmålet normalt over kursen og stop under.');
      if (m.setup_type === 'Bearish' && !(maal < kurs && stop > kurs)) warn.push('Ved et bearish setup ligger kursmålet normalt under kursen og stop over.');
    }
    levelInfo.replaceChildren(...parts, ...warn.map((w) => h('p', { class: 'warn', text: w })));
  }
  async function refreshLive() {
    if (!m.symbol) { priceNow.textContent = ''; useLive.hidden = true; return; }
    const q = (await quotes([m.symbol])).get(m.symbol);
    livePrice = q ? Math.round(q.price * 100) / 100 : null;
    priceNow.textContent = q ? `Aktuel kurs: ${fmtNum(q.price)} ${q.currency || ''}` : 'Den aktuelle kurs kunne ikke hentes.';
    useLive.hidden = !q;
    if (q && !m.valuta) { m.valuta = q.currency; valIn.value = q.currency; }
  }
  symIn.addEventListener('change', refreshLive);

  const picker = stockPicker({
    initial: m.symbol ? `${m.aktie_navn || m.symbol} (${m.symbol})` : '',
    onPick: (it) => {
      m.symbol = it.symbol; symIn.value = it.symbol;
      if (!it.manual) { m.aktie_navn = it.cleanName; navnIn.value = it.cleanName; }
      if (it.currency) { m.valuta = it.currency; valIn.value = it.currency; }
      if (it.sectorDa) { m.sektor = it.sectorDa; sekIn.value = it.sectorDa; }
      m.marked = isDanish(it.symbol) ? 'dansk' : 'internationalt';
      markedSeg.querySelector(`input[value="${m.marked}"]`).checked = true;
      livePrice = it.price != null ? Math.round(it.price * 100) / 100 : null;
      useLive.hidden = livePrice == null;
      priceNow.textContent = livePrice != null ? `Aktuel kurs: ${fmtNum(livePrice)} ${it.currency || ''}` : '';
      if (m.kurs == null && livePrice != null) { m.kurs = livePrice; kursIn.value = fmtNum(livePrice); }
      autoSlug(); autoPos(); updateLevels(); markDirty();
    },
  });
  if (!m.marked) m.marked = isDanish(m.symbol) ? 'dansk' : m.symbol ? 'internationalt' : 'dansk';
  const markedSeg = segmented([['dansk', 'Danske aktier'], ['internationalt', 'Internationale'], ['makro', 'Makro']], m.marked, (v) => { m.marked = v; markDirty(); });

  const lint = lintBox();
  const runLint = debounce(() => lint.update(checkLanguage(m.titel, m.lede, m.body)), 350);
  const editor = mdEditor({ value: m.body, onInput: (v) => { m.body = v; markDirty(); if (edu) runLint(); }, uploadName: () => m.slug || m.aktie_navn });
  if (edu) { titelIn.addEventListener('input', runLint); ledeIn.addEventListener('input', runLint); }

  const faktaFields = [['market_cap', 'Markedsværdi', 'Fx 158 mia. DKK'], ['pe', 'P/E', 'Fx 22,4'], ['ev_ebitda', 'EV/EBITDA', 'Fx 11,8'], ['udbytte', 'Udbytte', 'Fx 2,1 %'], ['h52', '52 ugers høj', 'Fx 178,60'], ['l52', '52 ugers lav', 'Fx 119,40']];

  const saveBtn = h('button', { type: 'button', class: 'btn btn--primary' }, wasPublished ? 'Gem ændringer' : action === 'rediger' ? 'Udgiv' : 'Gem og udgiv');
  const draftBtn = h('button', { type: 'button', class: 'btn btn--secondary' }, wasPublished ? 'Gør til kladde' : 'Gem kladde');
  const delBtn = action === 'rediger' ? h('button', { type: 'button', class: 'btn btn--danger-ghost', 'aria-label': 'Slet analysen' }, icon('trash', 16), h('span', { class: 'btn__label', text: 'Slet' })) : null;

  async function doSave(status) {
    m.status = status;
    const errors = [];
    if (!m.titel.trim()) errors.push('Skriv en titel.');
    if (!m.aktie_navn.trim()) errors.push('Skriv aktiens eller selskabets navn.');
    if (status === 'udgivet' && !wasPublished && !whenTouched) {
      // Første udgivelse: dato og klokkeslæt sættes til nu (tidspunktet for færdiggørelse).
      m.dato = today(); m.tid = nowTime();
      datoIn.value = m.dato; tidIn.value = m.tid;
    }
    if (status === 'udgivet') {
      if (!m.lede.trim()) errors.push('Skriv en kort intro (ledetekst).');
      if (!m.body.trim()) errors.push('Selve analysen er tom.');
    }
    if (!m.slug) autoSlug();
    if (!/^[a-z0-9-]+$/.test(m.slug)) errors.push('Adressen må kun indeholde små bogstaver, tal og bindestreger.');
    if (others.some((a) => slugOf(a) === m.slug)) errors.push(`Adressen /analyser/${m.slug}/ bruges allerede af en anden analyse. Vælg en anden under "Adresse".`);
    if (status === 'udgivet' && edu) {
      const hits = checkLanguage(m.titel, m.lede, m.body);
      if (hits.length) {
        const go2 = await dialog({ title: 'Teksten lyder som en anbefaling', text: `Sprogtjekket fandt ${hits.map((x) => `«${x.phrase}»`).slice(0, 5).join(', ')}. I undervisningstilstand skal casen forklare, hvad der er sket, og hvordan metoden bruges – ikke hvad læseren skal gøre. Vil du udgive alligevel?`, confirm: 'Udgiv alligevel', cancel: 'Ret teksten' });
        if (!go2) { editor.ta.focus(); return; }
      }
    }
    if (status === 'udgivet' && !edu && (m.maal != null || m.stop != null) && !m.forudsaetninger.trim()) {
      const go2 = await dialog({ title: 'Mangler forudsætninger', text: 'Analysen har et kursmål eller stop, men ingen forudsætninger. Finanstilsynet kræver, at kursmål markeres som prognoser med de væsentlige forudsætninger. Vil du udgive alligevel?', confirm: 'Udgiv alligevel', cancel: 'Skriv forudsætninger' });
      if (!go2) { assIn.focus(); return; }
    }
    if (wasPublished && status === 'kladde') {
      const ok = await dialog({ title: 'Gør analysen til en kladde?', text: 'Analysen fjernes fra siden, indtil du udgiver den igen. Links til den virker ikke imens.', confirm: 'Gør til kladde' });
      if (!ok) return;
    }
    if (errors.length) { errors.forEach((e) => toast(e, 'error', 6000)); return; }

    const data = action === 'rediger' ? { ...base } : {};
    delete data.niveauer; delete data.fakta; delete data.position;
    Object.assign(data, {
      titel: m.titel.trim(), slug: m.slug, aktie_navn: m.aktie_navn.trim(),
      symbol: m.symbol || undefined, valuta: m.valuta || undefined, dato: m.dato || today(), status: m.status,
      setup_type: m.setup_type, analyse_type: m.analyse_type.length ? m.analyse_type : ['Teknisk'],
      sektor: m.sektor || undefined, marked: m.marked, tier: m.tier, lede: m.lede.trim(),
      niveauer: Object.fromEntries(Object.entries({ kurs: m.kurs, maal: m.maal, stop: m.stop }).filter(([, v]) => v != null)),
      position: { ejer: m.ejer, tekst: m.posTekst.trim() },
      tid: normTime(m.tid) || undefined,
      forudsaetninger: m.forudsaetninger.trim() || undefined,
      kilder: m.kilder.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
      forelagt: m.forelagt,
    });
    if (!data.kilder.length) delete data.kilder;
    if (!Object.keys(data.niveauer).length) delete data.niveauer;
    const fakta = Object.fromEntries(Object.entries(m.fakta).filter(([, v]) => String(v || '').trim()));
    if (Object.keys(fakta).length) data.fakta = fakta;
    if (m.demo) data.demo = true; else delete data.demo;
    if (action === 'rediger' && m.symbol !== base.symbol) delete data.tv_symbol; // TradingView-symbolet udledes igen af det nye symbol
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

    const file = action === 'rediger' ? src.file : (() => {
      let f = `${m.slug}.md`; let n = 2;
      const names = new Set(list.map((a) => a.file));
      while (names.has(f)) f = `${m.slug}-${n++}.md`;
      return f;
    })();
    const path = `${PATHS.analyser}/${file}`;
    const text = stringifyMd(data, m.body);
    saveBtn.disabled = draftBtn.disabled = true;
    try {
      const imgs = await stagedChangesFor(m.body);
      const res = await save([...imgs, { path, text }], `${action === 'rediger' ? 'Opdateret' : 'Ny'} analyse: ${data.aktie_navn} – ${data.titel}`, action === 'rediger' ? { [path]: src.sha } : { [path]: null });
      clearStaged(m.body);
      S.dirty = false;
      const p = parseMd(text);
      rememberAnalysis({ file, path, sha: res.blobs[path], data: p.data, body: p.body });
      toast(status === 'kladde'
        ? (wasPublished ? 'Analysen er nu en kladde og fjernes fra siden om ca. 1 minut.' : 'Kladden er gemt. Den vises ikke på siden, før du udgiver den.')
        : (wasPublished ? 'Ændringerne er gemt. Siden opdateres om ca. 1 minut.' : 'Analysen er udgivet. Den er på siden om ca. 1 minut.'), 'success', 6500);
      go(`#/analyser/rediger/${encodeURIComponent(file)}`);
    } catch (err) {
      toast(`Kunne ikke gemme: ${err.message}`, 'error', 8000);
    } finally { saveBtn.disabled = draftBtn.disabled = false; }
  }
  saveBtn.addEventListener('click', () => doSave('udgivet'));
  draftBtn.addEventListener('click', () => doSave('kladde'));
  delBtn?.addEventListener('click', async () => {
    const ok = await dialog({ title: 'Slet analysen?', text: `"${m.aktie_navn}: ${m.titel}" fjernes fra siden og fra repoet. Det kan ikke fortrydes her (men findes stadig i historikken på GitHub).`, confirm: 'Slet analysen', danger: true });
    if (!ok) return;
    try {
      await save([{ path: src.path, delete: true }], `Slettet analyse: ${m.aktie_navn} – ${m.titel}`, { [src.path]: src.sha });
      S.dirty = false;
      rememberAnalysis(null, src.file);
      toast('Analysen er slettet.', 'success');
      go('#/analyser');
    } catch (err) { toast(`Kunne ikke slette: ${err.message}`, 'error', 8000); }
  });

  // Ctrl+S gemmer – en ny analyse eller kladde gemmes som kladde, så intet udgives ved et uheld.
  const ctrlS = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saveBtn.disabled) doSave(wasPublished ? 'udgivet' : 'kladde'); } };
  document.addEventListener('keydown', ctrlS);
  S.cleanup.push(() => document.removeEventListener('keydown', ctrlS));

  const viewLink = wasPublished ? h('a', { class: 'btn btn--ghost', href: `/analyser/${m.slug}/`, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Se på siden') : null;

  paint(
    h('a', { class: 'back', href: '#/analyser' }, '← Alle analyser'),
    pageHead(action === 'rediger' ? 'Redigér analyse' : action === 'kopi' ? 'Ny analyse (kopi)' : 'Ny analyse', action === 'rediger' ? `${m.aktie_navn}: ${m.titel}` : 'Udfyld felterne, og tryk Gem og udgiv. Felter med * skal udfyldes.', viewLink),
    h('div', { class: 'form' },
      section('Aktie', 'Søg efter selskabet – så udfyldes navn, symbol, valuta, sektor og aktuel kurs automatisk.',
        field('Find aktie', picker, { wide: true }),
        h('div', { class: 'grid3' },
          field('Navn på selskab', navnIn, { required: true }),
          field('Symbol', symIn, { hint: 'Yahoo-symbol, fx NOVO-B.CO eller AAPL' }),
          field('Valuta', valIn)),
        h('div', { class: 'grid3' }, field('Sektor', sekIn), h('div', { class: 'f f--span2' }, h('span', { class: 'flabel', text: 'Marked' }), markedSeg))),
      section('Overskrift og intro', null,
        field('Titel', titelIn, { required: true, hint: 'Vises efter aktiens navn, fx "Vestas: Vinden vender".', wide: true }),
        h('div', { class: 'f f--wide' }, h('label', { for: ledeIn.id = `lede${++uid}` }, 'Ledetekst', h('span', { class: 'req', text: ' *' })), ledeIn, h('div', { class: 'f__row' }, h('p', { class: 'f__hint', text: 'Vises på forsiden, i arkivet og øverst i analysen.' }), ledeCount)),
        h('div', { class: 'grid3' },
          field('Dato', datoIn),
          field('Klokkeslæt', tidIn, { hint: wasPublished ? 'Hvornår analysen blev færdig. Vises på analysen.' : 'Sættes automatisk til tidspunktet, når du udgiver.' }),
          h('div', { class: 'f' }, h('span', { class: 'flabel', text: 'Adgang' }), segmented([['free', 'Gratis'], ['premium', 'Premium']], m.tier, (v) => { m.tier = v; markDirty(); }), h('p', { class: 'f__hint', text: 'Premium viser intro og første afsnit – resten er låst.' })))),
      section('Kategori', null,
        h('div', { class: 'grid3' },
          edu ? null : h('div', { class: 'f' }, h('span', { class: 'flabel', text: 'Setup' }), segmented([['Bullish', 'Bullish'], ['Bearish', 'Bearish'], ['Neutral', 'Neutral']], m.setup_type, (v) => { m.setup_type = v; updateLevels(); markDirty(); })),
          h('div', { class: edu ? 'f f--wide' : 'f f--span2' }, h('span', { class: 'flabel', text: 'Type' }), checkChips([['Teknisk', 'Teknisk'], ['Fundamental', 'Fundamental'], ['Makro', 'Makro']], m.analyse_type, (v) => { m.analyse_type = v; markDirty(); })))),
      edu
        ? section('Kurs', 'Kursen på udgivelsestidspunktet vises på grafen. I undervisningstilstand vises ingen kursmål, stop eller kursudvikling siden udgivelsen.',
          h('div', { class: 'grid3' },
            h('div', { class: 'f' }, h('label', { for: kursIn.id = `kurs${++uid}` }, 'Kurs ved udgivelse'), kursIn, h('div', { class: 'f__row' }, priceNow, useLive))))
        : section('Niveauer', 'Bruges i analysens nøgletal, på grafen og til at vise kursudviklingen siden udgivelsen.',
          h('div', { class: 'grid3' },
            h('div', { class: 'f' }, h('label', { for: kursIn.id = `kurs${++uid}` }, 'Kurs ved analysen'), kursIn, h('div', { class: 'f__row' }, priceNow, useLive)),
            field('Kursmål', maalIn),
            field('Stop', stopIn)),
          levelInfo,
          field('Forudsætninger for kursmål og stop', assIn, { wide: true, hint: 'Vises under niveauerne. Finanstilsynet kræver, at kursmål markeres som prognoser med de væsentlige forudsætninger.' })),
      section(edu ? 'Selve casen' : 'Selve analysen', edu ? 'Forklar metoden på aktien: hvad viser chartet og regnskabet, og hvad skal der til, før casen ikke holder? Brug gerne historiske forløb. Overskrifter (H2) bliver til indholdsfortegnelsen.' : 'Skriv med overskrifter (H2) – de bliver til indholdsfortegnelsen ved siden af analysen.', editor.el, edu ? lint.el : null),
      h('details', { class: 'fsec fsec--fold' },
        h('summary', null, h('h2', { text: 'Nøgletal' }), h('span', { class: 'muted', text: 'Valgfrit – vises i faktaboksen' })),
        h('div', { class: 'fsec__body grid3' }, faktaFields.map(([k, label, ph]) => field(label, input(m.fakta[k], { placeholder: ph, oninput: change((v) => { m.fakta[k] = v; }) }))))),
      section('Oplysninger til læseren', edu ? 'Vises i bunden af casen. Oplys altid, om du selv ejer aktien, og hvor dine tal kommer fra – det giver tillid.' : 'Vises i bunden af analysen. Finanstilsynet kræver bl.a., at du oplyser egne positioner og andre interesser, dine kilder, og om selskabet har set analysen.',
        toggle('Jeg ejer aktien', m.ejer, (v) => { m.ejer = v; autoPos(); markDirty(); if (posTouched) toast('Husk at rette teksten om din position, så den passer.', 'info'); }),
        field('Position og andre interesser', posIn, { wide: true, hint: 'Skriv også, hvis du har andre forbindelser til selskabet, der kan påvirke din objektivitet.' }),
        field('Kilder', kildeIn, { wide: true, hint: 'Én kilde pr. linje. Links bliver klikbare.' }),
        edu ? null : toggle('Analysen er vist til selskabet før udgivelsen', m.forelagt, (v) => { m.forelagt = v; markDirty(); }, 'Normalt nej. Slå kun til, hvis selskabet har set analysen, før den blev udgivet.')),
      action === 'rediger' && m.demo ? section('Eksempel', null, toggle('Vis som eksempelanalyse', m.demo, (v) => { m.demo = v; markDirty(); }, 'Slå fra, når analysen er din egen. Så forsvinder Eksempel-mærkaten.')) : null,
      h('details', { class: 'fsec fsec--fold' },
        h('summary', null, h('h2', { text: 'Adresse' }), h('span', { class: 'muted' }, urlHint)),
        h('div', { class: 'fsec__body' }, field('Adresse (slug)', slugIn, { hint: action === 'rediger' ? 'Hvis du ændrer adressen på en udgivet analyse, virker gamle links ikke længere.' : 'Udfyldes automatisk ud fra aktie og titel.', wide: true })))),
    h('div', { class: 'savebar' }, delBtn, h('span', { class: 'savebar__sp' }), h('a', { class: 'btn btn--ghost', href: '#/analyser' }, 'Annullér'), draftBtn, saveBtn));
  updateLevels();
  if (edu) lint.update(checkLanguage(m.titel, m.lede, m.body));
  if (m.symbol) refreshLive();
  if (isNew && !slugTouched) autoSlug();
  if (!posTouched) autoPos();
}

/* =====================================================================
   Portefølje
   ===================================================================== */
/** Dato, hvor en position kommer med på siden (forsinkelse efter seneste køb eller salg) – eller null, hvis den allerede vises. */
function pendingUntil(p, delay) {
  if (!delay) return null;
  const last = p.status === 'lukket' && p.salgsdato ? isoDate(p.salgsdato) : isoDate(p.koebsdato);
  if (!last) return null;
  const from = new Date(Date.parse(last + 'T12:00:00Z') + delay * 86400e3).toISOString().slice(0, 10);
  return from > today() ? from : null;
}

// Modelportefølje: tænkte handler skal registreres med dagens dato og den aktuelle kurs – ellers beviser resultatet ingenting.
const isModel = (sd) => (sd || {}).portefolje_type === 'model';
function priceGap(price, live) { return price > 0 && live > 0 ? Math.abs(price - live) / live : 0; }
async function confirmModelTrade(issues) {
  if (!issues.length) return true;
  return !!(await dialog({
    title: 'Tjek handlen i modelporteføljen',
    text: `${issues.join(' ')} I en modelportefølje skal handler registreres med dagens dato og den aktuelle kurs, og der må ikke rettes i dem bagefter – ellers kan resultatet ikke bruges som bevis og kan virke vildledende. Gem alligevel?`,
    confirm: 'Gem alligevel', cancel: 'Ret handlen',
  }));
}

// Et salg af en ældre position: positionen står stadig som åben på siden, indtil salget må vises.
function soldLater(p, delay) {
  const bought = isoDate(p.koebsdato);
  return p.status === 'lukket' && !!bought && new Date(Date.parse(bought + 'T12:00:00Z') + delay * 86400e3).toISOString().slice(0, 10) <= today();
}

async function viewPortfolio() {
  const paint = painter();
  const [pf, st] = await Promise.all([loadJson('portfolio', { positioner: [] }), loadJson('settings', {})]);
  const all = pf.data.positioner || (pf.data.positioner = []);
  const sdata = st.data || {};
  const delay = sdata.portefolje_forsinkelse == null ? 30 : Number(sdata.portefolje_forsinkelse) || 0;
  let tab = 'aaben';
  const head = h('thead');
  const body = h('tbody');
  const summary = h('p', { class: 'muted toolbar__note' });
  let live = new Map();

  const render = () => {
    const rows = all.map((p, i) => ({ p, i })).filter(({ p }) => (p.status === 'lukket' ? 'lukket' : 'aaben') === tab);
    head.replaceChildren(h('tr', null, h('th', { text: 'Aktie' }), h('th', { text: 'Købt til' }), h('th', { text: tab === 'lukket' ? 'Solgt til' : 'Kurs nu' }), h('th', { text: 'Afkast' }), h('th', { class: 'hide-sm', text: 'Vægt' }), h('th', { text: 'Synlighed' }), h('th', null, h('span', { class: 'sr-only', text: 'Handlinger' }))));
    body.replaceChildren(...rows.map(({ p }) => {
      const q = live.get(p.symbol);
      const entry = parseNumber(p.koebskurs);
      const exit = p.status === 'lukket' ? parseNumber(p.salgskurs) : q ? q.price : null;
      const ret = entry && exit ? ((exit - entry) / entry) * 100 : null;
      return h('tr', null,
        h('td', { class: 'c-main' }, h('a', { class: 'rowlink', href: `#/portefolje/rediger/${encodeURIComponent(p.id)}` }, h('strong', { text: p.navn || p.symbol })), h('span', { class: 'sub', text: [p.symbol, p.sektor].filter(Boolean).join(', ') })),
        h('td', { class: 'nowrap c-buy', 'data-label': 'Købt' }, h('span', { text: fmtNum(entry) }), h('span', { class: 'sub', text: fmtDate(p.koebsdato) })),
        h('td', { class: 'nowrap c-now', 'data-label': p.status === 'lukket' ? 'Solgt' : 'Kurs nu' }, p.status === 'lukket' ? h('span', null, h('span', { text: fmtNum(exit) }), h('span', { class: 'sub', text: fmtDate(p.salgsdato) })) : h('span', { text: q ? fmtNum(q.price) : '–' })),
        h('td', { class: `nowrap ret c-ret ${ret > 0 ? 'up' : ret < 0 ? 'down' : ''}`, text: fmtPct(ret) }),
        h('td', { class: 'nowrap hide-sm', text: p.vaegt ? `${NF1.format(parseNumber(p.vaegt))} %` : '–' }),
        h('td', { class: 'c-vis' }, p.synlighed === 'medlemmer' ? h('span', { class: 'badge badge--premium' }, icon('lock', 13), 'Medlemmer') : h('span', { class: 'muted vis-default', text: 'Offentlig' }), p.demo ? h('span', { class: 'badge badge--demo', text: 'Eksempel' }) : null, pendingUntil(p, delay) ? h('span', { class: 'badge badge--draft', title: soldLater(p, delay) ? `Vises som åben på siden, indtil salget vises ${fmtDate(pendingUntil(p, delay))} (${delay} dages forsinkelse)` : `Vises på siden fra ${fmtDate(pendingUntil(p, delay))} (${delay} dages forsinkelse)`, text: `${soldLater(p, delay) ? 'Salget vises' : 'Vises'} fra ${fmtDate(pendingUntil(p, delay))}` }) : null),
        h('td', { class: 'actions' },
          h('a', { class: 'iconbtn', href: `#/portefolje/rediger/${encodeURIComponent(p.id)}`, title: 'Redigér', 'aria-label': 'Redigér' }, icon('edit')),
          p.status !== 'lukket' ? h('button', { class: 'btn btn--ghost btn--sm', onclick: () => closePosition(p, q) }, 'Luk position') : null));
    }));
    empty.hidden = rows.length > 0;
    const openPos = all.filter((p) => p.status !== 'lukket');
    const w = openPos.reduce((s, p) => s + (parseNumber(p.vaegt) || 0), 0);
    const nOpen = openPos.length, nClosed = all.length - nOpen;
    summary.textContent = `${nOpen} ${nOpen === 1 ? 'åben' : 'åbne'} og ${nClosed} ${nClosed === 1 ? 'lukket' : 'lukkede'}.${w ? ` Samlet vægt i åbne positioner: ${NF1.format(w)} %.` : ''}${w > 100.5 ? ' Bemærk: vægtene summerer til over 100 %.' : ''}`;
  };
  const empty = h('div', { class: 'empty', hidden: true }, h('p', { text: 'Der er ingen positioner her.' }), h('a', { class: 'btn btn--primary', href: '#/portefolje/ny' }, icon('plus', 18), 'Tilføj investering'));

  let closing = false;
  async function closePosition(p, q) {
    if (closing) return;
    closing = true;
    try { await closePositionInner(p, q); } finally { closing = false; }
  }
  async function closePositionInner(p, q) {
    const r = await dialog({
      title: `Luk position i ${p.navn}`,
      text: 'Positionen flyttes til "Lukkede handler" på siden med salgskurs og afkast.',
      fields: [{ name: 'dato', label: 'Salgsdato', type: 'date', value: today() }, { name: 'kurs', label: 'Salgskurs', inputmode: 'decimal', value: q ? fmtNum(q.price) : '', hint: q ? `Aktuel kurs: ${fmtNum(q.price)} ${q.currency || ''}` : '' }, { name: 'kommentar', label: 'Kommentar (valgfrit)', type: 'textarea', value: p.kommentar || '' }],
      confirm: 'Luk position',
    });
    if (!r) return;
    const kurs = parseNumber(r.kurs);
    if (kurs == null) return toast('Skriv en salgskurs.', 'error');
    if (isModel(sdata)) {
      const issues = [];
      if (r.dato && r.dato !== today()) issues.push(`Salgsdatoen er ${fmtDate(r.dato)}, ikke i dag.`);
      if (q && priceGap(kurs, q.price) > 0.02) issues.push(`Salgskursen afviger ${NF1.format(priceGap(kurs, q.price) * 100)} % fra den aktuelle kurs (${fmtNum(q.price)}).`);
      if (!(await confirmModelTrade(issues))) return;
    }
    const next = JSON.parse(JSON.stringify(pf.data));
    const t = next.positioner.find((x) => x.id === p.id);
    Object.assign(t, { status: 'lukket', salgsdato: r.dato || today(), salgskurs: kurs, kommentar: r.kommentar.trim() });
    try {
      await saveJson('portfolio', next, `Lukket position: ${p.navn}`);
      toast('Positionen er lukket. Siden opdateres om ca. 1 minut.', 'success');
      viewPortfolio();
    } catch (err) { toast(`Kunne ikke gemme: ${err.message}`, 'error', 8000); }
  }

  const tabs = segmented([['aaben', 'Åbne'], ['lukket', 'Lukkede']], tab, (v) => { tab = v; render(); });
  paint(
    pageHead(isModel(sdata) ? 'Modelportefølje' : 'Portefølje', sdata.vis_portefolje === false ? 'Porteføljesiden er slået fra under Indstillinger → Generelt, så positionerne vises ikke på siden.' : isModel(sdata) ? `Tænkte handler, der vises på siden som modelportefølje. Registrér hver handel med dagens dato og kurs, og ret ikke i dem bagefter.${delay ? ` Nye handler vises først efter ${delay} dage.` : ''}` : `Investeringer, der vises på siden under Portefølje.${delay ? ` Nye køb og salg vises først efter ${delay} dage.` : ''} Afkastet beregnes automatisk med de aktuelle kurser.`, h('a', { class: 'btn btn--primary', href: '#/portefolje/ny' }, icon('plus', 18), 'Ny investering')),
    h('div', { class: 'toolbar' }, tabs, summary),
    h('div', { class: 'card card--flush' }, h('div', { class: 'tablewrap' }, h('table', { class: 'tbl tbl--stack tbl--pf' },
      head, body)), empty));
  render();
  live = await quotes(all.filter((p) => p.status !== 'lukket').map((p) => p.symbol));
  render();
}

async function viewPositionEditor(action, arg) {
  const paint = painter();
  const [pf, analyses, st] = await Promise.all([loadJson('portfolio', { positioner: [] }), loadAnalyses(), loadJson('settings', {})]);
  const model = isModel(st.data);
  const all = pf.data.positioner || [];
  const src = action === 'rediger' ? all.find((p) => p.id === arg) : null;
  if (action === 'rediger' && !src) throw new Error('Positionen blev ikke fundet.');
  const m = {
    navn: '', symbol: '', valuta: '', sektor: '', marked: 'dansk', status: 'aaben', koebsdato: today(), koebskurs: null,
    vaegt: null, salgsdato: '', salgskurs: null, kommentar: '', analyse: '', synlighed: 'offentlig',
    ...(src ? JSON.parse(JSON.stringify(src)) : {}),
  };
  m.koebskurs = parseNumber(m.koebskurs); m.salgskurs = parseNumber(m.salgskurs); m.vaegt = parseNumber(m.vaegt);
  const ch = (k, fn) => (e) => { m[k] = fn ? fn(e.target.value) : e.target.value; markDirty(); };

  const navnIn = input(m.navn, { placeholder: 'Fx Novo Nordisk', oninput: ch('navn') });
  const symIn = input(m.symbol, { placeholder: 'Fx NOVO-B.CO', oninput: ch('symbol', (v) => v.trim().toUpperCase()) });
  const valIn = input(m.valuta, { placeholder: 'DKK', max: 5, oninput: ch('valuta', (v) => v.trim().toUpperCase()) });
  const sekIn = input(m.sektor, { placeholder: 'Fx Sundhed', oninput: ch('sektor') });
  const kIn = input(fmtNum(m.koebskurs), { inputmode: 'decimal', placeholder: 'Fx 412,50', oninput: ch('koebskurs', parseNumber) });
  const priceNow = h('p', { class: 'f__hint' });
  let livePrice = null;
  const useLive = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', hidden: true, onclick: () => { m.koebskurs = livePrice; kIn.value = fmtNum(livePrice); markDirty(); } }, 'Brug aktuel kurs');
  const sellBox = h('div', { class: 'grid3', hidden: m.status !== 'lukket' },
    field('Salgsdato', input(m.salgsdato, { type: 'date', oninput: ch('salgsdato') })),
    field('Salgskurs', input(fmtNum(m.salgskurs), { inputmode: 'decimal', oninput: ch('salgskurs', parseNumber) })));

  const picker = stockPicker({
    initial: m.symbol ? `${m.navn || m.symbol} (${m.symbol})` : '',
    onPick: (it) => {
      m.symbol = it.symbol; symIn.value = it.symbol;
      if (!it.manual) { m.navn = it.cleanName; navnIn.value = it.cleanName; }
      if (it.currency) { m.valuta = it.currency; valIn.value = it.currency; }
      if (it.sectorDa) { m.sektor = it.sectorDa; sekIn.value = it.sectorDa; }
      m.marked = isDanish(it.symbol) ? 'dansk' : 'internationalt';
      livePrice = it.price != null ? Math.round(it.price * 100) / 100 : null;
      useLive.hidden = livePrice == null;
      priceNow.textContent = livePrice != null ? `Aktuel kurs: ${fmtNum(livePrice)} ${it.currency || ''}` : '';
      if (m.koebskurs == null && livePrice != null && m.koebsdato === today()) { m.koebskurs = livePrice; kIn.value = fmtNum(livePrice); }
      markDirty();
    },
  });
  if (m.symbol) quotes([m.symbol]).then((map) => { const q = map.get(m.symbol); if (q) { livePrice = Math.round(q.price * 100) / 100; priceNow.textContent = `Aktuel kurs: ${fmtNum(q.price)} ${q.currency || ''}`; useLive.hidden = false; } });

  const analysisSel = h('select', { class: 'in', onchange: ch('analyse') },
    h('option', { value: '', text: 'Ingen' }),
    analyses.map((a) => { const slug = slugOf(a); return h('option', { value: slug, selected: slug === m.analyse, text: `${a.data.aktie_navn || ''}: ${a.data.titel || slug}${a.data.status === 'kladde' ? ' (kladde)' : ''}` }); }));

  const saveBtn = h('button', { type: 'button', class: 'btn btn--primary' }, model ? 'Gem handel' : 'Gem investering');
  const delBtn = src ? h('button', { type: 'button', class: 'btn btn--danger-ghost', 'aria-label': 'Slet positionen' }, icon('trash', 16), h('span', { class: 'btn__label', text: 'Slet' })) : null;

  saveBtn.addEventListener('click', async () => {
    const errors = [];
    if (!m.symbol) errors.push('Vælg en aktie eller skriv symbolet.');
    if (!String(m.navn || '').trim()) errors.push('Skriv selskabets navn.');
    if (m.koebskurs == null || m.koebskurs <= 0) errors.push('Skriv købskursen.');
    if (m.status === 'lukket' && (m.salgskurs == null || m.salgskurs <= 0)) errors.push('Skriv salgskursen for den lukkede position.');
    if (errors.length) return errors.forEach((e) => toast(e, 'error', 6000));
    if (model) {
      const issues = [];
      if (!src) {
        if ((m.koebsdato || today()) !== today()) issues.push(`Købsdatoen er ${fmtDate(m.koebsdato)}, ikke i dag.`);
        if (livePrice && priceGap(m.koebskurs, livePrice) > 0.02) issues.push(`Købskursen afviger ${NF1.format(priceGap(m.koebskurs, livePrice) * 100)} % fra den aktuelle kurs (${fmtNum(livePrice)}).`);
      } else {
        const changed = (a, b) => String(a ?? '') !== String(b ?? '');
        if (changed(isoDate(src.koebsdato), m.koebsdato) || changed(parseNumber(src.koebskurs), m.koebskurs)) issues.push('Du ændrer købsdato eller købskurs på en handel, der allerede er registreret.');
        if (src.status === 'lukket' && m.status === 'lukket' && (changed(isoDate(src.salgsdato), m.salgsdato) || changed(parseNumber(src.salgskurs), m.salgskurs))) issues.push('Du ændrer salgsdato eller salgskurs på en handel, der allerede er registreret.');
        if (src.status !== 'lukket' && m.status === 'lukket') {
          if ((m.salgsdato || today()) !== today()) issues.push(`Salgsdatoen er ${fmtDate(m.salgsdato)}, ikke i dag.`);
          if (livePrice && priceGap(m.salgskurs, livePrice) > 0.02) issues.push(`Salgskursen afviger ${NF1.format(priceGap(m.salgskurs, livePrice) * 100)} % fra den aktuelle kurs (${fmtNum(livePrice)}).`);
        }
      }
      if (!(await confirmModelTrade(issues))) return;
    }
    const next = JSON.parse(JSON.stringify(pf.data));
    next.positioner = next.positioner || [];
    const rec = {
      ...(src ? next.positioner.find((p) => p.id === src.id) : {}),
      id: src ? src.id : `${slugify(m.navn || m.symbol)}-${Date.now().toString(36)}`,
      navn: m.navn.trim(), symbol: m.symbol, valuta: m.valuta || (isDanish(m.symbol) ? 'DKK' : 'USD'), marked: isDanish(m.symbol) ? 'dansk' : 'internationalt',
      sektor: (m.sektor || '').trim() || 'Øvrige', status: m.status, koebsdato: m.koebsdato || today(), koebskurs: m.koebskurs,
      vaegt: m.vaegt || 0, salgsdato: m.status === 'lukket' ? m.salgsdato || today() : '', salgskurs: m.status === 'lukket' ? m.salgskurs : null,
      kommentar: (m.kommentar || '').trim(), analyse: m.analyse || '', synlighed: m.synlighed,
    };
    if (src && src.demo && m.demo) rec.demo = true; else delete rec.demo;
    if (src && src.symbol !== rec.symbol) delete rec.tv_symbol; // udledes igen af det nye symbol
    if (src) next.positioner = next.positioner.map((p) => (p.id === src.id ? rec : p)); else next.positioner.push(rec);
    saveBtn.disabled = true;
    try {
      await saveJson('portfolio', next, `${src ? 'Opdateret' : 'Ny'} investering: ${rec.navn}`);
      S.dirty = false;
      toast(src ? 'Ændringerne er gemt. Siden opdateres om ca. 1 minut.' : `${rec.navn} er tilføjet ${model ? 'modelporteføljen' : 'porteføljen'}. Siden opdateres om ca. 1 minut.`, 'success', 6000);
      go('#/portefolje');
    } catch (err) { toast(`Kunne ikke gemme: ${err.message}`, 'error', 8000); } finally { saveBtn.disabled = false; }
  });
  delBtn?.addEventListener('click', async () => {
    const ok = await dialog({ title: `Slet ${src.navn}?`, text: 'Positionen fjernes helt fra porteføljen på siden. Vil du i stedet vise den som solgt, så brug "Luk position".', confirm: 'Slet position', danger: true });
    if (!ok) return;
    const next = JSON.parse(JSON.stringify(pf.data));
    next.positioner = next.positioner.filter((p) => p.id !== src.id);
    try {
      await saveJson('portfolio', next, `Slettet investering: ${src.navn}`);
      S.dirty = false;
      toast('Positionen er slettet.', 'success');
      go('#/portefolje');
    } catch (err) { toast(`Kunne ikke slette: ${err.message}`, 'error', 8000); }
  });

  paint(
    h('a', { class: 'back', href: '#/portefolje' }, '← Porteføljen'),
    pageHead(src ? `Redigér ${src.navn}` : model ? 'Ny handel i modelporteføljen' : 'Ny investering', src ? null : model ? 'Søg efter aktien – dagens dato og kurs udfyldes automatisk. Handlen er tænkt og vises som en del af modelporteføljen.' : 'Søg efter aktien – navn, valuta, sektor og dagens kurs udfyldes automatisk.'),
    h('div', { class: 'form' },
      section('Aktie', null,
        field('Find aktie', picker, { wide: true }),
        h('div', { class: 'grid3' }, field('Navn', navnIn, { required: true }), field('Symbol', symIn, { required: true }), field('Valuta', valIn)),
        h('div', { class: 'grid3' }, field('Sektor', sekIn, { hint: 'Bruges i fordelingen på sektorer.' }))),
      section('Køb', null,
        h('div', { class: 'grid3' },
          field('Købsdato', input(m.koebsdato, { type: 'date', oninput: ch('koebsdato') })),
          h('div', { class: 'f' }, h('label', { for: kIn.id = `k${++uid}` }, 'Købskurs', h('span', { class: 'req', text: ' *' })), kIn, h('div', { class: 'f__row' }, priceNow, useLive)),
          field('Vægt i porteføljen (%)', input(m.vaegt == null ? '' : NF1.format(m.vaegt), { inputmode: 'decimal', digits: 1, placeholder: 'Fx 10', oninput: ch('vaegt', parseNumber) }), { hint: 'Valgfrit. Bruges til fordeling og vægtet afkast.' }))),
      section('Status', null,
        segmented([['aaben', 'Åben position'], ['lukket', 'Solgt (lukket)']], m.status, (v) => { m.status = v; sellBox.hidden = v !== 'lukket'; markDirty(); }),
        sellBox),
      section('Visning', null,
        h('div', { class: 'f' }, h('span', { class: 'flabel', text: 'Hvem kan se positionen?' }), segmented([['offentlig', 'Alle'], ['medlemmer', 'Kun medlemmer']], m.synlighed, (v) => { m.synlighed = v; markDirty(); }), h('p', { class: 'f__hint', text: '"Kun medlemmer" viser sektor og vægt, men skjuler navn, kurs og afkast på den offentlige side.' })),
        field('Kommentar', textarea(m.kommentar, { rows: 3, placeholder: 'Kort begrundelse for købet. Vises under positionen.', oninput: ch('kommentar') }), { wide: true }),
        field('Tilknyttet analyse', analysisSel, { hint: 'Giver et link fra porteføljen til analysen.' })),
      src && src.demo ? section('Eksempel', null, toggle('Vis som eksempel', !!m.demo, (v) => { m.demo = v; markDirty(); }, 'Slå fra, når positionen er din egen. Så forsvinder Eksempel-mærkaten.')) : null),
    h('div', { class: 'savebar' }, delBtn, h('span', { class: 'savebar__sp' }), h('a', { class: 'btn btn--ghost', href: '#/portefolje' }, 'Annullér'), saveBtn));
}

/* =====================================================================
   Indstillinger
   ===================================================================== */
const SETTINGS_TABS = [['generelt', 'Generelt'], ['medlemskab', 'Priser'], ['om', 'Om-siden'], ['kurser', 'Kurslister']];

async function viewSettings(tab) {
  const paint = painter();
  const st = await loadJson('settings', {});
  const d = JSON.parse(JSON.stringify(st.data || {}));
  const ch = (path, fn) => (e) => { setPath(d, path, fn ? fn(e.target.value) : e.target.value); markDirty(); };
  const body = h('div', { class: 'form' });

  if (tab === 'generelt') {
    body.append(
      section('Indhold og regler', 'Bestemmer, hvordan analyserne vises – og dermed om siden giver anbefalinger.', contentTypeControl(d)),
      section('Afsender', 'Hvem står bag siden. Vises på analyserne, i bunden af siden og i handelsbetingelserne.',
        h('div', { class: 'grid3' },
          field('Dit navn', input(d.forfatter || '', { oninput: ch('forfatter'), placeholder: 'Fx Fatih Yüksel' }), { hint: 'Vises som afsender på alle analyser.' }),
          field('Din titel', input(d.forfatter_titel || '', { oninput: ch('forfatter_titel'), placeholder: 'Fx Privatinvestor og skribent' }), { hint: 'Vises sammen med dit navn. Kræves, hvis du udgiver analyser med kursmål.' }),
          field('E-mail', input(d.email || '', { type: 'email', oninput: ch('email'), placeholder: 'hej@ditdomæne.dk' }))),
        h('div', { class: 'grid3' },
          field('Sidens navn', input(d.sitenavn || 'Aktiekompas', { oninput: ch('sitenavn') })),
          field('Firmanavn', input(d.firmanavn || '', { oninput: ch('firmanavn') }), { hint: 'Fx dit ApS eller din enkeltmandsvirksomhed.' }),
          field('CVR-nummer', input(d.cvr || '', { inputmode: 'numeric', oninput: ch('cvr') }))),
        field('Adresse', input(d.adresse || '', { oninput: ch('adresse'), placeholder: 'Fx Eksempelvej 1, 2750 Ballerup' }), { wide: true, hint: 'Skal stå i handelsbetingelserne, når du sælger medlemskaber.' })),
      section('Portefølje', 'Porteføljen vist åbent på siden.',
        portfolioTypeControl(d),
        toggle('Vis porteføljen på siden', d.vis_portefolje !== false, (v) => { d.vis_portefolje = v; markDirty(); }, 'Slå fra for at fjerne porteføljesiden helt.'),
        h('div', { class: 'grid3' },
          field('Forsinkelse (dage)', input(d.portefolje_forsinkelse == null ? '30' : String(d.portefolje_forsinkelse), { inputmode: 'numeric', oninput: (e) => { const n = parseInt(e.target.value, 10); d.portefolje_forsinkelse = Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : 0; markDirty(); } }), { hint: 'Nye køb og salg vises først, når de er så gamle. Så er porteføljen gennemsigtighed – ikke handelssignaler. Anbefalet: 30.' }))),
      section('Forsiden', null,
        field('Overskrift', input(d.hero_titel || '', { oninput: ch('hero_titel') }), { wide: true }),
        field('Tekst under overskriften', textarea(d.hero_tekst || '', { rows: 3, oninput: ch('hero_tekst') }), { wide: true }),
        h('div', { class: 'f' }, h('span', { class: 'flabel', text: 'Hovedmarked' }),
          segmented([['us', 'USA'], ['dk', 'Danmark']], d.forside_marked === 'dk' ? 'dk' : 'us', (v) => { d.forside_marked = v; markDirty(); }),
          h('p', { class: 'f__hint', text: 'Bestemmer, hvilke aktier markedskompasset og heatmappet på forsiden viser, og hvilket marked der står først på markedssiden.' }))),
      section('Premium-analyser', 'Indtil der er medlemslogin på siden, kan du vælge, hvordan premium-analyser vises.',
        segmented([['teaser', 'Vis intro og første afsnit (resten låst)'], ['fuld', 'Vis hele analysen for alle']], d.premium_visning || 'teaser', (v) => { d.premium_visning = v; markDirty(); })));
  }

  if (tab === 'medlemskab') {
    d.betalingslinks = d.betalingslinks || {};
    d.priser = Array.isArray(d.priser) ? d.priser : [];
    const tiers = h('div', { class: 'tiers' });
    const renderTiers = () => {
      tiers.replaceChildren(...d.priser.map((t, i) => {
        t.features = Array.isArray(t.features) ? t.features : [];
        const feats = h('ul', { class: 'feats' });
        const renderFeats = () => feats.replaceChildren(...t.features.map((f, j) => h('li', null,
          h('label', { class: 'check check--sm' }, h('input', { type: 'checkbox', checked: f.med !== false, onchange: (e) => { f.med = e.target.checked; markDirty(); } }), h('span', { class: 'sr-only', text: 'Inkluderet' })),
          h('input', { class: 'in in--sm', value: f.tekst || '', oninput: (e) => { f.tekst = e.target.value; markDirty(); }, 'aria-label': 'Punkt' }),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Fjern punkt', onclick: () => { t.features.splice(j, 1); renderFeats(); markDirty(); } }, icon('close', 16)))));
        renderFeats();
        return h('div', { class: 'tier card' },
          h('div', { class: 'tier__head' }, h('h3', { text: t.navn || `Niveau ${i + 1}` }), toggle('Fremhæv', !!t.fremhaevet, (v) => { t.fremhaevet = v; markDirty(); })),
          h('div', { class: 'grid3' },
            field('Navn', input(t.navn || '', { oninput: (e) => { t.navn = e.target.value; markDirty(); } })),
            field('Pris', input(t.pris || '', { oninput: (e) => { t.pris = e.target.value; markDirty(); }, placeholder: 'Fx 199 kr.' })),
            field('Periode', input(t.periode || '', { oninput: (e) => { t.periode = e.target.value; markDirty(); }, placeholder: 'Fx pr. måned' }))),
          field('Kort beskrivelse', input(t.beskrivelse || '', { oninput: (e) => { t.beskrivelse = e.target.value; markDirty(); } }), { wide: true }),
          h('div', { class: 'f f--wide' }, h('span', { class: 'flabel', text: 'Punkter (flueben = inkluderet)' }), feats, h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => { t.features.push({ tekst: '', med: true }); renderFeats(); markDirty(); } }, icon('plus', 16), 'Tilføj punkt')),
          h('div', { class: 'grid3' },
            field('Note under listen', input(t.note || '', { oninput: (e) => { t.note = e.target.value; markDirty(); }, placeholder: 'Fx Ingen binding' })),
            field('Tekst på knappen', input(t.knap || '', { oninput: (e) => { t.knap = e.target.value; markDirty(); } })),
            field('Betalingslink', input(d.betalingslinks[t.id] || '', { type: 'url', placeholder: 'https://buy.stripe.com/…', oninput: (e) => { d.betalingslinks[t.id] = e.target.value.trim(); markDirty(); } }), { hint: 'Fx et Stripe Payment Link. Tomt = knappen åbner en e-mail til dig.' })));
      }));
    };
    renderTiers();
    body.append(section('Medlemskaber', 'Vises på forsiden og under Medlemskab.', tiers));
  }

  if (tab === 'om') {
    const ed = mdEditor({ value: d.om_tekst || '', onInput: (v) => { d.om_tekst = v; markDirty(); }, uploadName: () => 'om', minRows: 16 });
    body.append(section('Om-siden', 'Fortæl, hvem du er, og hvorfor du laver siden. Teksten vises under "Om".', ed.el));
  }

  if (tab === 'kurser') {
    const lists = [
      ['ticker', 'Kursbjælken', 'Rullebåndet øverst på alle sider.'],
      ['us_aktier', 'Amerikanske aktier', 'Heatmap på markedssiden og dagens største bevægelser. På forsiden, når USA er hovedmarked.'],
      ['danske_aktier', 'Danske aktier', 'Heatmap på markedssiden og dagens største bevægelser. På forsiden, når Danmark er hovedmarked.'],
      ['indeks', 'Indeks', 'De tre første vises også i markedskompasset på forsiden.'],
      ['valuta_raavarer', 'Valuta og råvarer', 'Vises på markedssiden.'],
    ];
    for (const [key, title, sub] of lists) {
      d[key] = Array.isArray(d[key]) ? d[key] : [];
      const count = h('span', { class: 'muted' });
      const setCount = () => { count.textContent = `${d[key].length} ${d[key].length === 1 ? 'kurs' : 'kurser'} · ${sub}`; };
      setCount();
      body.append(h('details', { class: 'fsec fsec--fold', open: key === 'ticker' },
        h('summary', null, h('h2', { text: title }), count),
        h('div', { class: 'fsec__body' }, symbolListEditor(d[key], setCount))));
    }
  }

  const saveBtn = h('button', { type: 'button', class: 'btn btn--primary' }, 'Gem indstillinger');
  saveBtn.addEventListener('click', async () => {
    const errors = [];
    for (const [id, url] of Object.entries(d.betalingslinks || {})) {
      if (url && !/^https:\/\/\S+$/i.test(url)) errors.push(`Betalingslinket for ${(d.priser || []).find((t) => t.id === id)?.navn || id} skal starte med https://`);
    }
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.push('E-mailadressen ser forkert ud.');
    if (errors.length) return errors.forEach((e) => toast(e, 'error', 6000));
    saveBtn.disabled = true;
    try {
      const imgs = await stagedChangesFor(d.om_tekst || '');
      await saveJson('settings', d, 'Opdateret indstillinger', imgs);
      clearStaged(d.om_tekst || '');
      S.dirty = false;
      toast('Indstillingerne er gemt. Siden opdateres om ca. 1 minut.', 'success', 6000);
      viewSettings(tab);
    } catch (err) { toast(`Kunne ikke gemme: ${err.message}`, 'error', 8000); } finally { saveBtn.disabled = false; }
  });

  paint(
    pageHead('Indstillinger', 'Tekster, priser og hvilke kurser siden viser.'),
    h('nav', { class: 'tabs', 'aria-label': 'Indstillinger' }, SETTINGS_TABS.map(([k, l]) => h('a', { href: `#/indstillinger/${k}`, 'aria-current': k === tab ? 'page' : null, text: l }))),
    body,
    h('div', { class: 'savebar' }, h('span', { class: 'savebar__sp' }), saveBtn));
}

/** Valg af indholdstype med forklaring af, hvad valget betyder. */
function portfolioTypeControl(d) {
  const info = h('div', { class: 'note' });
  const describe = (v) => {
    info.className = v === 'model' ? 'note note--warn' : 'note';
    info.replaceChildren(icon(v === 'model' ? 'alert' : 'info', 18), h('p', null, v === 'model'
      ? 'Handlerne er tænkte og ikke foretaget med rigtige penge. Siden skriver det tydeligt alle steder, porteføljen nævnes. Registrér hver handel med dagens dato og kurs, og ret ikke i dem bagefter – admin advarer dig, hvis du gør.'
      : 'Porteføljen viser dine rigtige handler. Skriv kun handler, du faktisk har foretaget – ellers skal du vælge Modelportefølje.'));
  };
  const value = d.portefolje_type === 'model' ? 'model' : 'egen';
  describe(value);
  return h('div', { class: 'f f--wide' }, h('span', { class: 'flabel', text: 'Porteføljetype' }),
    segmented([['egen', 'Mine egne handler'], ['model', 'Modelportefølje (tænkte handler)']], value, (v) => { d.portefolje_type = v; describe(v); markDirty(); }),
    info);
}

function contentTypeControl(d) {
  const info = h('div', { class: 'note' });
  const describe = (v) => {
    if (v === 'anbefalinger') {
      info.className = 'note note--warn';
      info.replaceChildren(icon('alert', 18), h('p', null, 'Analyserne viser kursmål, stop og setup-retning. Så er de investeringsanbefalinger, og du skal følge reglerne for dem: navn og titel, tidspunkt, forudsætninger, kilder og egne positioner. En ansvarsfraskrivelse fritager dig ikke.'));
    } else {
      info.className = 'note';
      info.replaceChildren(icon('info', 18), h('p', null, 'Analyserne vises som undervisningscases uden kursmål, stop, setup-retning og kursudvikling siden udgivelsen. Admin advarer, hvis teksten lyder som køb eller salg. Sådan holder du siden på undervisningssiden af reglerne for investeringsanbefalinger.'));
    }
  };
  const value = d.indholdstype === 'anbefalinger' ? 'anbefalinger' : 'undervisning';
  describe(value);
  return h('div', { class: 'f f--wide' },
    segmented([['undervisning', 'Undervisning (anbefalet)'], ['anbefalinger', 'Analyser med kursmål']], value, (v) => { d.indholdstype = v; describe(v); markDirty(); }),
    info);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
}

function symbolListEditor(arr, onChange = () => {}) {
  const ul = h('ul', { class: 'symlist' });
  const render = () => { onChange(); ul.replaceChildren(...arr.map((it, i) => h('li', null,
    h('input', { class: 'in in--sm', value: it.navn || '', 'aria-label': 'Navn', oninput: (e) => { it.navn = e.target.value; markDirty(); } }),
    h('code', { text: it.symbol }),
    h('div', { class: 'symlist__btns' },
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Flyt op', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; render(); markDirty(); } }, icon('up', 16)),
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Flyt ned', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; render(); markDirty(); } }, icon('down', 16)),
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': `Fjern ${it.navn}`, onclick: () => { arr.splice(i, 1); render(); markDirty(); } }, icon('close', 16)))))); };
  render();
  const picker = stockPicker({
    placeholder: 'Tilføj: søg efter aktie, indeks eller valuta',
    onPick: (it) => {
      if (arr.some((x) => x.symbol === it.symbol)) return toast(`${it.symbol} er allerede på listen.`, 'info');
      arr.push({ symbol: it.symbol, navn: it.manual ? it.symbol : it.cleanName });
      render(); markDirty();
      picker.querySelector('input').value = '';
    },
  });
  return h('div', { class: 'symeditor' }, ul, picker);
}

/* ===================================================================== */
boot();
