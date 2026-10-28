const { html, raw, fmtPrice, fmtPct, fmtDate } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');

function allocation(open) {
  const total = open.reduce((s, p) => s + (p.vaegt || 0), 0);
  const useEqual = total <= 0;
  const by = new Map();
  for (const p of open) {
    const w = useEqual ? 1 : p.vaegt || 0;
    by.set(p.sektor, (by.get(p.sektor) || 0) + w);
  }
  const sum = [...by.values()].reduce((a, b) => a + b, 0) || 1;
  return { rows: [...by.entries()].map(([k, v]) => ({ k, pct: (v / sum) * 100 })).sort((a, b) => b.pct - a.pct), useEqual };
}

function marketSplit(open) {
  const total = open.reduce((s, p) => s + (p.vaegt || 1), 0) || 1;
  const dk = open.filter((p) => p.marked === 'dansk').reduce((s, p) => s + (p.vaegt || 1), 0);
  return { dk: (dk / total) * 100, intl: 100 - (dk / total) * 100 };
}

function openRow(site, p) {
  if (p.synlighed === 'medlemmer') {
    return html`<tr class="ptable__locked">
      <th scope="row"><span class="lockname">${icon('lock', { size: 15 })}Kun for medlemmer</span><span class="dtable__sym">${p.sektor}</span></th>
      <td class="hide-sm">${p.sektor}</td><td class="num">–</td><td class="num">–</td><td class="num hide-sm">–</td><td class="num">–</td><td class="num hide-sm">${p.vaegt ? fmtPct(p.vaegt, { sign: false, digits: 0 }) : '–'}</td><td class="hide-sm"></td>
    </tr>`;
  }
  const a = site.analyses.find((x) => x.slug === p.analyse);
  return html`<tr data-quote="${p.symbol}" data-pf-row data-entry="${p.koebskurs}" data-weight="${p.vaegt}" data-name="${p.navn}">
    <th scope="row"><span class="dtable__name">${p.navn}${p.demo ? html` <span class="chip chip--demo chip--xs">Eksempel</span>` : ''}</span><span class="dtable__sym">${p.symbol.replace(/\.CO$/, '')}, købt ${fmtDate(p.koebsdato, { short: true })}</span></th>
    <td class="hide-sm">${p.sektor}</td>
    <td class="num">${fmtPrice(p.koebskurs)} <small>${p.valuta}</small></td>
    <td class="num" data-f="price">–</td>
    <td class="num hide-sm"><span class="delta" data-f="chg">&nbsp;</span></td>
    <td class="num"><span class="delta delta--strong" data-f="since" data-base="${p.koebskurs}">&nbsp;</span></td>
    <td class="num hide-sm">${p.vaegt ? fmtPct(p.vaegt, { sign: false, digits: 0 }) : '–'}</td>
    <td class="hide-sm">${a ? html`<a class="textlink" href="/analyser/${a.slug}/">Analyse</a>` : ''}</td>
  </tr>
  ${p.kommentar ? html`<tr class="ptable__note" aria-hidden="false"><td colspan="8">${p.kommentar}</td></tr>` : ''}`;
}

