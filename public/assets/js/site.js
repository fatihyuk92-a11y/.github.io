// Fælles for alle sider: menu, børsernes åbningsstatus, kursbjælken og alle [data-quote]-felter.
// Kurser hentes samlet hvert minut, mens fanen er synlig. Sidescripts lytter på 'ak:quotes'.
import { getQuotes, applyQuote, markLoading, markMissing, getChart, drawSpark, enableSparkHover } from './quotes.js';

const config = JSON.parse(document.getElementById('ak-config')?.textContent || '{}');
const pageData = JSON.parse(document.getElementById('ak-page')?.textContent || '{}');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Menu på mobil ---------- */
const toggle = document.querySelector('[data-navtoggle]');
if (toggle) {
  const close = () => { document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('#mainnav a').forEach((a) => a.addEventListener('click', close));
}

/* ---------- Åbningstider (bruges når kursdata ikke siger andet) ---------- */
const MARKETS = {
  cph: { name: 'København', tz: 'Europe/Copenhagen', open: [9, 0], close: [17, 0], probe: '^OMXC25' },
  nyc: { name: 'New York', tz: 'America/New_York', open: [9, 30], close: [16, 0], probe: '^GSPC' },
};
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

function parts(date, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hour12: false });
  const o = Object.fromEntries(f.formatToParts(date).map((p) => [p.type, p.value]));
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
}
function dateInTz(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = parts(new Date(guess), tz);
  const off = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - guess;
  return new Date(guess - off);
}
const cphTime = (date) => date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' }).replace(':', '.');

function clockStatus(m, now = new Date()) {
  const p = parts(now, m.tz);
  const mins = p.h * 60 + p.mi;
  const o = m.open[0] * 60 + m.open[1], c = m.close[0] * 60 + m.close[1];
  const weekday = p.wd >= 1 && p.wd <= 5;
  const openToday = dateInTz(p.y, p.mo, p.d, m.open[0], m.open[1], m.tz);
  const closeToday = dateInTz(p.y, p.mo, p.d, m.close[0], m.close[1], m.tz);
  if (weekday && mins >= o && mins < c) return { open: true, text: `${m.name} er åben til kl. ${cphTime(closeToday)}` };
  if (weekday && mins < o) return { open: false, text: `${m.name} åbner kl. ${cphTime(openToday)}` };
  const nextDay = p.wd >= 5 || p.wd === 0 ? 'mandag' : 'i morgen';
  return { open: false, text: `${m.name} åbner ${nextDay} kl. ${cphTime(openToday)}` };
}

let serverOpen = {};
function renderMarketStatus() {
  const lines = [];
  const order = config.main === 'dk' ? ['cph', 'nyc'] : ['nyc', 'cph']; // hovedmarkedet først
  for (const key of order) {
    const m = MARKETS[key];
    const clock = clockStatus(m);
    let open = clock.open, text = clock.text;
    if (key in serverOpen && serverOpen[key] === false && clock.open) { open = false; text = `${m.name} har lukket i dag`; }
    lines.push(text);
    document.querySelectorAll(`[data-market="${key}"]`).forEach((el) => {
      el.classList.toggle('is-open', open);
      el.title = `${m.name}: ${open ? 'åben' : 'lukket'}`;
      el.setAttribute('aria-label', `${m.name} ${open ? 'åben' : 'lukket'}`);
    });
  }
  const line = lines.join('. ') + '.';
  document.querySelectorAll('[data-market-line]').forEach((el) => { el.textContent = line; });
}
renderMarketStatus();
setInterval(renderMarketStatus, 60 * 1000);

/* ---------- Kursbjælken ---------- */
const ticker = document.querySelector('[data-ticker]');
let tickerReady = false;
function startTicker() {
  if (!ticker || tickerReady) return;
  tickerReady = true;
  const track = ticker.querySelector('[data-ticker-track]');
  if (reduceMotion) { ticker.classList.add('is-static'); return; }
  // Dupliker indholdet, så rullebåndet kan køre i ring uden hul.
  const clone = [...track.children].map((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
  track.append(...clone);
  const w = track.scrollWidth / 2;
  ticker.style.setProperty('--ticker-dur', `${Math.max(30, Math.round(w / 45))}s`);
  ticker.classList.add('is-running');
}

/* ---------- Alle live-felter ---------- */
function collectSymbols() {
  const set = new Set();
  document.querySelectorAll('[data-quote]').forEach((el) => set.add(el.dataset.quote));
  (config.ticker || []).forEach((t) => set.add(t.s));
  for (const key of ['dk', 'us']) (pageData[key] || []).forEach((t) => set.add(t.s));
  set.add(MARKETS.cph.probe); set.add(MARKETS.nyc.probe);
  set.delete('');
  return [...set];
}

let lastUpdate = 0;
async function refresh({ force = false } = {}) {
  const symbols = collectSymbols();
  if (!symbols.length) return;
  const map = await getQuotes(symbols, { force });
  if (!map.size) {
    document.querySelectorAll('[data-updated], [data-updated-long]').forEach((el) => { el.textContent = 'Kurserne kan ikke hentes lige nu'; });
    markMissing(document, symbols);
    document.dispatchEvent(new CustomEvent('ak:quotes', { detail: { map, failed: true } }));
    return;
  }
  for (const [sym, q] of map) {
    document.querySelectorAll(`[data-quote="${CSS.escape(sym)}"]`).forEach((el) => applyQuote(el, q, { flash: el.classList.contains('tick') }));
  }
  markMissing(document, symbols.filter((s) => !map.has(s)));
  const cph = map.get(MARKETS.cph.probe), nyc = map.get(MARKETS.nyc.probe);
  serverOpen = {};
  if (cph && typeof cph.open === 'boolean') serverOpen.cph = cph.open;
  if (nyc && typeof nyc.open === 'boolean') serverOpen.nyc = nyc.open;
  renderMarketStatus();
  startTicker();
  lastUpdate = Date.now();
  const t = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' }).replace(':', '.');
  document.querySelectorAll('[data-updated]').forEach((el) => { el.textContent = `Opdateret kl. ${t}`; });
  document.querySelectorAll('[data-updated-long]').forEach((el) => { el.textContent = `Opdateret kl. ${t}, opdateres automatisk`; });
  window.__akQuotes = map;
  document.dispatchEvent(new CustomEvent('ak:quotes', { detail: { map } }));
}

markLoading();
refresh();
setInterval(() => { if (!document.hidden) refresh({ force: true }); }, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastUpdate > 60 * 1000) refresh({ force: true });
});

/* ---------- Sparklines (hentes først, når de kommer i syne) ---------- */
const sparkObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    sparkObserver.unobserve(e.target);
    loadSpark(e.target);
  }
}, { rootMargin: '200px' }) : null;

async function loadSpark(host) {
  const svg = host.querySelector('svg[data-f="spark"]');
  const symbol = host.dataset.quote;
  const range = host.dataset.spark || '1d';
  if (!svg || !symbol) return;
  try {
    const data = await getChart(symbol, range);
    drawSpark(svg, data.points || [], { prevClose: range === '1d' ? data.prevClose : null });
    enableSparkHover(svg, symbol);
  } catch {
    svg.classList.add('is-empty');
  }
}
document.querySelectorAll('[data-spark]').forEach((el) => (sparkObserver ? sparkObserver.observe(el) : loadSpark(el)));
