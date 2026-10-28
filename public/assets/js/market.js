// Markedssiden: heatmaps med tabelvisning, bredde og dagens største bevægelser.
import { renderHeatmap, enableHeatPopover, breadth, verdict, renderMovers } from './heat.js';

const page = JSON.parse(document.getElementById('ak-page')?.textContent || '{}');
const lists = page.lists || {};
const all = page.all || [];
const heats = [...document.querySelectorAll('[data-heatmap]')];
heats.forEach((h) => h.classList.add('is-loading'));
let current = new Map();
heats.forEach((h) => enableHeatPopover(h, () => current));

// Skift mellem kort og tabel (tabellen er den tilgængelige udgave af heatmappet).
document.querySelectorAll('[data-view-toggle]').forEach((group) => {
  const id = group.dataset.viewToggle;
  const wrap = document.querySelector(`[data-heatwrap="${id}"]`);
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn || !wrap) return;
    group.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const table = btn.dataset.view === 'table';
    wrap.querySelector('[data-heatmap]').hidden = table;
    wrap.querySelector('.scale').hidden = table;
    wrap.querySelector('[data-heattable]').hidden = !table;
  });
});

document.addEventListener('ak:quotes', (e) => {
  const map = e.detail.map;
  current = map;
  heats.forEach((h) => renderHeatmap(h, map));
  renderMovers(map, all, { count: 5 });
  for (const [id, list] of Object.entries(lists)) {
    const b = breadth(list, map);
    const el = document.querySelector(`[data-breadth-text="${id}"]`);
    if (el && b.n) el.textContent = `${verdict(b)}: ${b.up} af ${b.n} selskaber stiger, ${b.down} falder. Feltet er sorteret efter dagens bevægelse.`;
  }
});
