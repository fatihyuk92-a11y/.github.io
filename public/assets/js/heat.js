// Delte visninger for forsiden og markedssiden: heatmap, kompas, bredde og dagens største bevægelser.
import { fmtPrice, fmtPct, setDelta, dirOf } from './quotes.js';

/** Farvetrin for dagens ændring. Skalaen matcher legenden under kortet. */
export function heatStep(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  const a = Math.abs(pct);
  const n = a < 0.3 ? 0 : a < 1 ? 2 : a < 2 ? 3 : a < 3 ? 4 : 5;
  if (n === 0) return '0';
  return `${pct > 0 ? 'u' : 'd'}${n}`;
}

const sortedOnce = new WeakSet();
export function renderHeatmap(container, map) {
  if (!container) return;
  const tiles = [...container.querySelectorAll('.heat__tile')];
  container.classList.remove('is-loading');
  for (const t of tiles) {
    const q = map.get(t.dataset.quote);
    const step = q ? heatStep(q.changePct) : null;
    if (step) t.dataset.step = step; else delete t.dataset.step;
    t.classList.toggle('is-nodata', !q);
    if (q) t.setAttribute('aria-label', `${t.dataset.name}: ${q.changePct > 0 ? 'op' : q.changePct < 0 ? 'ned' : 'uændret'} ${fmtPct(Math.abs(q.changePct), { sign: false })}, kurs ${fmtPrice(q.price, q.symbol)}`);
  }
  // Sortér én gang efter dagens bevægelse, så kortet læses fra største stigning til største fald.
  if (!sortedOnce.has(container) && tiles.some((t) => map.has(t.dataset.quote))) {
    sortedOnce.add(container);
    const val = (t) => { const q = map.get(t.dataset.quote); return q && Number.isFinite(q.changePct) ? q.changePct : -Infinity; };
    tiles.sort((a, b) => val(b) - val(a)).forEach((t) => container.append(t));
  }
}

/** Popover med detaljer, når man peger på eller fokuserer et felt. Værdierne står også på feltet. */
export function enableHeatPopover(container, getMap) {
  if (!container) return;
  let pop = null;
  const show = (tile, x, y) => {
    const q = getMap().get(tile.dataset.quote);
    if (!q) return;
    if (!pop) { pop = document.createElement('div'); pop.className = 'heatpop'; pop.setAttribute('role', 'tooltip'); document.body.append(pop); }
    pop.textContent = '';
    const name = document.createElement('strong');
    name.textContent = tile.dataset.name;
    pop.append(name);
    const row = (k, v) => { const r = document.createElement('div'); r.className = 'row'; const s = document.createElement('span'); s.textContent = k; const b = document.createElement('b'); b.textContent = v; r.append(s, b); pop.append(r); };
    row('Kurs', `${fmtPrice(q.price, q.symbol)} ${q.currency || ''}`.trim());
    row('I dag', fmtPct(q.changePct));
    if (Number.isFinite(q.dayLow) && Number.isFinite(q.dayHigh)) row('Dagens spænd', `${fmtPrice(q.dayLow)} – ${fmtPrice(q.dayHigh)}`);
    if (Number.isFinite(q.prevClose)) row('Forrige luk', fmtPrice(q.prevClose, q.symbol));
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2));
    const top = y - h - 12 < 8 ? y + 18 : y - h - 12;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };
  const hide = () => { if (pop) { pop.remove(); pop = null; } };
  container.addEventListener('pointermove', (e) => {
    const tile = e.target.closest('.heat__tile');
    if (!tile || e.pointerType === 'touch') return hide();
    show(tile, e.clientX, e.clientY);
  });
  container.addEventListener('pointerleave', hide);
  container.addEventListener('focusin', (e) => {
    const tile = e.target.closest('.heat__tile');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    show(tile, r.left + r.width / 2, r.top);
  });
  container.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });
}

export function breadth(list, map) {
  let up = 0, down = 0, flat = 0, n = 0;
  for (const t of list) {
    const q = map.get(t.s);
    if (!q || !Number.isFinite(q.changePct)) continue;
    n += 1;
    const d = dirOf(q.changePct, 0.05);
    if (d === 'up') up += 1; else if (d === 'down') down += 1; else flat += 1;
  }
  return { up, down, flat, n };
}

