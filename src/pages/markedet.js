const { html } = require('../lib/util');
const { layout } = require('../templates/layout');
const C = require('../templates/components');
const S = require('../templates/sections');

/** Et marked som heatmap med tabelvisning (tabellen er den tilgængelige udgave af kortet). */
function marketSection(id, title, list, adj) {
  return html`<section class="mkt-sec" aria-labelledby="${id}-title">
      <div class="mkt-head">
        <div>
          <h2 id="${id}-title" class="mkt-h2">${title}</h2>
          <p class="mkt-sub" data-breadth-text="${id}">Dagens kursudvikling i ${list.length} store ${adj} selskaber. Feltet er sorteret efter dagens bevægelse.</p>
        </div>
        <div class="seg seg--sm" role="group" aria-label="Visning af ${title.toLowerCase()}" data-view-toggle="${id}">
          <button type="button" class="seg__btn" data-view="map" aria-pressed="true">Kort</button>
          <button type="button" class="seg__btn" data-view="table" aria-pressed="false">Tabel</button>
        </div>
      </div>
      ${S.heatmap(list, { id, withTable: true })}
    </section>`;
}

module.exports = function markedetPage(site) {
  const s = site.settings;
  const usFirst = s.forside_marked !== 'dk';
  const us = marketSection('us', 'Amerikanske storaktier', s.us_aktier, 'amerikanske');
  const dk = marketSection('dk', 'Danske storaktier', s.danske_aktier, 'danske');
  const n = s.indeks.length;
  const idxGrid = n % 3 === 0 ? 'qgrid--3' : n % 4 === 0 ? 'qgrid--4' : 'qgrid--5';

  const body = html`
${C.pageHead({
    title: 'Markedet i dag',
    intro: `Indeks, ${usFirst ? 'amerikanske og danske' : 'danske og amerikanske'} storaktier, valuta og råvarer – samlet på én side og opdateret automatisk hvert minut.`,
    actions: html`<div class="mkt-status"><span class="livedot" aria-hidden="true"></span><span data-updated-long>Henter kurser …</span><span data-market-line class="mkt-status__line"></span></div>`,
  })}
<section class="band band--paper band--flush">
  <div class="wrap">
    <section class="mkt-sec" aria-labelledby="idx-title">
      <h2 id="idx-title" class="mkt-h2">Indeks</h2>
      <div class="qgrid ${idxGrid}">${s.indeks.map((t) => S.quoteTile(t))}</div>
    </section>

    ${usFirst ? us : dk}

    <div class="mkt-two">
      <section class="mkt-sec" aria-labelledby="movers-title">
        <h2 id="movers-title" class="mkt-h2">Dagens største bevægelser</h2>
        <p class="mkt-sub">${usFirst ? 'Amerikanske og danske' : 'Danske og amerikanske'} storaktier</p>
        <div class="movers movers--wide">
          <div><h3>Største stigninger</h3><ol class="movers__list" data-movers="up"></ol></div>
          <div><h3>Største fald</h3><ol class="movers__list" data-movers="down"></ol></div>
        </div>
      </section>
      <section class="mkt-sec" aria-labelledby="fx-title">
        <h2 id="fx-title" class="mkt-h2">Valuta og råvarer</h2>
        <p class="mkt-sub">Valuta i danske kroner, råvarer i dollar</p>
        <div class="qgrid qgrid--2">${s.valuta_raavarer.map((t) => S.quoteTile(t))}</div>
      </section>
    </div>

    ${usFirst ? dk : us}

    <p class="smallnote">Kursdata hentes fra Yahoo Finance via sitets egen server. Amerikanske aktier er i dollar, danske i kroner. Kurserne kan være forsinkede op til 15 minutter og er kun til information.</p>
  </div>
</section>
<section class="band band--white band--tight">
  <div class="wrap">${C.disclaimerPanel(site)}</div>
</section>`;

  const toData = (list) => list.map((t) => ({ s: t.symbol, n: t.navn }));
  const pageData = {
    lists: { us: toData(s.us_aktier), dk: toData(s.danske_aktier) },
    all: usFirst ? [...toData(s.us_aktier), ...toData(s.danske_aktier)] : [...toData(s.danske_aktier), ...toData(s.us_aktier)],
  };
  return [{ path: '/markedet/', html: layout(site, { title: 'Markedet i dag', path: '/markedet/', active: 'markedet', body, scripts: ['market'], data: pageData, description: 'Live overblik over amerikanske og danske storaktier, indeks, valuta og råvarer.' }) }];
};