function closedRow(site, p) {
  if (p.synlighed === 'medlemmer') {
    return html`<tr class="ptable__locked"><th scope="row"><span class="lockname">${icon('lock', { size: 15 })}Kun for medlemmer</span></th><td class="hide-sm">${p.sektor}</td><td class="num">–</td><td class="num">–</td><td class="num">–</td><td class="hide-sm">–</td></tr>`;
  }
  const r = p.salgskurs != null ? ((p.salgskurs - p.koebskurs) / p.koebskurs) * 100 : null;
  const cls = r == null ? '' : r > 0 ? 'is-up' : r < 0 ? 'is-down' : 'is-flat';
  return html`<tr>
    <th scope="row"><span class="dtable__name">${p.navn}${p.demo ? html` <span class="chip chip--demo chip--xs">Eksempel</span>` : ''}</span><span class="dtable__sym">${p.symbol.replace(/\.CO$/, '')}</span></th>
    <td class="hide-sm">${p.sektor}</td>
    <td class="num">${fmtPrice(p.koebskurs)}<small class="block">${fmtDate(p.koebsdato, { short: true })}</small></td>
    <td class="num">${fmtPrice(p.salgskurs)}<small class="block">${fmtDate(p.salgsdato, { short: true })}</small></td>
    <td class="num"><span class="delta delta--strong ${cls}">${r == null ? '–' : html`<span class="delta__arrow" aria-hidden="true">${r > 0 ? '▲' : r < 0 ? '▼' : '■'}</span>${fmtPct(r)}`}</span></td>
    <td class="hide-sm">${p.kommentar}</td>
  </tr>`;
}

