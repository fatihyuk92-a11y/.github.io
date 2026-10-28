// Små hjælpefunktioner til byggeprocessen: HTML-escaping, skabeloner, formatering og slugs.

const RAW = Symbol('raw');

/** Markér en streng som færdig HTML, så den ikke escapes igen. */
function raw(value) {
  return { [RAW]: true, value: value == null ? '' : String(value) };
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderValue(v) {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (typeof v === 'object' && v[RAW]) return v.value;
  return esc(v);
}

/** Tagged template: alt indsat bliver escaped, medmindre det er pakket i raw() eller selv er html``. */
function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return raw(out);
}

function toString(v) {
  return renderValue(v);
}

/** Danske tal: "1.190" -> 1190, "156,80" -> 156.8, "DKK 1.450" -> 1450. */
function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null || v === '') return null;
  let s = String(v).replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(?!\d)/.test(s) && (s.match(/\./g) || []).length >= 1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const nf = (min, max) => new Intl.NumberFormat('da-DK', { minimumFractionDigits: min, maximumFractionDigits: max });
const NF0 = nf(0, 0), NF2 = nf(2, 2), NF1 = nf(1, 1);

/** Kursformat: store tal uden decimaler, ellers to decimaler. */
function fmtPrice(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 10000) return NF0.format(n);
  return NF2.format(n);
}

function fmtPct(n, { sign = true, digits = 1 } = {}) {
  if (n == null || !Number.isFinite(n)) return '–';
  const f = digits === 2 ? NF2 : digits === 0 ? NF0 : NF1;
  const s = f.format(Math.abs(n)).replace(/^-/, '');
  const prefix = n > 0 && sign ? '+' : n < 0 ? '−' : '';
  return `${prefix}${s} %`;
}

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

/** Normalisér dato (Date eller "YYYY-MM-DD") til "YYYY-MM-DD". */
function isoDate(d) {
  if (!d) return '';
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  const s = String(d).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString().slice(0, 10);
}

function fmtDate(iso, { short = false, year = true } = {}) {
  const s = isoDate(iso);
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const month = short ? MONTHS_SHORT[m - 1] : MONTHS[m - 1];
  return year ? `${d}. ${month} ${y}` : `${d}. ${month}`;
}

/** URL-venlig slug med danske bogstaver: æ->ae, ø->oe, å->aa. */
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, '-og-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Gæt TradingView-symbol ud fra et Yahoo-symbol (bruges som reserve-graf). */
function tvSymbol(yahoo) {
  const s = String(yahoo || '').trim().toUpperCase();
  if (!s) return '';
  const map = { '^OMXC25': 'OMXCOP:OMXC25', '^GSPC': 'FOREXCOM:SPXUSD', '^NDX': 'FOREXCOM:NSXUSD', '^IXIC': 'NASDAQ:IXIC', '^DJI': 'TVC:DJI', '^GDAXI': 'XETR:DAX', '^STOXX50E': 'TVC:SX5E', 'GC=F': 'TVC:GOLD', 'BZ=F': 'TVC:UKOIL', 'CL=F': 'TVC:USOIL' };
  if (map[s]) return map[s];
  const suffix = { '.CO': 'OMXCOP', '.ST': 'OMXSTO', '.OL': 'OSL', '.HE': 'OMXHEX', '.DE': 'XETR', '.L': 'LSE', '.PA': 'EURONEXT', '.AS': 'EURONEXT', '.MI': 'MIL', '.SW': 'SIX' };
  for (const [suf, ex] of Object.entries(suffix)) {
    if (s.endsWith(suf)) return `${ex}:${s.slice(0, -suf.length).replace(/-/g, '_')}`;
  }
  if (s.endsWith('=X')) return `FX_IDC:${s.slice(0, -2)}`;
  if (/-USD$/.test(s)) return `BITSTAMP:${s.replace('-', '')}`;
  if (s.startsWith('^')) return '';
  return s.replace(/-/g, '.');
}

function readTime(text) {
  const words = String(text || '').replace(/[#>*_`\-\[\]()!]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function riskReward(entry, target, stop) {
  if (![entry, target, stop].every(Number.isFinite)) return null;
  const reward = Math.abs(target - entry);
  const risk = Math.abs(entry - stop);
  if (!risk) return null;
  return reward / risk;
}

function initials(name) {
  return String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

/** Dansk genitiv: "Aktiekompas" -> "Aktiekompas'", "Kompasset" -> "Kompassets". */
function genitive(name) {
  const n = String(name || '');
  return /[sxz]$/i.test(n) ? `${n}'` : `${n}s`;
}

module.exports = { genitive, raw, esc, html, toString, parseNumber, fmtPrice, fmtPct, fmtDate, isoDate, slugify, tvSymbol, readTime, riskReward, initials, MONTHS };
