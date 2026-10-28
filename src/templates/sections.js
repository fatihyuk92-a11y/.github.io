// Større sektioner, der bruges flere steder: markedskompas, heatmap, priser, FAQ og AI-eksempel.
const { html, raw, fmtPrice, fmtPct } = require('../lib/util');
const { icon } = require('./icons');

/* ---------- Markedskompasset (forsidens hero) ---------- */
function compassDial() {
  const cx = 170, cy = 176, R = 146;
  const pt = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
  const ticks = [];
  for (let d = 0; d <= 180; d += 6) {
    const major = d % 30 === 0;
    const [x1, y1] = pt(d, major ? 112 : 119);
    const [x2, y2] = pt(d, 128);
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${major ? 'dial__tick dial__tick--major' : 'dial__tick'}"/>`);
  }
  return raw(`<svg class="dial" viewBox="0 0 340 204" role="img" aria-labelledby="dial-title" data-dial>
  <title id="dial-title">Markedskompas: andel af danske storaktier, der stiger i dag</title>
  <defs>
    <linearGradient id="dialTrack" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#df2414"/>
      <stop offset=".22" stop-color="#f79686"/>
      <stop offset=".5" stop-color="#e3e8f0"/>
      <stop offset=".78" stop-color="#72c9a4"/>
      <stop offset="1" stop-color="#0f825e"/>
    </linearGradient>
  </defs>
  <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" class="dial__track" stroke="url(#dialTrack)"/>
  <g>${ticks.join('')}</g>
  <text x="${cx - R + 2}" y="${cy + 24}" class="dial__label">Faldende</text>
  <text x="${cx + R - 2}" y="${cy + 24}" class="dial__label" text-anchor="end">Stigende</text>
  <text x="${cx}" y="16" class="dial__label" text-anchor="middle">Neutral</text>
  <g class="dial__needle" data-needle style="--a:-88deg">
    <path d="M ${cx} ${cy - 108} L ${cx - 9} ${cy} L ${cx} ${cy} Z" fill="#1f4fff"/>
    <path d="M ${cx} ${cy - 108} L ${cx + 9} ${cy} L ${cx} ${cy} Z" fill="#1236c4"/>
    <path d="M ${cx - 9} ${cy} L ${cx} ${cy + 20} L ${cx + 9} ${cy} Z" fill="#ffc629"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="11" class="dial__hub"/>
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0a1a3f"/>
</svg>`);
}

function compassCard(site, { list = site.settings.danske_aktier, adj = 'danske' } = {}) {
  const idx = site.settings.indeks.slice(0, 3);
  return html`<div class="dialcard" data-compass>
  <div class="dialcard__head">
    <h2>Markedskompasset</h2>
    <span class="tipwrap">
      <button class="iconbtn" type="button" aria-describedby="compass-help" aria-label="Hvad viser kompasset?">${icon('info', { size: 18 })}</button>
      <span class="tip" role="tooltip" id="compass-help">Nålen viser balancen mellem stigende og faldende aktier blandt ${list.length} store ${adj} selskaber i dag.</span>
    </span>
  </div>
  ${compassDial()}
  <p class="dialcard__verdict" data-compass-verdict aria-live="polite">Henter dagens kurser …</p>
  <div class="breadth" data-breadth hidden>
    <div class="breadth__bar"><span class="breadth__up" data-b="up"></span><span class="breadth__flat" data-b="flat"></span><span class="breadth__down" data-b="down"></span></div>
    <ul class="breadth__legend">
      <li><i class="sw sw--up"></i><span data-bl="up">0</span> stiger</li>
      <li><i class="sw sw--flat"></i><span data-bl="flat">0</span> uændret</li>
      <li><i class="sw sw--down"></i><span data-bl="down">0</span> falder</li>
    </ul>
  </div>
  <dl class="dialcard__idx">
    ${idx.map((i) => html`<div data-quote="${i.symbol}"><dt>${i.navn}</dt><dd><span class="dialcard__val" data-f="price">–</span><span class="delta" data-f="chg">&nbsp;</span></dd></div>`)}
  </dl>
  <p class="dialcard__foot"><span data-market-line>&nbsp;</span><span data-updated></span></p>
</div>`;
}

