// Kursdata fra sitets egen API (/api/quotes og /api/chart), med deling af forespørgsler og cache i hukommelsen.
// Hvert sekund betyder noget, når mange elementer på siden beder om de samme symboler, så alt samles i én batch.

const QUOTE_TTL = 55 * 1000;
const cache = new Map(); // symbol -> { q, t }
let pending = new Set();
let waiters = [];
let timer = null;

function flush() {
  timer = null;
  const symbols = [...pending];
  const ws = waiters;
  pending = new Set();
  waiters = [];
  if (!symbols.length) { ws.forEach((w) => w.resolve()); return; }
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 40) chunks.push(symbols.slice(i, i + 40));
  Promise.all(chunks.map((c) => fetch(`/api/quotes?symbols=${encodeURIComponent(c.join(','))}`, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((j) => {
      const now = Date.now();
      for (const q of j.quotes || []) cache.set(q.symbol, { q, t: now });
    })
    .catch((err) => { console.warn('[kurser]', err.message); })))
    .then(() => ws.forEach((w) => w.resolve()));
}

/** Hent kurser for symboler. Returnerer Map(symbol -> quote). */
export function getQuotes(symbols, { force = false } = {}) {
  const now = Date.now();
  const need = symbols.filter((s) => force || !cache.has(s) || now - cache.get(s).t > QUOTE_TTL);
  const done = () => new Map(symbols.filter((s) => cache.has(s)).map((s) => [s, cache.get(s).q]));
  if (!need.length) return Promise.resolve(done());
  need.forEach((s) => pending.add(s));
  return new Promise((resolve) => {
    waiters.push({ resolve: () => resolve(done()) });
    if (!timer) timer = setTimeout(flush, 30);
  });
}

const chartCache = new Map();
/** Historik til grafer og sparklines: { points: [{t, o, h, l, c, v}], meta } */
export function getChart(symbol, range = '6mo') {
  const key = `${symbol}|${range}`;
  const hit = chartCache.get(key);
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.p;
  const p = fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch((err) => { chartCache.delete(key); throw err; });
  chartCache.set(key, { p, t: Date.now() });
  return p;
}

/* ---------- Formatering ---------- */
const nf = (min, max) => new Intl.NumberFormat('da-DK', { minimumFractionDigits: min, maximumFractionDigits: max });
const F0 = nf(0, 0), F1 = nf(1, 1), F2 = nf(2, 2), F4 = nf(4, 4);

export function fmtPrice(n, symbol = '') {
  if (n == null || !Number.isFinite(n)) return '–';
  if (/=X$/.test(symbol)) return F4.format(n);
  if (Math.abs(n) >= 10000) return F0.format(n);
  return F2.format(n);
}
export function fmtPct(n, { sign = true, digits = 2 } = {}) {
  if (n == null || !Number.isFinite(n)) return '–';
  const f = digits === 1 ? F1 : digits === 0 ? F0 : F2;
  const body = f.format(Math.abs(n));
  return `${n > 0 && sign ? '+' : n < 0 ? '−' : ''}${body} %`;
}
export function dirOf(n, eps = 0.005) {
  if (n == null || !Number.isFinite(n)) return 'flat';
  return n > eps ? 'up' : n < -eps ? 'down' : 'flat';
}

/** Sæt en .delta-pladsholder: pil + procent, farvet efter retning. */
export function setDelta(el, pct, { digits = 2 } = {}) {
  if (!el) return;
  el.classList.remove('is-loading', 'is-up', 'is-down', 'is-flat');
  if (pct == null || !Number.isFinite(pct)) { el.textContent = '–'; el.classList.add('is-flat'); return; }
  const d = dirOf(pct);
  el.classList.add(`is-${d}`);
  el.textContent = '';
  const arrow = document.createElement('span');
  arrow.className = 'delta__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = d === 'up' ? '▲' : d === 'down' ? '▼' : '■';
  el.append(arrow, document.createTextNode(fmtPct(pct, { digits })));
  el.setAttribute('aria-label', `${pct > 0 ? 'op' : pct < 0 ? 'ned' : 'uændret'} ${fmtPct(Math.abs(pct), { sign: false, digits })}`);
}

export function timeStr(sec) {
  if (!sec) return '';
  const d = new Date(sec * 1000);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });
  return sameDay ? `i dag kl. ${t}` : `${d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: 'Europe/Copenhagen' })} kl. ${t}`;
}

/* ---------- Udfyld alle [data-quote]-elementer på siden ---------- */
const lastPrice = new Map();

