// Forsiden: markedskompas, heatmap, dagens bevægelser og porteføljens gennemsnitlige afkast.
import { renderHeatmap, enableHeatPopover, breadth, renderCompass, renderMovers } from './heat.js';
import { setDelta } from './quotes.js';

const page = JSON.parse(document.getElementById('ak-page')?.textContent || '{}');
const main = page.main || []; // forsidens hovedmarked: heatmap og kompas
const all = page.all || []; // alle storaktier til dagens største bevægelser
const heat = document.querySelector('[data-heatmap="main"]');
heat?.classList.add('is-loading');
let current = new Map();
enableHeatPopover(heat, () => current);

function portfolioAverage(map) {
  const rows = [...document.querySelectorAll('[data-pf-row]')];
  let sum = 0, wsum = 0;
  const weighted = rows.some((r) => parseFloat(r.dataset.weight) > 0);
  for (const r of rows) {
    const q = map.get(r.dataset.quote);
    const entry = parseFloat(r.dataset.entry);
    if (!q || !(entry > 0)) continue;
    const w = weighted ? parseFloat(r.dataset.weight) || 0 : 1;
    sum += ((q.price - entry) / entry) * 100 * w;
    wsum += w;
  }
  const el = document.querySelector('[data-pf-avg]');
  if (!el) return;
  if (!wsum) { el.textContent = '–'; return; }
  el.textContent = '';
  const span = document.createElement('span');
  span.className = 'delta delta--strong';
  setDelta(span, sum / wsum, { digits: 1 });
  el.append(span);
}

document.addEventListener('ak:quotes', (e) => {
  const map = e.detail.map;
  current = map;
  renderHeatmap(heat, map);
  renderCompass(document.querySelector('[data-compass]'), breadth(main, map));
  renderMovers(map, all);
  portfolioAverage(map);
});
