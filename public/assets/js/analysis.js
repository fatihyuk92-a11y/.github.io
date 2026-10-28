// Analysesiden: interaktiv kursgraf med analysens niveauer, niveau-måler, indholdsfortegnelse og deling.
import { getChart, fmtPrice, fmtPct, dirOf } from './quotes.js';

const LWC_FILE = '{{LWC_FILE}}';
const COLORS = { up: '#0f825e', down: '#df2414', flat: '#5f6b84', blue: '#1f4fff', ink: '#0a1a3f', grid: '#eef2f7', text: '#5f6b84' };

function loadLwc() {
  if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LWC_FILE;
    s.onload = () => (window.LightweightCharts ? resolve(window.LightweightCharts) : reject(new Error('graf-bibliotek mangler')));
    s.onerror = () => reject(new Error('graf-bibliotek kunne ikke hentes'));
    document.head.append(s);
  });
}

const fmtDay = (sec) => new Date(sec * 1000).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* ---------- Graf ---------- */
const host = document.querySelector('[data-chart]');
if (host) initChart(host);

async function initChart(el) {
  const symbol = el.dataset.symbol;
  const tv = el.dataset.tv;
  const pubDate = el.dataset.date;
  const levels = el.dataset.levels ? JSON.parse(el.dataset.levels) : null;
  const legend = document.querySelector('[data-chart-legend]');
  const rangeGroup = document.querySelector('[data-chart-range]');
  let LWC, chart, series, markers, priceLines = [];
  let range = '6mo';
  let first = null;

  const fallback = () => {
    rangeGroup?.setAttribute('hidden', '');
    if (legend) legend.textContent = 'Grafen vises via TradingView, fordi kursdata ikke kunne hentes direkte.';
    if (!tv) { el.innerHTML = '<p class="chartbox__loading">Grafen kan ikke vises lige nu.</p>'; return; }
    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.height = '100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.async = true;
    s.textContent = JSON.stringify({ autosize: true, symbol: tv, interval: 'D', timezone: 'Europe/Copenhagen', theme: 'light', style: '3', locale: 'en', hide_side_toolbar: true, hide_top_toolbar: false, allow_symbol_change: false, save_image: false, calendar: false, support_host: 'https://www.tradingview.com' });
    wrap.append(inner, s);
    el.replaceChildren(wrap);
  };

  const showLegend = (point) => {
    if (!legend || !point) return;
    legend.textContent = '';
    const b = document.createElement('b');
    b.textContent = fmtDay(point.time);
    const price = document.createElement('span');
    price.className = 'k';
    price.textContent = fmtPrice(point.value, symbol);
    legend.append(b, price);
    if (first) {
      const chg = ((point.value - first.value) / first.value) * 100;
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = `${fmtPct(chg, { digits: 1 })} i perioden`;
      legend.append(k);
    }
  };

  async function load(r) {
    range = r;
    el.setAttribute('aria-busy', 'true');
    const data = await getChart(symbol, r);
    const pts = (data.points || []).filter((p) => Number.isFinite(p.c)).map((p) => ({ time: p.t, value: p.c }));
    if (pts.length < 2) throw new Error('for få datapunkter');
    first = pts[0];
    const last = pts[pts.length - 1];
    const dir = dirOf(((last.value - first.value) / first.value) * 100);
    const c = COLORS[dir];
    series.applyOptions({ lineColor: c, topColor: hexA(c, 0.16), bottomColor: hexA(c, 0), crosshairMarkerBackgroundColor: c });
    series.setData(pts);
    // Markér udgivelsesdagen, hvis den ligger i perioden
    if (pubDate) {
      const t = Date.parse(pubDate + 'T00:00:00Z') / 1000;
      const hit = pts.find((p) => p.time >= t);
      const inRange = hit && t >= first.time - 86400 * 3;
      markers.setMarkers(inRange ? [{ time: hit.time, position: 'belowBar', shape: 'arrowUp', color: COLORS.blue, text: 'Analyse' }] : []);
    }
    chart.timeScale().fitContent();
    showLegend(last);
    el.removeAttribute('aria-busy');
  }

  try {
    LWC = await loadLwc();
    el.textContent = '';
    chart = LWC.createChart(el, {
      autoSize: true,
      layout: { background: { type: LWC.ColorType.Solid, color: '#ffffff' }, textColor: COLORS.text, fontFamily: 'Geist, system-ui, sans-serif', fontSize: 12, attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: COLORS.grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.14, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: LWC.CrosshairMode.Magnet,
        vertLine: { color: '#9aa5b8', width: 1, style: LWC.LineStyle.Solid, labelBackgroundColor: COLORS.ink },
        horzLine: { color: '#9aa5b8', width: 1, style: LWC.LineStyle.Solid, labelBackgroundColor: COLORS.ink },
      },
      localization: { locale: 'da-DK', priceFormatter: (p) => fmtPrice(p, symbol) },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: false, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false, axisDoubleClickReset: true },
    });
    series = chart.addSeries(LWC.AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderColor: '#ffffff', crosshairMarkerBorderWidth: 2 });
    markers = LWC.createSeriesMarkers(series, []);
    if (levels) {
      const add = (price, color, title) => { if (Number.isFinite(price)) priceLines.push(series.createPriceLine({ price, color, lineWidth: 1, lineStyle: LWC.LineStyle.Dashed, axisLabelVisible: true, title })); };
      add(levels.maal, COLORS.up, 'Kursmål');
      add(levels.kurs, COLORS.blue, 'Analyse');
      add(levels.stop, COLORS.down, 'Stop');
      const key = document.createElement('ul');
      key.className = 'chartkey';
      key.innerHTML = '<li><i class="k-entry"></i>Kurs ved analysen</li>' + (Number.isFinite(levels.maal) ? '<li><i class="k-target"></i>Kursmål</li>' : '') + (Number.isFinite(levels.stop) ? '<li><i class="k-stop"></i>Stop</li>' : '');
      el.parentElement.append(key);
    }
    chart.subscribeCrosshairMove((param) => {
      const d = param && param.time ? param.seriesData.get(series) : null;
      showLegend(d ? { time: param.time, value: d.value } : null);
    });
    await load(range);
  } catch (err) {
    console.warn('[graf]', err.message);
    if (chart) { chart.remove(); chart = null; }
    fallback();
    return;
  }

  rangeGroup?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn || btn.dataset.range === range) return;
    rangeGroup.querySelectorAll('[data-range]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    try { await load(btn.dataset.range); } catch (err) { console.warn('[graf]', err.message); if (legend) legend.textContent = 'Perioden kunne ikke hentes. Prøv igen om lidt.'; }
  });
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ---------- Niveau-måler: hvor ligger kursen i forhold til stop, analyse og kursmål? ---------- */
const bar = document.querySelector('[data-levelbar]');
if (bar) {
  document.addEventListener('ak:quotes', (e) => {
    const q = e.detail.map.get(document.querySelector('.livepanel')?.dataset.quote);
    if (q) renderLevelbar(bar, q.price, q.symbol);
  });
}