/* ---------- Heatmap over danske aktier ---------- */
function heatmap(list, { id = 'dk', withTable = false } = {}) {
  return html`<div class="heatwrap" data-heatwrap="${id}">
  <div class="heat" data-heatmap="${id}" role="list">
    ${list.map((t) => html`<div class="heat__tile" role="listitem" data-quote="${t.symbol}" data-name="${t.navn}" tabindex="0">
      <span class="heat__name">${t.navn}</span>
      <span class="heat__chg" data-f="chgplain">–</span>
      <span class="heat__price" data-f="price">&nbsp;</span>
    </div>`)}
  </div>
  <div class="scale" aria-hidden="true">
    <span>≤ −3 %</span><i class="h-d5"></i><i class="h-d4"></i><i class="h-d3"></i><i class="h-d2"></i><i class="h-0"></i><i class="h-u2"></i><i class="h-u3"></i><i class="h-u4"></i><i class="h-u5"></i><span>≥ +3 %</span>
  </div>
  ${withTable ? html`<div class="heattable" data-heattable="${id}" hidden>
    <table class="dtable">
      <thead><tr><th scope="col">Selskab</th><th scope="col" class="num">Kurs</th><th scope="col" class="num">I dag</th></tr></thead>
      <tbody>${list.map((t) => html`<tr data-quote="${t.symbol}"><th scope="row">${t.navn}<span class="dtable__sym">${t.symbol}</span></th><td class="num" data-f="price">–</td><td class="num"><span class="delta" data-f="chg">&nbsp;</span></td></tr>`)}</tbody>
    </table>
  </div>` : ''}
</div>`;
}

/* ---------- Statkort med sparkline (indeks, valuta, råvarer) ---------- */
function quoteTile(t, { spark = '1d' } = {}) {
  return html`<div class="qtile" data-quote="${t.symbol}" data-spark="${spark}">
  <div class="qtile__head"><span class="qtile__name">${t.navn}</span><span class="delta" data-f="chg">&nbsp;</span></div>
  <span class="qtile__price" data-f="price">–</span>
  <svg class="spark" viewBox="0 0 160 44" preserveAspectRatio="none" data-f="spark" aria-hidden="true"></svg>
</div>`;
}

/* ---------- Priser ---------- */
function pricing(site, { headingLevel = 3 } = {}) {
  const tiers = site.settings.priser || [];
  const links = site.settings.betalingslinks || {};
  const email = site.settings.email;
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return html`<div class="pricing">
  ${tiers.map((t) => {
    const href = links[t.id] || (email ? `mailto:${email}?subject=${encodeURIComponent('Medlemskab: ' + t.navn)}` : '/om/');
    return html`<article class="price price--${t.id}${t.fremhaevet ? ' price--featured' : ''}">
      ${t.fremhaevet ? html`<p class="price__badge">${icon('star', { size: 14 })}Anbefalet</p>` : ''}
      ${raw(`<${H} class="price__name">`)}${t.navn}${raw(`</${H}>`)}
      <p class="price__amount"><span class="price__num">${t.pris}</span><span class="price__per">${t.periode}</span></p>
      ${t.beskrivelse ? html`<p class="price__desc">${t.beskrivelse}</p>` : ''}
      <ul class="price__list">
        ${t.features.map((f) => html`<li class="${f.med ? '' : 'is-off'}">${f.med ? icon('check', { size: 18 }) : icon('close', { size: 16 })}<span>${f.tekst}${f.med ? '' : html`<span class="sr-only"> (ikke inkluderet)</span>`}</span></li>`)}
      </ul>
      ${t.note ? html`<p class="price__note">${t.note}</p>` : ''}
      <a class="btn ${t.fremhaevet ? 'btn--primary' : 'btn--secondary'} btn--block" href="${href}">${t.knap || 'Vælg ' + t.navn}</a>
    </article>`;
  })}
</div>`;
}

/* ---------- FAQ ---------- */
function faqList(items) {
  return html`<div class="faq">
  ${items.map((f, i) => html`<details class="faq__item"${i === 0 ? raw(' open') : ''}>
    <summary><span>${f.q}</span>${icon('chevronDown', { size: 20 })}</summary>
    <div class="faq__a">${raw(f.a)}</div>
  </details>`)}
</div>`;
}

/* ---------- AI-eksempel (statisk illustration) ---------- */
function aiExample() {
  return html`<figure class="aiex">
  <figcaption>Eksempel på en samtale</figcaption>
  <div class="aiex__msg aiex__msg--user">Hvad betyder det, når RSI er over 70?</div>
  <div class="aiex__msg aiex__msg--bot">
    <p>RSI måler, hvor kraftigt en aktie er steget eller faldet over de seneste 14 dage, på en skala fra 0 til 100. Over 70 kaldes ofte <strong>overkøbt</strong>: kursen er steget hurtigt, og mange tekniske investorer forventer en pause eller et tilbageslag.</p>
    <p>Det er ikke et salgssignal i sig selv. I stærke optrends kan RSI blive over 70 i lang tid. Kig derfor også på trend og volumen.</p>
    <p class="aiex__disc">Kun til undervisning – ikke rådgivning.</p>
  </div>
</figure>`;
}

module.exports = { compassCard, compassDial, heatmap, quoteTile, pricing, faqList, aiExample };
