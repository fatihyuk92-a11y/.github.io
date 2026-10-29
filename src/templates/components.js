// Genbrugelige byggeklodser til siderne.
const { html, raw, fmtPrice, fmtPct, fmtDate } = require('../lib/util');
const { icon } = require('./icons');

const MARKET_LABEL = { dansk: 'Danske aktier', internationalt: 'Internationale aktier', makro: 'Makro' };

function setupChip(setup) {
  const cls = setup === 'Bullish' ? 'chip--up' : setup === 'Bearish' ? 'chip--down' : '';
  const label = setup === 'Bullish' ? 'Bullish' : setup === 'Bearish' ? 'Bearish' : 'Neutral';
  return html`<span class="chip ${cls}">${label}</span>`;
}

function premiumChip() {
  return html`<span class="chip chip--premium">${icon('star', { size: 13 })}Premium</span>`;
}

function demoChip() {
  return html`<span class="chip chip--demo" title="Eksempelindhold – erstattes af rigtige analyser">Eksempel</span>`;
}

function typeChips(types) {
  return types.map((t) => html`<span class="chip chip--type">${t}</span>`);
}

/** Pladsholder som opdateres live af JS (se assets/js/live.js). */
function liveDelta(field = 'chg') {
  return html`<span class="delta" data-f="${field}">&nbsp;</span>`;
}

function analysisUrl(a) {
  return `/analyser/${a.slug}/`;
}

/** Analysekort til arkivet og forsiden. */
function analysisCard(a, { compact = false, edu = false } = {}) {
  const k = edu ? null : a.niveauer.kurs; // i undervisningstilstand vises ingen kursudvikling siden udgivelsen
  return html`<article class="acard${compact ? ' acard--compact' : ''}" data-cat="${a.types.map((t) => t.toLowerCase()).join(' ')}" data-market="${a.marked}" data-setup="${a.setup.toLowerCase()}" data-date="${a.dato}" data-title="${(a.aktie + ' ' + a.titel + ' ' + a.symbol).toLowerCase()}"${a.symbol ? html` data-quote="${a.symbol}"` : ''}>
  <a class="acard__link" href="${analysisUrl(a)}"><span class="sr-only">Læs analysen: ${a.aktie}: ${a.titel}</span></a>
  <div class="acard__top">
    ${a.symbol ? html`<span class="acard__symbol">${a.symbol.replace(/\.CO$/, '')}</span>` : ''}
    ${a.symbol ? html`<span class="acard__today">I dag ${liveDelta('chg')}</span>` : ''}
  </div>
  <h3 class="acard__title"><span>${a.aktie}:</span> ${a.titel}</h3>
  ${compact ? '' : html`<p class="acard__lede">${a.lede}</p>`}
  <div class="acard__chips">${edu ? '' : setupChip(a.setup)}${typeChips(a.types)}${a.tier === 'premium' ? premiumChip() : ''}${a.demo ? demoChip() : ''}</div>
  <footer class="acard__foot">
    <span class="acard__date">${fmtDate(a.dato, { short: true })}<span aria-hidden="true">, </span>${a.laesetid} min.</span>
    ${k != null && a.symbol ? html`<span class="acard__since" title="Kursudvikling siden analysen blev udgivet">Siden analysen <span class="delta" data-f="since" data-base="${k}">&nbsp;</span></span>` : ''}
  </footer>
</article>`;
}

function pageHead({ title, intro, kicker, actions }) {
  return html`<section class="pagehead">
  <div class="wrap">
    ${kicker ? html`<p class="pagehead__kicker">${kicker}</p>` : ''}
    <h1>${title}</h1>
    ${intro ? html`<p class="pagehead__intro">${intro}</p>` : ''}
    ${actions || ''}
  </div>
</section>`;
}

function disclaimerPanel(site, { compact = false } = {}) {
  const n = site.settings.sitenavn;
  return html`<aside class="notice${compact ? ' notice--compact' : ''}" aria-label="Vigtigt at vide">
  <div class="notice__icon">${icon('shield', { size: 22 })}</div>
  <div>
    <h2 class="notice__title">Vigtigt at vide</h2>
    <p>${n} udbyder ikke rådgivning eller anbefalinger. Alle analyser er udelukkende til undervisning og tager ikke højde for din økonomi, dine mål eller din risikovillighed. Du bør aldrig handle med penge, du ikke har råd til at tabe, og historiske afkast er ikke en garanti for fremtidige afkast.</p>
    <a class="textlink" href="/vigtigt/">Læs hele ansvarsfraskrivelsen</a>
  </div>
</aside>`;
}

function sparkSvg() {
  return html`<svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true" data-f="spark"></svg>`;
}

module.exports = { setupChip, premiumChip, demoChip, typeChips, liveDelta, analysisCard, analysisUrl, pageHead, disclaimerPanel, sparkSvg, MARKET_LABEL, fmtPrice, fmtPct };