function renderLevelbar(el, now, symbol) {
  const entry = parseFloat(el.dataset.entry);
  const target = parseFloat(el.dataset.target);
  const stop = parseFloat(el.dataset.stop);
  const vals = [entry, target, stop, now].filter(Number.isFinite);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.08 || max * 0.05;
  min -= pad; max += pad;
  const pos = (v) => ((v - min) / (max - min)) * 100;
  const track = el.querySelector('[data-lb-track]');
  track.textContent = '';

  const rail = document.createElement('div');
  rail.className = 'lb-rail';
  const zone = (a, b, cls) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    const z = document.createElement('span');
    z.className = `lb-zone ${cls}`;
    z.style.left = `${Math.min(pos(a), pos(b))}%`;
    z.style.width = `${Math.abs(pos(b) - pos(a))}%`;
    rail.append(z);
  };
  zone(entry, stop, 'lb-zone--down');
  zone(entry, target, 'lb-zone--up');
  track.append(rail);

  const marks = [
    { v: stop, cls: 'stop', label: 'Stop' },
    { v: entry, cls: 'entry', label: 'Analyse' },
    { v: target, cls: 'target', label: 'Kursmål' },
  ].filter((m) => Number.isFinite(m.v)).sort((a, b) => a.v - b.v);
  let prev = -100;
  let low = false;
  for (const m of marks) {
    const p = pos(m.v);
    const d = document.createElement('div');
    d.className = `lb-mark lb-mark--${m.cls}`;
    if (p < 10) d.classList.add('lb-mark--edge-l');
    if (p > 90) d.classList.add('lb-mark--edge-r');
    if (p - prev < 16) { d.classList.add('lb-mark--low'); low = true; }
    prev = d.classList.contains('lb-mark--low') ? -100 : p;
    d.style.left = `${p}%`;
    const i = document.createElement('i');
    const b = document.createElement('b');
    b.textContent = m.label;
    const s = document.createElement('span');
    s.textContent = fmtPrice(m.v, symbol);
    b.append(s);
    d.append(i, b);
    track.append(d);
  }
  el.classList.toggle('levelbar--tall', low);

  const nowEl = document.createElement('div');
  nowEl.className = 'lb-now';
  nowEl.style.left = `${pos(now)}%`;
  const chip = document.createElement('span');
  chip.textContent = `Nu ${fmtPrice(now, symbol)}`;
  nowEl.append(chip);
  track.append(nowEl);

  const cap = el.querySelector('.levelbar__caption');
  const bullish = Number.isFinite(target) ? target >= entry : el.dataset.setup !== 'Bearish';
  const parts = [];
  if (Number.isFinite(target)) {
    const reached = bullish ? now >= target : now <= target;
    parts.push(reached ? 'Kursmålet er nået' : `${fmtPct(Math.abs((target - now) / now) * 100, { sign: false, digits: 1 })} til kursmålet`);
  }
  if (Number.isFinite(stop)) {
    const hit = bullish ? now <= stop : now >= stop;
    parts.push(hit ? 'kursen har passeret stop-niveauet' : `${fmtPct(Math.abs((now - stop) / now) * 100, { sign: false, digits: 1 })} til stop`);
  }
  if (cap && parts.length) cap.textContent = `${parts.join(', ')}.`.replace(/^./, (c) => c.toUpperCase());
}

