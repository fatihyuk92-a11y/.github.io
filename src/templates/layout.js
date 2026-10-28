// Fælles sideskal: <head>, risikobjælke, header med navigation, live kursbjælke og footer.
const { html, raw, esc } = require('../lib/util');
const { icon, logoMark } = require('./icons');

const NAV = [
  { href: '/analyser/', label: 'Analyser', key: 'analyser' },
  { href: '/portefolje/', label: 'Portefølje', key: 'portefolje' },
  { href: '/markedet/', label: 'Markedet', key: 'markedet' },
  { href: '/ai-assistent/', label: 'AI-assistent', key: 'ai' },
  { href: '/metode/', label: 'Metode', key: 'metode' },
  { href: '/medlemskab/', label: 'Medlemskab', key: 'medlemskab' },
];

function head(site, { title, description, path, ogType = 'website', noindex = false }) {
  const s = site.settings;
  const fullTitle = title ? `${title} – ${s.sitenavn}` : `${s.sitenavn} – aktieanalyser, portefølje og markedsdata`;
  const canonical = site.siteUrl ? site.siteUrl + path : '';
  const desc = description || 'Tekniske og fundamentale analyser af amerikanske og danske aktier, en åben portefølje og live markedsdata. Til undervisning – ikke rådgivning.';
  const v = site.buildId;
  return html`<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
${canonical ? html`<link rel="canonical" href="${canonical}">` : ''}
${noindex ? raw('<meta name="robots" content="noindex">') : ''}
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:locale" content="da_DK">
<meta property="og:site_name" content="${s.sitenavn}">
${site.siteUrl ? html`<meta property="og:url" content="${canonical}"><meta property="og:image" content="${site.siteUrl}/assets/img/og.png">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${v}">
</head>`;
}

function riskBar() {
  return html`<div class="riskbar" role="note">
  <div class="wrap riskbar__in">
    ${icon('alert', { size: 16 })}
    <p><strong>Kun til undervisning</strong> – ikke finansiel rådgivning. Investering indebærer risiko for tab.</p>
    <a href="/vigtigt/">Læs ansvarsfraskrivelsen</a>
  </div>
</div>`;
}

function header(site, active) {
  return html`<header class="site-header" data-header>
  <div class="wrap site-header__in">
    <a class="brand" href="/" aria-label="${site.settings.sitenavn} – forside">${logoMark(30)}<span>${site.settings.sitenavn}</span></a>
    <nav class="mainnav" id="mainnav" aria-label="Hovedmenu">
      <ul>
        ${NAV.map((n) => html`<li><a href="${n.href}"${n.key === active ? raw(' aria-current="page"') : ''}>${n.label}</a></li>`)}
      </ul>
      <a class="btn btn--primary mainnav__cta" href="/medlemskab/">Bliv medlem</a>
    </nav>
    <div class="site-header__tools">
      <div class="mstatus" data-market-status aria-label="Børsernes åbningsstatus">
        ${site.settings.forside_marked === 'dk'
          ? html`<span class="mstatus__item" data-market="cph" title="Nasdaq København"><i></i>KBH</span><span class="mstatus__item" data-market="nyc" title="New York"><i></i>NY</span>`
          : html`<span class="mstatus__item" data-market="nyc" title="New York"><i></i>NY</span><span class="mstatus__item" data-market="cph" title="Nasdaq København"><i></i>KBH</span>`}
      </div>
      <a class="btn btn--primary btn--sm site-header__cta" href="/medlemskab/">Bliv medlem</a>
      <button class="navtoggle" type="button" aria-expanded="false" aria-controls="mainnav" data-navtoggle>
        <span class="sr-only">Åbn menu</span>${icon('menu', { size: 22, cls: 'navtoggle__open' })}${icon('close', { size: 22, cls: 'navtoggle__close' })}
      </button>
    </div>
  </div>
</header>`;
}

function tickerBar(site) {
  const items = site.settings.ticker;
  if (!items.length) return '';
  return html`<div class="ticker" data-ticker aria-label="Udvalgte kurser">
  <div class="ticker__viewport">
    <ul class="ticker__track" data-ticker-track>
      ${items.map((t) => html`<li class="tick" data-quote="${t.symbol}"><span class="tick__name">${t.navn}</span><span class="tick__price" data-f="price">–</span><span class="delta" data-f="chg">&nbsp;</span></li>`)}
    </ul>
  </div>
</div>`;
}

function footer(site) {
  const s = site.settings;
  const year = new Date().getFullYear();
  const company = [s.firmanavn, s.cvr ? `CVR ${s.cvr}` : ''].filter(Boolean).join(', ');
  return html`<footer class="site-footer">
  <div class="wrap">
    <div class="site-footer__grid">
      <div class="site-footer__brand">
        <a class="brand brand--light" href="/">${logoMark(30)}<span>${s.sitenavn}</span></a>
        <p>Analyser, portefølje og markedsdata for dig, der vil forstå aktiemarkedet og træffe dine egne beslutninger.</p>
        ${s.email ? html`<a class="site-footer__mail" href="mailto:${s.email}">${icon('mail', { size: 18 })}${s.email}</a>` : ''}
      </div>
      <nav aria-label="Indhold">
        <h2>Indhold</h2>
        <ul>
          <li><a href="/analyser/">Analyser</a></li>
          <li><a href="/portefolje/">Portefølje</a></li>
          <li><a href="/markedet/">Markedet</a></li>
          <li><a href="/ai-assistent/">AI-assistent</a></li>
        </ul>
      </nav>
      <nav aria-label="Om sitet">
        <h2>Om sitet</h2>
        <ul>
          <li><a href="/metode/">Metode</a></li>
          <li><a href="/om/">Om ${s.sitenavn}</a></li>
          <li><a href="/medlemskab/">Medlemskab</a></li>
          <li><a href="/faq/">Spørgsmål og svar</a></li>
        </ul>
      </nav>
      <nav aria-label="Juridisk">
        <h2>Juridisk</h2>
        <ul>
          <li><a href="/vigtigt/">Ansvarsfraskrivelse</a></li>
          <li><a href="/admin/" rel="nofollow">Admin</a></li>
        </ul>
      </nav>
    </div>
    <div class="site-footer__disclaimer">
      <h2>Ansvarsfraskrivelse</h2>
      <p>Alle analyser og oplysninger på ${s.sitenavn} er baseret på den viden, jeg har opnået på aktiemarkedet igennem de sidste mange år. ${s.sitenavn} udbyder ikke rådgivning eller anbefalinger, og alle analyser er udelukkende til undervisning. Der er altid en risiko forbundet med investering, derfor bør du ikke handle med penge, som du ikke har råd til at tabe. Brug analyserne og oplysningerne som en slags undervisningsmateriale, men foretag altid dine egne beslutninger og analyser, inden du handler. Historiske afkast er ikke en garanti for fremtidige afkast. ${s.sitenavn} fratager sig alt ansvar for analyserne. Du er velkommen til at kontakte ${s.sitenavn}, hvis du har spørgsmål vedrørende handel med aktier.</p>
    </div>
    <div class="site-footer__base">
      <p>© ${year} ${s.sitenavn}${company ? html`<span class="site-footer__company">${company}</span>` : ''}</p>
      <p class="site-footer__data">Kursdata via Yahoo Finance og kan være forsinket op til 15 minutter. Grafer: TradingView Lightweight Charts™.</p>
    </div>
  </div>
</footer>`;
}

/**
 * Hele siden. `page` = { title, description, path, active, body, scripts, data, ogType, noindex, bodyClass }
 */
function layout(site, page) {
  const config = {
    ticker: site.settings.ticker.map((t) => ({ s: t.symbol, n: t.navn, tv: t.tv })),
    main: site.settings.forside_marked,
    v: site.buildId,
  };
  const scripts = ['site', ...(page.scripts || [])];
  return html`${head(site, page)}
<body class="${page.bodyClass || ''}">
<a class="skiplink" href="#indhold">Spring til indhold</a>
${riskBar()}
${header(site, page.active)}
${tickerBar(site)}
<main id="indhold">
${page.body}
</main>
${footer(site)}
<script id="ak-config" type="application/json">${raw(JSON.stringify(config).replace(/</g, '\\u003c'))}</script>
${page.data ? html`<script id="ak-page" type="application/json">${raw(JSON.stringify(page.data).replace(/</g, '\\u003c'))}</script>` : ''}
${scripts.map((n) => html`<script type="module" src="/assets/js/${n}.js?v=${site.buildId}"></script>`)}
</body>
</html>`;
}

module.exports = { layout, NAV };
