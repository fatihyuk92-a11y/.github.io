// Porteføljesiden: faneblade og nøgletal beregnet ud fra de aktuelle kurser.
import { setDelta } from './quotes.js';

/* Faneblade (piletaster skifter fane, som brugere af skærmlæsere forventer) */
const tabs = [...document.querySelectorAll('[data-tabs] [role="tab"]')];
function select(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.querySelector(`[data-panel="${t.dataset.tab}"]`).hidden = !on;
  });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    select(next);
    next.focus();
  });
});

/* Nøgletal */
document.addEventListener('ak:quotes', (e) => {
  const map = e.detail.map;
  const rows = [...document.querySelectorAll('[data-pf-row]')];
  const weighted = rows.some((r) => parseFloat(r.dataset.weight) > 0);
  let sum = 0, wsum = 0, best = null;
  for (const r of rows) {
    const q = map.get(r.dataset.quote);
    const entry = parseFloat(r.dataset.entry);
    if (!q || !(entry > 0)) continue;
    const ret = ((q.price - entry) / entry) * 100;
    const w = weighted ? parseFloat(r.dataset.weight) || 0 : 1;
    sum += ret * w;
    wsum += w;
    if (!best || ret > best.ret) best = { ret, name: r.dataset.name };
  }
  const avg = document.querySelector('[data-pf-avg]');
  if (avg) {
    avg.textContent = '';
    if (wsum) { const s = document.createElement('span'); s.className = 'delta delta--strong'; setDelta(s, sum / wsum, { digits: 1 }); avg.append(s); } else avg.textContent = '–';
  }
  const bestEl = document.querySelector('[data-pf-best]');
  const bestName = document.querySelector('[data-pf-best-name]');
  if (bestEl && best) {
    bestEl.textContent = '';
    const s = document.createElement('span');
    s.className = 'delta delta--strong';
    setDelta(s, best.ret, { digits: 1 });
    bestEl.append(s);
    if (bestName) bestName.textContent = best.name;
  }
});
