// Analysearkivet: søgning, filtre og sortering. Filtrene gemmes i adressen, så et filtreret link kan deles.
const form = document.querySelector('[data-filters]');
const grid = document.querySelector('[data-agrid]');
const count = document.querySelector('[data-filter-count]');
const empty = document.querySelector('[data-filter-empty]');
const cards = grid ? [...grid.querySelectorAll('.acard')] : [];
let quotes = new Map();

function state() {
  const fd = new FormData(form);
  return {
    q: String(fd.get('q') || '').trim().toLowerCase(),
    type: fd.get('type') || 'alle',
    market: fd.get('market') || 'alle',
    setup: fd.get('setup') || 'alle',
    sort: form.querySelector('[data-filter-sort]').value,
  };
}

function sinceOf(card) {
  const q = quotes.get(card.dataset.quote);
  const base = parseFloat(card.querySelector('[data-f="since"]')?.dataset.base);
  if (!q || !(base > 0)) return null;
  return ((q.price - base) / base) * 100;
}

function apply({ push = true } = {}) {
  const s = state();
  let shown = 0;
  for (const c of cards) {
    const ok = (!s.q || c.dataset.title.includes(s.q))
      && (s.type === 'alle' || c.dataset.cat.split(' ').includes(s.type))
      && (s.market === 'alle' || c.dataset.market === s.market)
      && (s.setup === 'alle' || c.dataset.setup === s.setup);
    c.hidden = !ok;
    if (ok) shown += 1;
  }
  const sorted = [...cards].sort((a, b) => {
    if (s.sort === 'aeldste') return a.dataset.date.localeCompare(b.dataset.date);
    if (s.sort === 'bevaegelse') {
      const x = sinceOf(a), y = sinceOf(b);
      return (y == null ? -Infinity : Math.abs(y)) - (x == null ? -Infinity : Math.abs(x));
    }
    return b.dataset.date.localeCompare(a.dataset.date);
  });
  sorted.forEach((c) => grid.append(c));
  count.textContent = `Viser ${shown} af ${cards.length} ${cards.length === 1 ? count.dataset.one || 'analyse' : count.dataset.many || 'analyser'}`;
  empty.hidden = shown > 0;
  if (push) {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    for (const k of ['type', 'market', 'setup']) if (s[k] !== 'alle') p.set(k, s[k]);
    if (s.sort !== 'nyeste') p.set('sort', s.sort);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }
}

if (form && grid) {
  // Gendan filtre fra adressen
  const p = new URLSearchParams(location.search);
  if (p.get('q')) form.querySelector('[data-filter-q]').value = p.get('q');
  for (const k of ['type', 'market', 'setup']) {
    const v = p.get(k);
    const input = v && form.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]`);
    if (input) input.checked = true;
  }
  if (p.get('sort')) form.querySelector('[data-filter-sort]').value = p.get('sort');

  form.addEventListener('input', () => apply());
  form.addEventListener('change', () => apply());
  apply({ push: false });

  document.addEventListener('ak:quotes', (e) => {
    quotes = e.detail.map;
    if (state().sort === 'bevaegelse') apply({ push: false });
  });
}
