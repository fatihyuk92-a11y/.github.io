const { html, raw, fmtPrice, fmtPct, fmtDate, initials } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');

const RANGES = [['1mo', '1M'], ['3mo', '3M'], ['6mo', '6M'], ['1y', '1 år'], ['5y', '5 år']];

function fmtRR(rr) {
  if (rr == null) return '–';
  return `${rr.toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} : 1`;
}

function livePanel(a, locked) {
  const n = a.niveauer;
  const levels = locked ? null : { kurs: n.kurs, maal: n.maal, stop: n.stop };
  return html`<section class="livepanel" data-quote="${a.symbol}" aria-label="Live kurs og graf for ${a.aktie}">
  <div class="livepanel__strip">
    <div class="lp"><span class="lp__label">Kurs nu</span><span class="lp__big"><span data-f="price">–</span> <span class="lp__cur">${a.valuta}</span></span></div>
    <div class="lp"><span class="lp__label">I dag</span><span class="delta delta--lg" data-f="chg">&nbsp;</span></div>
    ${n.kurs != null ? html`<div class="lp"><span class="lp__label">Siden analysen</span><span class="delta delta--lg" data-f="since" data-base="${n.kurs}">&nbsp;</span></div>` : ''}
    <div class="lp lp--time"><span class="lp__label">Senest handlet</span><span class="lp__time" data-f="time">–</span></div>
  </div>
  ${n.kurs != null && !locked && (n.maal != null || n.stop != null) ? html`<div class="levelbar" data-levelbar data-entry="${n.kurs}" data-target="${n.maal == null ? '' : n.maal}" data-stop="${n.stop == null ? '' : n.stop}" data-setup="${a.setup}">
    <div class="levelbar__track" data-lb-track></div>
    <p class="levelbar__caption">Hvor kursen ligger i forhold til analysens niveauer</p>
  </div>` : ''}
  ${locked ? html`<p class="lockline">${icon('lock', { size: 16 })}Kursmål og stop i denne analyse er for medlemmer.</p>` : ''}
  <div class="chartbox">
    <div class="chartbox__bar">
      <div class="chartbox__legend" data-chart-legend aria-live="off">&nbsp;</div>
      <div class="seg seg--sm" role="group" aria-label="Periode" data-chart-range>
        ${RANGES.map(([v, l]) => html`<button type="button" class="seg__btn" data-range="${v}"${v === '6mo' ? raw(' aria-pressed="true"') : raw(' aria-pressed="false"')}>${l}</button>`)}
      </div>
    </div>
    <div class="chartbox__canvas" data-chart data-symbol="${a.symbol}" data-tv="${a.tv}" data-date="${a.dato}"${levels ? html` data-levels='${raw(JSON.stringify(levels))}'` : ''}>
      <p class="chartbox__loading">Indlæser graf …</p>
    </div>
  </div>
</section>`;
}

function keyLevels(a, locked) {
  const n = a.niveauer;
  if (n.kurs == null && n.maal == null && n.stop == null) return '';
  return html`<div class="keylevels">
  <h2 class="keylevels__title">Analysens niveauer</h2>
  <dl>
    <div><dt>Kurs ved analysen</dt><dd>${fmtPrice(n.kurs)} <small>${a.valuta}</small></dd></div>
    ${locked ? html`<div class="keylevels__lock"><dt>Kursmål, stop og risk/reward</dt><dd>${icon('lock', { size: 15 })}For medlemmer</dd></div>` : html`
    <div><dt>Kursmål</dt><dd class="up">${fmtPrice(n.maal)}</dd></div>
    <div><dt>Stop</dt><dd class="down">${fmtPrice(n.stop)}</dd></div>
    <div><dt>Risk/reward</dt><dd>${fmtRR(n.rr)}</dd></div>`}
  </dl>
  ${!locked && (n.maal != null || n.stop != null) ? html`<p class="keylevels__note">Kursmål og stop er prognoser – forfatterens skøn på udgivelsestidspunktet, ikke garantier.${a.forudsaetninger ? html` <strong>Forudsætninger:</strong> <span class="keylevels__ass">${a.forudsaetninger}</span>` : ''}</p>` : ''}
</div>`;
}

