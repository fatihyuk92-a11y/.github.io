const { html, raw, fmtPrice, fmtPct, fmtDate } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');
const S = require('../templates/sections');

const HOME_FAQ = [
  { q: 'Er det her finansiel rådgivning?', a: '<p>Nej. Alt indhold er undervisning og udtryk for egne holdninger. Der gives ingen personlige anbefalinger, og du træffer altid selv dine beslutninger. Læs mere under <a href="/vigtigt/">Vigtigt at vide</a>.</p>' },
  { q: 'Hvem skriver analyserne?', a: '<p>Analyserne skrives af en privat investor – ikke af en AI. AI-assistenten bruges kun til at forklare begreber, og den giver aldrig køb- eller salgsanbefalinger.</p>' },
  { q: 'Kan jeg opsige mit medlemskab?', a: '<p>Ja. Plus og Premium har ingen binding, og du kan opsige fra måned til måned.</p>' },
  { q: 'Hvor kommer kurserne fra?', a: '<p>Kurserne hentes fra Yahoo Finance via sitets egen server og opdateres løbende. De kan være forsinkede op til 15 minutter og er kun til information.</p>' },
];

function featureAnalysis(a) {
  const n = a.niveauer;
  return html`<article class="feature" data-quote="${a.symbol}" data-spark="1mo">
  <a class="feature__link" href="${C.analysisUrl(a)}"><span class="sr-only">Læs analysen: ${a.aktie}: ${a.titel}</span></a>
  <div class="feature__meta">
    <span class="acard__symbol">${a.symbol.replace(/\.CO$/, '')}</span>
    <span class="feature__date">${fmtDate(a.dato)}</span>
  </div>
  <h3 class="feature__title">${a.aktie}: ${a.titel}</h3>
  <p class="feature__lede">${a.lede}</p>
  <div class="acard__chips">${C.setupChip(a.setup)}${C.typeChips(a.types)}${a.tier === 'premium' ? C.premiumChip() : ''}${a.demo ? C.demoChip() : ''}</div>
  <div class="feature__chart">
    <div class="feature__now"><span class="feature__nowlabel">Kurs nu</span><span class="feature__price" data-f="price">–</span><span class="delta" data-f="chg">&nbsp;</span></div>
    <svg class="spark spark--lg" viewBox="0 0 320 90" preserveAspectRatio="none" data-f="spark" aria-hidden="true"></svg>
    <p class="feature__sparklabel">Kursen den seneste måned</p>
  </div>
  ${n.kurs != null ? html`<dl class="levels">
    <div><dt>Kurs ved analysen</dt><dd>${fmtPrice(n.kurs)}</dd></div>
    ${a.tier === 'premium' ? html`<div><dt>Kursmål og stop</dt><dd class="levels__lock">${icon('lock', { size: 15 })}For medlemmer</dd></div>` : html`
    ${n.maal != null ? html`<div><dt>Kursmål</dt><dd>${fmtPrice(n.maal)}</dd></div>` : ''}
    ${n.stop != null ? html`<div><dt>Stop</dt><dd>${fmtPrice(n.stop)}</dd></div>` : ''}`}
    <div><dt>Siden analysen</dt><dd><span class="delta delta--lg" data-f="since" data-base="${n.kurs}">&nbsp;</span></dd></div>
  </dl>` : ''}
  <span class="feature__cta">Læs analysen ${icon('arrowRight', { size: 18 })}</span>
</article>`;
}

function latestRow(a) {
  return html`<li class="lrow"${a.symbol ? html` data-quote="${a.symbol}"` : ''}>
  <a href="${C.analysisUrl(a)}" class="lrow__link">
    <span class="lrow__top"><span class="acard__symbol">${(a.symbol || a.aktie).replace(/\.CO$/, '')}</span>${C.setupChip(a.setup)}${a.tier === 'premium' ? C.premiumChip() : ''}${a.demo ? C.demoChip() : ''}</span>
    <span class="lrow__title">${a.aktie}: ${a.titel}</span>
    <span class="lrow__lede">${a.lede}</span>
    <span class="lrow__foot"><span>${fmtDate(a.dato, { short: true })}</span>${a.niveauer.kurs != null && a.symbol ? html`<span>Siden analysen <span class="delta" data-f="since" data-base="${a.niveauer.kurs}">&nbsp;</span></span>` : ''}</span>
  </a>
</li>`;
}