/* ---------- Indholdsfortegnelse: markér det afsnit, man læser ---------- */
const tocLinks = [...document.querySelectorAll('.toc a')];
if (tocLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      tocLinks.forEach((a) => a.classList.remove('is-active'));
      byId.get(e.target.id)?.classList.add('is-active');
    }
  }, { rootMargin: '-20% 0px -70% 0px' });
  document.querySelectorAll('.prose h2[id]').forEach((h) => io.observe(h));
}

/* ---------- Deling ---------- */
/** Fuld adresse til deling – falder tilbage til teksten, hvis siden ikke har en almindelig adresse. */
function absUrl(u) {
  try { return new URL(u, location.href).href; } catch { return u; }
}
const share = document.querySelector('[data-share]');
share?.querySelector('[data-share-copy]')?.addEventListener('click', async () => {
  const url = absUrl(share.dataset.url || location.pathname);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const t = document.createElement('textarea');
    t.value = url; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
  }
  const done = share.querySelector('[data-share-done]');
  done.hidden = false;
  setTimeout(() => { done.hidden = true; }, 2200);
});

// Delingslinks bygges med sidens rigtige adresse (virker også på et eget domæne).
if (share) {
  const url = encodeURIComponent(absUrl(share.dataset.url || location.pathname));
  const title = encodeURIComponent(share.dataset.title || document.title);
  share.querySelectorAll('a[href*="linkedin.com"]').forEach((a) => { a.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`; });
  share.querySelectorAll('a[href*="twitter.com"]').forEach((a) => { a.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`; });
  share.querySelectorAll('a[href^="mailto:"]').forEach((a) => { a.href = `mailto:?subject=${title}&body=${url}`; });
}