/** Oplysninger, som Finanstilsynet kræver ved investeringsanbefalinger: afsender, tidspunkt, interesser og kilder. */
function disclosure(site, a, author, when) {
  const s = site.settings;
  const pos = a.position.tekst || (a.position.ejer ? `Udgiveren ejer aktier i ${a.aktie} på publikationstidspunktet.` : `Udgiveren har ingen position i ${a.aktie} på publikationstidspunktet.`);
  return html`<section class="disclosure" aria-labelledby="disc-title">
  <div class="disclosure__icon">${icon('info', { size: 20 })}</div>
  <div>
    <h2 id="disc-title">Oplysninger om analysen</h2>
    <dl class="disclosure__list">
      <div><dt>Udarbejdet af</dt><dd>${author}${s.forfatter_titel ? `, ${s.forfatter_titel}` : ''}</dd></div>
      <div><dt>Færdiggjort</dt><dd>${when}</dd></div>
      <div><dt>Forfatterens position</dt><dd>${pos}</dd></div>
      <div><dt>Forelagt selskabet</dt><dd>${a.forelagt ? 'Ja, analysen er forelagt selskabet før udgivelsen.' : 'Nej, analysen er ikke forelagt selskabet før udgivelsen.'}</dd></div>
      ${a.kilder.length ? html`<div><dt>Kilder</dt><dd><ul class="disclosure__src">${a.kilder.map((k) => html`<li>${/^https?:\/\/\S+$/.test(k) ? html`<a href="${k}" target="_blank" rel="noopener nofollow">${k.replace(/^https?:\/\/(www\.)?/, '')}</a>` : k}</li>`)}</ul></dd></div>` : ''}
    </dl>
  </div>
</section>`;
}

