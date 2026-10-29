const { html, raw, fmtPrice, fmtPct, fmtDate } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');

module.exports = function analyserPage(site) {
  const list = site.analyses;
  const edu = site.edu;
  const count = (fn) => list.filter(fn).length;

  const filters = [
    { group: 'type', label: 'Type', options: [['alle', 'Alle'], ['teknisk', `Teknisk (${count((a) => a.types.includes('Teknisk'))})`], ['fundamental', `Fundamental (${count((a) => a.types.includes('Fundamental'))})`], ['makro', `Makro (${count((a) => a.types.includes('Makro'))})`]] },
    { group: 'market', label: 'Marked', options: [['alle', 'Alle'], ['dansk', 'Danske'], ['internationalt', 'Internationale']] },
    ...(edu ? [] : [{ group: 'setup', label: 'Setup', options: [['alle', 'Alle'], ['bullish', 'Bullish'], ['bearish', 'Bearish'], ['neutral', 'Neutral']] }]),
  ];

  const body = html`
${C.pageHead({
    title: 'Analyser',
    intro: edu
      ? `${list.length} ${list.length === 1 ? 'undervisningscase' : 'undervisningscases'} om amerikanske og danske aktier. Hver case viser metoden i praksis – teknisk og fundamentalt – uden kursmål eller opfordringer til at handle.`
      : `${list.length} ${list.length === 1 ? 'analyse' : 'analyser'} af amerikanske og danske aktier. Kursudviklingen siden udgivelsen opdateres løbende, så du kan følge, hvordan hver case udvikler sig.`,
  })}
<section class="band band--paper band--flush">
  <div class="wrap">
    <form class="filters" data-filters role="search" onsubmit="return false">
      <label class="search">
        ${icon('search', { size: 18 })}
        <span class="sr-only">Søg i analyser</span>
        <input type="search" name="q" placeholder="Søg efter aktie eller emne" autocomplete="off" data-filter-q>
      </label>
      ${filters.map((f) => html`<fieldset class="seg" data-filter-group="${f.group}">
        <legend class="sr-only">${f.label}</legend>
        ${f.options.map(([v, l], i) => html`<label class="seg__opt"><input type="radio" name="${f.group}" value="${v}"${i === 0 ? raw(' checked') : ''}><span>${l}</span></label>`)}
      </fieldset>`)}
      <label class="selectwrap">
        <span class="sr-only">Sortér</span>
        <select data-filter-sort>
          <option value="nyeste">Nyeste først</option>
          <option value="aeldste">Ældste først</option>
          ${edu ? '' : html`<option value="bevaegelse">Største kursudvikling siden analysen</option>`}
        </select>
        ${icon('chevronDown', { size: 16 })}
      </label>
    </form>
    <p class="filters__count" data-filter-count data-one="${edu ? 'case' : 'analyse'}" data-many="${edu ? 'cases' : 'analyser'}" aria-live="polite">Viser ${list.length} ${edu ? 'cases' : 'analyser'}</p>
    <div class="agrid" data-agrid>
      ${list.map((a) => C.analysisCard(a, { edu }))}
    </div>
    <p class="empty" data-filter-empty hidden>Ingen ${edu ? 'cases' : 'analyser'} matcher dine filtre. Prøv at fjerne et filter eller søge efter noget andet.</p>
  </div>
</section>
<section class="band band--white band--tight">
  <div class="wrap">${C.disclaimerPanel(site)}</div>
</section>`;

  return [{ path: '/analyser/', html: layout(site, { title: 'Analyser', path: '/analyser/', active: 'analyser', body, scripts: ['listing'], description: edu ? 'Undervisningscases om amerikanske og danske aktier: sådan bruges teknisk og fundamental analyse i praksis – uden kursmål eller opfordringer til at handle.' : 'Tekniske og fundamentale analyser af amerikanske og danske aktier med kursudvikling siden udgivelsen.' }) }];
};