export function verdict(b) {
  if (!b.n) return '';
  const score = (b.up - b.down) / b.n;
  if (score >= 0.5) return 'Bred fremgang i dag';
  if (score >= 0.15) return 'Overvejende stigende';
  if (score > -0.15) return 'Blandet billede';
  if (score > -0.5) return 'Overvejende faldende';
  return 'Bredt fald i dag';
}

/** Markedskompasset: nålen peger fra −90° (alle falder) til +90° (alle stiger). */
export function renderCompass(root, b) {
  if (!root) return;
  const needle = root.querySelector('[data-needle]');
  const vtext = root.querySelector('[data-compass-verdict]');
  const box = root.querySelector('[data-breadth]');
  if (!b.n) {
    if (vtext) vtext.textContent = 'Kurserne kan ikke hentes lige nu';
    return;
  }
  root.classList.add('is-live');
  const score = (b.up - b.down) / b.n;
  if (needle) needle.style.setProperty('--a', `${(score * 88).toFixed(1)}deg`);
  if (vtext) vtext.textContent = verdict(b);
  if (box) {
    box.hidden = false;
    const pct = (x) => `${((x / b.n) * 100).toFixed(1)}%`;
    box.querySelector('[data-b="up"]').style.width = pct(b.up);
    box.querySelector('[data-b="flat"]').style.width = pct(b.flat);
    box.querySelector('[data-b="down"]').style.width = pct(b.down);
    box.querySelector('[data-bl="up"]').textContent = b.up;
    box.querySelector('[data-bl="flat"]').textContent = b.flat;
    box.querySelector('[data-bl="down"]').textContent = b.down;
    box.setAttribute('aria-label', `${b.up} stiger, ${b.flat} uændret og ${b.down} falder af ${b.n} selskaber`);
  }
}

/** Top-lister over dagens største stigninger og fald. */
export function renderMovers(map, lists, { count = 4 } = {}) {
  const all = [];
  for (const t of lists) {
    const q = map.get(t.s);
    if (q && Number.isFinite(q.changePct)) all.push({ ...t, q });
  }
  const upEls = document.querySelectorAll('[data-movers="up"]');
  const downEls = document.querySelectorAll('[data-movers="down"]');
  if (!all.length) {
    [...upEls, ...downEls].forEach((el) => { el.innerHTML = ''; const li = document.createElement('li'); li.className = 'movers__ph'; li.textContent = 'Ingen kursdata lige nu.'; el.append(li); });
    return;
  }
  const max = Math.max(...all.map((x) => Math.abs(x.q.changePct)), 0.5);
  const ups = all.filter((x) => x.q.changePct > 0).sort((a, b) => b.q.changePct - a.q.changePct).slice(0, count);
  const downs = all.filter((x) => x.q.changePct < 0).sort((a, b) => a.q.changePct - b.q.changePct).slice(0, count);
  const fill = (els, items, dir) => els.forEach((ol) => {
    ol.textContent = '';
    if (!items.length) { const li = document.createElement('li'); li.className = 'movers__ph'; li.textContent = dir === 'up' ? 'Ingen stiger i dag.' : 'Ingen falder i dag.'; ol.append(li); return; }
    for (const x of items) {
      const li = document.createElement('li');
      li.className = 'mover';
      const name = document.createElement('span');
      name.className = 'mover__name';
      name.textContent = x.n;
      const sym = document.createElement('span');
      sym.className = 'mover__sym';
      sym.textContent = `${x.s.replace(/\.CO$/, '')}, ${fmtPrice(x.q.price, x.s)} ${x.q.currency || ''}`.trim();
      name.append(sym);
      const delta = document.createElement('span');
      delta.className = 'delta';
      setDelta(delta, x.q.changePct);
      const bar = document.createElement('span');
      bar.className = 'mover__bar';
      const b = document.createElement('span');
      b.className = dir;
      b.style.width = `${Math.max(4, (Math.abs(x.q.changePct) / max) * 100).toFixed(1)}%`;
      bar.append(b);
      li.append(name, delta, bar);
      ol.append(li);
    }
  });
  fill(upEls, ups, 'up');
  fill(downEls, downs, 'down');
}