function aside(site, a, locked) {
  const f = a.fakta;
  const rows = [
    ['Symbol', a.symbol], ['Sektor', a.sektor], ['Markedsværdi', f.market_cap], ['P/E', f.pe], ['EV/EBITDA', f.ev_ebitda], ['Udbytte', f.udbytte], ['52 ugers høj', f.h52], ['52 ugers lav', f.l52],
  ].filter(([, v]) => v);
  return html`<aside class="article__aside">
  ${rows.length ? html`<div class="asidebox">
    <h2>Fakta</h2>
    <dl class="facts">${rows.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
  </div>` : ''}
  ${!locked && a.headings.length > 1 ? html`<nav class="asidebox toc" aria-label="Indhold">
    <h2>Indhold</h2>
    <ol>${a.headings.map((h) => html`<li><a href="#${h.id}">${h.text}</a></li>`)}</ol>
  </nav>` : ''}
  <div class="asidebox asidebox--cta">
    <h2>Få alle analyser</h2>
    <p>Med et medlemskab får du hele arkivet, nye analyser og adgang til porteføljen.</p>
    <a class="btn btn--primary btn--block" href="/medlemskab/">Se medlemskaber</a>
  </div>
</aside>`;
}

function shareBar(site, a, url) {
  const text = `${a.aktie}: ${a.titel}`;
  return html`<div class="share" data-share data-url="${url}" data-title="${text}">
  <button type="button" class="iconbtn" data-share-copy aria-label="Kopiér link">${icon('link', { size: 18 })}</button>
  <a class="iconbtn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener" aria-label="Del på LinkedIn">${icon('linkedin', { size: 18 })}</a>
  <a class="iconbtn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener" aria-label="Del på X">${icon('x', { size: 18 })}</a>
  <a class="iconbtn" href="mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}" aria-label="Del via e-mail">${icon('mail', { size: 18 })}</a>
  <span class="share__done" data-share-done hidden>Link kopieret</span>
</div>`;
}

function analysePage(site, a) {
  const s = site.settings;
  const locked = a.tier === 'premium' && s.premium_visning === 'teaser';
  const path = `/analyser/${a.slug}/`;
  const url = (site.siteUrl || '') + path;
  const author = s.forfatter || s.sitenavn;
  const when = `${fmtDate(a.dato)}${a.tid ? ` kl. ${a.tid.replace(':', '.')}` : ''}`;
  const related = site.analyses.filter((x) => x !== a).sort((x, y) => (x.marked === a.marked ? -1 : 0) - (y.marked === a.marked ? -1 : 0)).slice(0, 3);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: `${a.aktie}: ${a.titel}`, description: a.lede,
    datePublished: a.tid ? `${a.dato}T${a.tid}` : a.dato, author: { '@type': s.forfatter && s.forfatter !== s.sitenavn ? 'Person' : 'Organization', name: author }, inLanguage: 'da-DK',
  };

  const body = html`
<article class="article">
  <header class="article__head">
    <div class="wrap">
      <nav class="crumbs" aria-label="Brødkrummer"><a href="/analyser/">Analyser</a>${icon('chevronRight', { size: 14 })}<span>${a.aktie}</span></nav>
      <div class="acard__chips">${C.setupChip(a.setup)}${C.typeChips(a.types)}${a.sektor ? html`<span class="chip">${a.sektor}</span>` : ''}${a.tier === 'premium' ? C.premiumChip() : ''}${a.demo ? C.demoChip() : ''}</div>
      <h1>${a.aktie}: ${a.titel}</h1>
      <p class="article__lede">${a.lede}</p>
      <div class="byline">
        <span class="avatar" aria-hidden="true">${initials(author)}</span>
        <span class="byline__who"><strong>${author}${s.forfatter_titel ? html`<span class="byline__title">, ${s.forfatter_titel}</span>` : ''}</strong><span>${when} · ${a.laesetid} min. læsning</span></span>
        ${shareBar(site, a, url)}
      </div>
      ${a.demo ? html`<p class="demonote">${icon('info', { size: 16 })}Dette er en eksempelanalyse, der viser sidens opbygning. Tal og positioner er ikke rigtige.</p>` : ''}
    </div>
  </header>

  ${a.symbol ? html`<div class="wrap">${livePanel(a, locked)}</div>` : ''}

  <div class="wrap article__grid">
    <div class="article__main">
      ${keyLevels(a, locked)}
      <div class="prose">
        ${raw(locked ? a.teaserHtml : a.html)}
      </div>
      ${locked ? html`<div class="paywall">
        <div class="paywall__icon">${icon('lock', { size: 22 })}</div>
        <h2>Resten af analysen er for medlemmer</h2>
        <p>Få hele gennemgangen med scenarier, risici, kursmål og stop – og adgang til alle tidligere analyser.</p>
        <a class="btn btn--primary" href="/medlemskab/">Se medlemskaber</a>
      </div>` : ''}
      ${disclosure(site, a, author, when)}
      <p class="article__disc"><strong>Husk:</strong> Analysen er udelukkende til undervisning. ${s.sitenavn} udbyder ikke rådgivning eller anbefalinger. Foretag altid dine egne beslutninger, inden du handler. Historiske afkast er ingen garanti for fremtidige afkast.</p>
    </div>
    ${aside(site, a, locked)}
  </div>
</article>

${related.length ? html`<section class="band band--paper" aria-labelledby="related-title">
  <div class="wrap">
    <div class="sechead"><div><h2 id="related-title">Læs også</h2></div><a class="textlink" href="/analyser/">Alle analyser ${icon('arrowRight', { size: 16 })}</a></div>
    <div class="agrid agrid--3">${related.map((r) => C.analysisCard(r, { compact: true }))}</div>
  </div>
</section>` : ''}
<script type="application/ld+json">${raw(JSON.stringify(ld).replace(/</g, '\\u003c'))}</script>`;

  return {
    path,
    html: layout(site, { title: `${a.aktie}: ${a.titel}`, description: a.lede, path, active: 'analyser', body, scripts: ['analysis'], ogType: 'article', bodyClass: 'page-article' }),
  };
}

module.exports = function analysePages(site) {
  return site.analyses.map((a) => analysePage(site, a));
};