export function applyQuote(root, q, { flash = false } = {}) {
  if (!q) return;
  const price = root.querySelector('[data-f="price"]');
  if (price) price.textContent = fmtPrice(q.price, q.symbol);
  const chg = root.querySelectorAll('[data-f="chg"]');
  chg.forEach((el) => setDelta(el, q.changePct));
  const plain = root.querySelector('[data-f="chgplain"]');
  if (plain) plain.textContent = fmtPct(q.changePct);
  root.querySelectorAll('[data-f="since"]').forEach((el) => {
    const base = parseFloat(el.dataset.base);
    setDelta(el, Number.isFinite(base) && base > 0 ? ((q.price - base) / base) * 100 : null, { digits: 1 });
  });
  const time = root.querySelector('[data-f="time"]');
  if (time) time.textContent = timeStr(q.time);
  if (flash) {
    const prev = lastPrice.get(root);
    if (prev != null && prev !== q.price) {
      const cls = q.price > prev ? 'flash-up' : 'flash-down';
      root.classList.add(cls);
      setTimeout(() => root.classList.remove(cls), 900);
    }
  }
  lastPrice.set(root, q.price);
}

export function markLoading(scope = document) {
  scope.querySelectorAll('[data-quote] .delta[data-f]').forEach((el) => { if (!el.textContent.trim()) el.classList.add('is-loading'); });
}

export function markMissing(scope, symbols) {
  for (const s of symbols) {
    scope.querySelectorAll(`[data-quote="${CSS.escape(s)}"]`).forEach((el) => {
      el.classList.add('is-nodata');
      el.querySelectorAll('.delta.is-loading').forEach((d) => { d.classList.remove('is-loading'); d.textContent = '–'; d.classList.add('is-flat'); });
      el.querySelectorAll('[data-f="price"]').forEach((p) => { if (p.textContent.trim() === '–' || !p.textContent.trim()) p.textContent = 'Ingen data'; });
    });
  }
}

/* ---------- Sparklines ---------- */
export function drawSpark(svg, points, { base = null, prevClose = null } = {}) {
  if (!svg) return;
  const vals = points.map((p) => p.c).filter((v) => Number.isFinite(v));
  svg.textContent = '';
  if (vals.length < 2) { svg.classList.add('is-empty'); return; }
  svg.classList.remove('is-empty');
  const vb = svg.viewBox.baseVal;
  const W = vb && vb.width ? vb.width : 120, H = vb && vb.height ? vb.height : 36;
  const ref = prevClose != null ? prevClose : vals[0];
  let min = Math.min(...vals, ref), max = Math.max(...vals, ref);
  if (max - min < 1e-9) { max += 1; min -= 1; }
  const pad = 3;
  const x = (i) => (i / (vals.length - 1)) * W;
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dir = dirOf(((vals[vals.length - 1] - ref) / ref) * 100);
  const ns = 'http://www.w3.org/2000/svg';
  const baseLine = document.createElementNS(ns, 'line');
  baseLine.setAttribute('x1', 0); baseLine.setAttribute('x2', W);
  baseLine.setAttribute('y1', y(ref).toFixed(1)); baseLine.setAttribute('y2', y(ref).toFixed(1));
  baseLine.setAttribute('class', 'base');
  const area = document.createElementNS(ns, 'path');
  area.setAttribute('d', `${d} L${W},${H} L0,${H} Z`);
  area.setAttribute('class', `area ${dir}`);
  const line = document.createElementNS(ns, 'path');
  line.setAttribute('d', d);
  line.setAttribute('class', `line ${dir}`);
  svg.append(baseLine, area, line);
  svg.__vals = { vals, points, min, max, W, H };
}

/** Lille hover-aflæsning på sparklines (værdien vises også i kortet, så den er kun et supplement). */
export function enableSparkHover(svg, symbol) {
  if (!svg || svg.__hover) return;
  svg.__hover = true;
  const host = svg.parentElement;
  let pop = null;
  const show = (ev) => {
    const v = svg.__vals;
    if (!v) return;
    const r = svg.getBoundingClientRect();
    const rx = Math.min(Math.max(0, (ev.clientX - r.left) / r.width), 1);
    const i = Math.round(rx * (v.vals.length - 1));
    const pt = v.points[i];
    if (!pt) return;
    if (!pop) { pop = document.createElement('div'); pop.className = 'sparkpop'; host.append(pop); }
    const hr = host.getBoundingClientRect();
    pop.style.left = `${r.left - hr.left + rx * r.width}px`;
    pop.style.top = `${r.top - hr.top + (1 - (v.vals[i] - v.min) / (v.max - v.min)) * r.height - 6}px`;
    const when = new Date(pt.t * 1000).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' });
    pop.textContent = '';
    const b = document.createElement('b');
    b.textContent = fmtPrice(v.vals[i], symbol);
    pop.append(b, document.createTextNode(`  ${when}`));
  };
  const hide = () => { if (pop) { pop.remove(); pop = null; } };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', hide);
}
