// Kurser: faneblade i "Se præcis, hvad du får" og fremskridt (læste lektioner gemmes kun i browseren).
const KEY = 'ak_kurser_laest';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
function store(done) {
  try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* privat vindue – fremskridt huskes ikke */ }
}
let done = load();

function paint() {
  document.querySelectorAll('[data-lesson]').forEach((a) => a.classList.toggle('is-done', !!done[a.dataset.lesson]));
  document.querySelectorAll('[data-course-progress]').forEach((bar) => {
    const id = bar.dataset.courseProgress;
    const total = Number(bar.dataset.total) || 0;
    const n = Object.keys(done).filter((k) => k.startsWith(`${id}/`)).length;
    const pct = total ? Math.min(100, Math.round((n / total) * 100)) : 0;
    const fill = bar.querySelector('.pbar__fill');
    if (fill) fill.style.width = `${pct}%`;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(total));
    bar.setAttribute('aria-valuenow', String(Math.min(n, total)));
    const text = document.querySelector(`[data-course-progress-text="${id}"]`);
    if (text) text.textContent = n === 0 ? 'Du har ikke læst nogen lektioner endnu.' : n >= total ? `Du har læst alle ${total} lektioner.` : `${n} af ${total} lektioner læst`;
  });
  document.querySelectorAll('[data-lesson-done]').forEach((btn) => {
    const on = !!done[btn.dataset.lessonDone];
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
    const label = btn.querySelector('[data-done-label]');
    if (label) label.textContent = on ? 'Læst' : 'Markér som læst';
  });
}

function setDone(key, on) {
  if (on) done[key] = 1; else delete done[key];
  store(done);
  paint();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-lesson-done]');
  if (btn) { setDone(btn.dataset.lessonDone, !done[btn.dataset.lessonDone]); return; }
  // "Næste lektion" betyder, at den aktuelle er læst.
  const next = e.target.closest('[data-next-of]');
  if (next && document.querySelector(`[data-lesson-done="${next.dataset.nextOf}"]`)) setDone(next.dataset.nextOf, true);
});

// Faneblade: uden JavaScript vises begge kurser under hinanden.
document.querySelectorAll('[data-syl]').forEach((root) => {
  const tabs = root.querySelector('[data-syl-tabs]');
  if (!tabs) return;
  const buttons = [...tabs.querySelectorAll('[data-syl-tab]')];
  const panels = [...root.querySelectorAll('[data-syl-panel]')];
  const select = (id, focus) => {
    buttons.forEach((b) => {
      const on = b.dataset.sylTab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    panels.forEach((p) => { p.hidden = p.dataset.sylPanel !== id; });
  };
  tabs.hidden = false;
  root.classList.add('is-tabbed');
  select(buttons[0].dataset.sylTab);
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-syl-tab]'); if (b) select(b.dataset.sylTab); });
  tabs.addEventListener('keydown', (e) => {
    const i = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const j = (i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
      select(buttons[j].dataset.sylTab, true);
    }
  });
});

paint();
window.addEventListener('storage', (e) => { if (e.key === KEY) { done = load(); paint(); } });