module.exports = function portefoljePage(site) {
  const all = site.portfolio;
  const open = all.filter((p) => p.status === 'aaben');
  const closed = all.filter((p) => p.status === 'lukket');
  const alloc = allocation(open);
  const split = marketSplit(open);
  const closedVisible = closed.filter((p) => p.salgskurs != null);
  const wins = closedVisible.filter((p) => p.salgskurs > p.koebskurs).length;
  const realized = closedVisible.length ? closedVisible.reduce((s, p) => s + ((p.salgskurs - p.koebskurs) / p.koebskurs) * 100, 0) / closedVisible.length : null;
  const hasDemo = all.some((p) => p.demo);

  const body = html`
${C.pageHead({
    title: 'Porteføljen',
    intro: 'Min egen portefølje, vist åbent. Du kan se hvad jeg har købt, til hvilken kurs og hvordan det går – også når det går den forkerte vej.',
  })}
<section class="band band--paper band--flush">
  <div class="wrap">
    <p class="pf-disc">${icon('shield', { size: 18 })}Porteføljen vises for gennemsigtighedens skyld. Den er ikke en anbefaling om at købe eller sælge.</p>
    ${hasDemo ? html`<p class="demonote">${icon('info', { size: 16 })}Porteføljen viser i øjeblikket eksempeldata. De rigtige positioner tilføjes i admin.</p>` : ''}

    <div class="pfstats" data-pf-stats>
      <div class="stat stat--card"><span class="stat__label">Åbne positioner</span><span class="stat__value">${open.length}</span><span class="stat__sub">${open.filter((p) => p.synlighed === 'medlemmer').length ? `${open.filter((p) => p.synlighed === 'medlemmer').length} kun for medlemmer` : 'Alle vises offentligt'}</span></div>
      <div class="stat stat--card"><span class="stat__label">Gennemsnitligt afkast</span><span class="stat__value" data-pf-avg>–</span><span class="stat__sub" data-pf-avg-sub>${open.some((p) => p.synlighed === 'medlemmer') ? 'Offentlige positioner' : 'Åbne positioner'}${alloc.useEqual ? '' : ', vægtet'}</span></div>
      <div class="stat stat--card"><span class="stat__label">Bedste position</span><span class="stat__value" data-pf-best>–</span><span class="stat__sub" data-pf-best-name>&nbsp;</span></div>
      <div class="stat stat--card"><span class="stat__label">Lukkede handler</span><span class="stat__value">${closed.length}</span><span class="stat__sub">${closedVisible.length ? `${wins} af ${closedVisible.length} med gevinst, gns. ${fmtPct(realized)}` : 'Ingen lukkede handler endnu'}</span></div>
    </div>

    <div class="pfgrid">
      <div class="panel">
        <div class="tabs" role="tablist" aria-label="Positioner" data-tabs>
          <button role="tab" id="tab-open" aria-controls="panel-open" aria-selected="true" data-tab="open">Åbne <span class="tabs__n">${open.length}</span></button>
          <button role="tab" id="tab-closed" aria-controls="panel-closed" aria-selected="false" data-tab="closed" tabindex="-1">Lukkede <span class="tabs__n">${closed.length}</span></button>
        </div>
        <div role="tabpanel" id="panel-open" aria-labelledby="tab-open" data-panel="open">
          ${open.length ? html`<div class="tablewrap"><table class="dtable ptable">
            <thead><tr><th scope="col">Aktie</th><th scope="col" class="hide-sm">Sektor</th><th scope="col" class="num">Købt til</th><th scope="col" class="num">Kurs nu</th><th scope="col" class="num hide-sm">I dag</th><th scope="col" class="num">Afkast</th><th scope="col" class="num hide-sm">Vægt</th><th scope="col" class="hide-sm"><span class="sr-only">Analyse</span></th></tr></thead>
            <tbody>${open.map((p) => openRow(site, p))}</tbody>
          </table></div>` : html`<p class="empty">Der er ingen åbne positioner lige nu.</p>`}
        </div>
        <div role="tabpanel" id="panel-closed" aria-labelledby="tab-closed" data-panel="closed" hidden>
          ${closed.length ? html`<div class="tablewrap"><table class="dtable ptable">
            <thead><tr><th scope="col">Aktie</th><th scope="col" class="hide-sm">Sektor</th><th scope="col" class="num">Købt</th><th scope="col" class="num">Solgt</th><th scope="col" class="num">Afkast</th><th scope="col" class="hide-sm">Kommentar</th></tr></thead>
            <tbody>${closed.map((p) => closedRow(site, p))}</tbody>
          </table></div>` : html`<p class="empty">Der er ingen lukkede handler endnu.</p>`}
        </div>
      </div>

      <aside class="panel alloc" aria-labelledby="alloc-title">
        <h2 id="alloc-title">Fordeling på sektorer</h2>
        <p class="alloc__sub">${alloc.useEqual ? 'Åbne positioner, ligevægtet' : 'Åbne positioner, efter vægt'}</p>
        <ul class="hbars">
          ${alloc.rows.map((r) => html`<li><span class="hbars__label">${r.k}</span><span class="hbars__track"><span class="hbars__fill" style="width:${r.pct.toFixed(1)}%"></span></span><span class="hbars__val">${fmtPct(r.pct, { sign: false, digits: 0 })}</span></li>`)}
        </ul>
        <h3 class="alloc__h3">Danske og udenlandske aktier</h3>
        <div class="split" role="img" aria-label="${fmtPct(split.dk, { sign: false, digits: 0 })} danske, ${fmtPct(split.intl, { sign: false, digits: 0 })} udenlandske">
          <span class="split__a" style="width:${split.dk.toFixed(1)}%"></span><span class="split__b" style="width:${split.intl.toFixed(1)}%"></span>
        </div>
        <ul class="split__legend"><li><i class="sw sw--blue"></i>Danske ${fmtPct(split.dk, { sign: false, digits: 0 })}</li><li><i class="sw sw--sun"></i>Udenlandske ${fmtPct(split.intl, { sign: false, digits: 0 })}</li></ul>
      </aside>
    </div>

    <div class="calcnote">
      <h2>Sådan er afkastet beregnet</h2>
      <p>Afkastet er kursudviklingen fra købskurs til aktuel kurs (eller salgskurs) i aktiens egen valuta. Kurtage, skat, udbytte og valutakursændringer er ikke medregnet. Kurserne kan være forsinkede op til 15 minutter.</p>
    </div>
  </div>
</section>
<section class="band band--white band--tight">
  <div class="wrap">${C.disclaimerPanel(site)}</div>
</section>`;

  return [{ path: '/portefolje/', html: layout(site, { title: 'Porteføljen', path: '/portefolje/', active: 'portefolje', body, scripts: ['portfolio'], description: 'Følg porteføljen med købskurser, aktuelle kurser og afkast, opdateret løbende.' }) }];
};