function portfolioTeaser(site) {
  const open = site.portfolio.filter((p) => p.status === 'aaben');
  const visible = open.filter((p) => p.synlighed === 'offentlig').slice(0, 5);
  const hidden = open.length - visible.length;
  const hasDemo = site.portfolio.some((p) => p.demo);
  return html`<section class="band band--white" aria-labelledby="pf-title">
  <div class="wrap pfteaser">
    <div class="pfteaser__copy">
      <h2 id="pf-title">Følg porteføljen, også når det går den forkerte vej</h2>
      <p>Alle købte og solgte aktier vises med købskurs og dato, og afkastet opdateres løbende. Så kan du selv vurdere, hvordan metoden holder i praksis.</p>
      <dl class="statrow" data-pf-summary>
        <div class="stat"><dt>Åbne positioner</dt><dd>${open.length}</dd></div>
        <div class="stat"><dt>${hidden > 0 ? 'Gns. afkast, offentlige' : 'Gennemsnitligt afkast'}</dt><dd data-pf-avg>–</dd></div>
        <div class="stat"><dt>Lukkede handler</dt><dd>${site.portfolio.filter((p) => p.status === 'lukket').length}</dd></div>
      </dl>
      <a class="btn btn--secondary" href="/portefolje/">Se hele porteføljen</a>
      ${hasDemo ? html`<p class="smallnote">Porteføljen viser i øjeblikket eksempeldata.</p>` : ''}
    </div>
    <div class="pfteaser__table">
      <table class="dtable dtable--pf">
        <caption class="sr-only">Åbne positioner</caption>
        <thead><tr><th scope="col">Aktie</th><th scope="col" class="num">Købt til</th><th scope="col" class="num">Kurs nu</th><th scope="col" class="num">Afkast</th></tr></thead>
        <tbody>
          ${visible.map((p) => html`<tr data-quote="${p.symbol}" data-pf-row data-entry="${p.koebskurs}" data-weight="${p.vaegt}">
            <th scope="row"><span class="dtable__name">${p.navn}</span><span class="dtable__sym">${p.symbol.replace(/\.CO$/, '')}, ${fmtDate(p.koebsdato, { short: true })}</span></th>
            <td class="num">${fmtPrice(p.koebskurs)}</td>
            <td class="num" data-f="price">–</td>
            <td class="num"><span class="delta" data-f="since" data-base="${p.koebskurs}">&nbsp;</span></td>
          </tr>`)}
          ${hidden > 0 ? html`<tr class="dtable__locked"><td colspan="4">${icon('lock', { size: 15 })}${hidden} ${hidden === 1 ? 'position er' : 'positioner er'} kun synlige for medlemmer</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

const STEPS = [
  { t: 'Makro', d: 'Renter, valuta og sektorrotation sætter rammen. En god aktie i et dårligt marked er stadig en svær case.' },
  { t: 'Fundamental', d: 'Regnskab, pengestrømme og værdiansættelse. Jeg læser noterne – ikke kun pressemeddelelsen.' },
  { t: 'Teknisk', d: 'Trend, støtte og modstand bruges til timing. Chartet bestemmer hvornår – ikke om.' },
  { t: 'Risiko', d: 'Hver analyse har et stop og scenarier for, hvad der kan gå galt. Uden risikoramme er det bare en mening.' },
];

/** Forsidens hovedmarked (vælges i admin under Indstillinger → Generelt). */
function mainMarket(s) {
  return s.forside_marked === 'dk'
    ? { key: 'dk', list: s.danske_aktier, adj: 'danske', title: 'Danske aktier lige nu', both: 'Danske og amerikanske aktier', movers: 'Blandt danske og amerikanske storaktier' }
    : { key: 'us', list: s.us_aktier, adj: 'amerikanske', title: 'Amerikanske aktier lige nu', both: 'Amerikanske og danske aktier', movers: 'Blandt amerikanske og danske storaktier' };
}

module.exports = function homePage(site) {
  const s = site.settings;
  const mk = mainMarket(s);
  const pub = site.analyses;
  const feature = pub.find((a) => a.symbol && a.niveauer.kurs != null) || pub[0];
  const rest = pub.filter((a) => a !== feature).slice(0, 4);

  const body = html`
<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__copy">
      <h1>${s.hero_titel}</h1>
      <p class="hero__lede">${s.hero_tekst}</p>
      <div class="hero__actions">
        <a class="btn btn--primary btn--lg" href="/analyser/">Se analyserne</a>
        <a class="btn btn--secondary btn--lg" href="/ai-assistent/">${icon('sparkle', { size: 18 })}Spørg AI-assistenten</a>
      </div>
      <ul class="hero__facts">
        <li>${icon('check', { size: 18 })}Ingen binding på medlemskaber</li>
        <li>${icon('check', { size: 18 })}${mk.both}</li>
        <li>${icon('check', { size: 18 })}Porteføljen vises åbent</li>
      </ul>
    </div>
    <div class="hero__board">${S.compassCard(site, { list: mk.list, adj: mk.adj })}</div>
  </div>
</section>

<section class="band band--white" aria-labelledby="mkt-title">
  <div class="wrap">
    <div class="sechead">
      <div>
        <h2 id="mkt-title">${mk.title}</h2>
        <p>Dagens kursudvikling i ${mk.list.length} store ${mk.adj} selskaber. Grøn er stigning, rød er fald.</p>
      </div>
      <a class="textlink" href="/markedet/">Se hele markedsoverblikket ${icon('arrowRight', { size: 16 })}</a>
    </div>
    <div class="market-home">
      ${S.heatmap(mk.list, { id: 'main' })}
      <aside class="movers" aria-labelledby="movers-title">
        <h3 id="movers-title">Dagens største bevægelser</h3>
        <p class="movers__sub">${mk.movers}</p>
        <ol class="movers__list" data-movers="up"></ol>
        <ol class="movers__list" data-movers="down"></ol>
      </aside>
    </div>
  </div>
</section>

<section class="band band--paper" aria-labelledby="latest-title">
  <div class="wrap">
    <div class="sechead">
      <div>
        <h2 id="latest-title">Nyeste analyser</h2>
        <p>Hver analyse følger samme opskrift: teknisk setup, fundamental case, risiko og konkrete niveauer.</p>
      </div>
      <a class="textlink" href="/analyser/">Alle ${pub.length} analyser ${icon('arrowRight', { size: 16 })}</a>
    </div>
    ${feature ? html`<div class="latest">
      ${featureAnalysis(feature)}
      <div class="latest__side">
        ${rest.length ? html`<ol class="latest__list">${rest.map(latestRow)}</ol>` : ''}
        <a class="latest__all" href="/analyser/"><span><strong>Se hele arkivet</strong><span>Søg og filtrér i alle ${pub.length} analyser</span></span>${icon('arrowRight', { size: 20 })}</a>
      </div>
    </div>` : html`<p class="empty">Der er ingen analyser endnu. Opret den første i admin.</p>`}
  </div>
</section>

${portfolioTeaser(site)}

<section class="band band--blue" aria-labelledby="ai-title">
  <div class="wrap aiteaser">
    <div class="aiteaser__copy">
      <h2 id="ai-title">En AI-assistent, der forklarer i stedet for at anbefale</h2>
      <p>Spørg om RSI, P/E, frie pengestrømme eller hvad en rentestigning betyder for bankaktier. Assistenten forklarer begreberne og hjælper dig med at stille de rigtige spørgsmål – men den siger aldrig, hvad du skal købe.</p>
      <ul class="ticklist">
        <li>${icon('check', { size: 18 })}Forklarer nøgletal og indikatorer i et klart sprog</li>
        <li>${icon('check', { size: 18 })}Hjælper dig med at strukturere din egen research</li>
        <li>${icon('check', { size: 18 })}Giver aldrig køb- eller salgsanbefalinger</li>
      </ul>
      <a class="btn btn--primary" href="/ai-assistent/">Prøv AI-assistenten</a>
    </div>
    ${S.aiExample()}
  </div>
</section>

<section class="band band--white" aria-labelledby="method-title">
  <div class="wrap">
    <div class="sechead">
      <div>
        <h2 id="method-title">Sådan bliver en analyse til</h2>
        <p>Fire trin i samme rækkefølge hver gang, så du kan se, hvor casen er stærk, og hvor den er svag.</p>
      </div>
      <a class="textlink" href="/metode/">Læs om metoden ${icon('arrowRight', { size: 16 })}</a>
    </div>
    <ol class="steps">
      ${STEPS.map((st, i) => html`<li class="step"><span class="step__n">${i + 1}</span><h3>${st.t}</h3><p>${st.d}</p></li>`)}
    </ol>
  </div>
</section>

<section class="band band--paper" aria-labelledby="price-title">
  <div class="wrap">
    <div class="sechead sechead--center">
      <div>
        <h2 id="price-title">Vælg dit medlemskab</h2>
        <p>Start med introduktionen, eller få adgang til alle analyser med Plus og Premium. Ingen binding.</p>
      </div>
    </div>
    ${S.pricing(site)}
  </div>
</section>

<section class="band band--white" aria-labelledby="faq-title">
  <div class="wrap faqsplit">
    <div>
      <h2 id="faq-title">Spørgsmål og svar</h2>
      <p>Har du flere spørgsmål, så se <a class="textlink" href="/faq/">alle spørgsmål</a>${s.email ? html` eller skriv til <a class="textlink" href="mailto:${s.email}">${s.email}</a>` : ''}.</p>
    </div>
    ${S.faqList(HOME_FAQ)}
  </div>
</section>

<section class="band band--white band--tight">
  <div class="wrap">${C.disclaimerPanel(site)}</div>
</section>`;

  const toData = (list) => list.map((t) => ({ s: t.symbol, n: t.navn }));
  const pageData = {
    main: toData(mk.list),
    all: mk.key === 'us' ? [...toData(s.us_aktier), ...toData(s.danske_aktier)] : [...toData(s.danske_aktier), ...toData(s.us_aktier)],
  };

  return [{ path: '/', html: layout(site, { path: '/', active: 'home', body, scripts: ['home'], data: pageData, bodyClass: 'page-home' }) }];
};
