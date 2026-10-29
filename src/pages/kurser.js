// Kurserne: oversigt (/kurser/), en side pr. kursus og en side pr. lektion.
// Indholdet ligger i _data/kurser/ og redigeres i admin under Kurser.
const { html, raw } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');
const S = require('../templates/sections');

/** "ca. 1 t. 40 min." eller "25 min." */
function fmtMinutes(min) {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `${m} min.`;
  const t = Math.floor(m / 60), r = m % 60;
  return r ? `${t} t. ${r} min.` : `${t} t.`;
}

function tierNames(site, ids) {
  const names = ids.map((id) => (site.settings.priser.find((t) => t.id === id) || {}).navn).filter(Boolean);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}

const lessonUrl = (c, l) => `/kurser/${c.id}/${l.slug}/`;
const isLocked = (site, l) => !l.gratis && site.settings.premium_visning !== 'fuld';
const firstFree = (c) => c.lessons.find((l) => l.gratis) || null;
const statLine = (c) => `${c.modules.length} ${c.modules.length === 1 ? 'modul' : 'moduler'} · ${c.lessons.length} ${c.lessons.length === 1 ? 'lektion' : 'lektioner'} · ca. ${fmtMinutes(c.minutes)} læsning`;

const DISC = 'Kurserne er undervisning og generel information. De tager ikke højde for din økonomi, dine mål eller din risikovillighed og er ikke personlig rådgivning eller en opfordring til at købe eller sælge bestemte værdipapirer.';

const COURSE_FAQ = (site, courses) => {
  const [a, b] = courses;
  return [
    { q: 'Hvilket kursus skal jeg vælge?', a: `<p>${a && b ? `Er du helt ny, så start med <strong>${a.kort}</strong>. Det tager dig fra depot til din første plan på kort tid. <strong>${b.kort}</strong> går hele vejen – fra privatøkonomi til regnskaber, værdiansættelse, skat og krypto.` : 'Start med det første modul, og se om formen passer dig.'}</p>` },
    { q: 'Er kurserne video?', a: '<p>Nej, kurserne er skrevet. Du kan læse dem i dit eget tempo, søge i teksten og vende tilbage til en lektion, når du skal bruge den. Hver lektion slutter med de vigtigste pointer.</p>' },
    { q: 'Kan jeg prøve, før jeg køber?', a: '<p>Ja. Første modul i hvert kursus er gratis og kræver ikke login.</p>' },
    { q: 'Hvad koster kurserne?', a: `<p>Kurserne indgår i medlemskaberne: ${courses.map((c) => `${c.kort} i ${tierNames(site, c.adgang)}`).join(', og ')}. Se priserne under <a href="/medlemskab/">Medlemskab</a>.</p>` },
    { q: 'Får jeg personlig rådgivning?', a: '<p>Nej. Kurserne lærer dig metoder og begreber, så du selv kan træffe dine beslutninger. Spørgsmål om din egen økonomi hører hjemme hos en autoriseret rådgiver.</p>' },
    { q: 'Holder I styr på mit fremskridt?', a: '<p>Din browser husker, hvilke lektioner du har markeret som læst. Det gemmes kun på din egen enhed.</p>' },
  ];
};

/* ---------- byggeklodser ---------- */
function courseCard(site, c, { headingLevel = 2 } = {}) {
  const free = firstFree(c);
  const H = headingLevel === 3 ? 'h3' : 'h2';
  return html`<article class="ccard">
  <p class="ccard__level">${icon('book', { size: 16 })}${c.niveau || 'Kursus'}</p>
  ${raw(`<${H} class="ccard__title">`)}<a href="/kurser/${c.id}/">${c.navn}</a>${raw(`</${H}>`)}
  <p class="ccard__desc">${c.beskrivelse}</p>
  <dl class="ccard__stats">
    <div><dt>Moduler</dt><dd>${c.modules.length}</dd></div>
    <div><dt>Lektioner</dt><dd>${c.lessons.length}</dd></div>
    <div><dt>Læsetid</dt><dd>ca. ${fmtMinutes(c.minutes)}</dd></div>
  </dl>
  <p class="ccard__incl">${icon('check', { size: 16 })}Indgår i ${tierNames(site, c.adgang)}</p>
  <div class="ccard__actions">
    <a class="btn btn--primary" href="/kurser/${c.id}/">Se kurset</a>
    ${free ? html`<a class="btn btn--secondary" href="${lessonUrl(c, free)}">Læs første lektion gratis</a>` : ''}
  </div>
</article>`;
}

/** "Se præcis, hvad du får": moduler og lektioner for hvert kursus med faneblade. */
function syllabus(site, courses, { id = 'syl', heading = 'Se præcis, hvad du får' } = {}) {
  if (!courses.length) return '';
  return html`<div class="syl" data-syl>
  <div class="syl__head">
    <div>
      <h2 id="${id}-title">${heading}</h2>
      <p>Alle moduler og lektioner – også dem, der ligger bag medlemskab.</p>
    </div>
    ${courses.length > 1 ? html`<div class="syl__tabs" role="tablist" aria-label="Vælg kursus" data-syl-tabs hidden>
      ${courses.map((c, i) => html`<button type="button" role="tab" id="${id}-tab-${c.id}" aria-controls="${id}-${c.id}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" data-syl-tab="${c.id}">${c.kort}</button>`)}
    </div>` : ''}
  </div>
  ${courses.map((c) => html`<section class="syl__panel" id="${id}-${c.id}" role="tabpanel" aria-labelledby="${id}-tab-${c.id}" data-syl-panel="${c.id}">
    <p class="syl__meta"><strong>${c.navn}</strong><span>${statLine(c)}</span></p>
    <ol class="mgrid" style="--cols:${c.modules.length <= 5 ? Math.max(c.modules.length, 3) : Math.ceil(c.modules.length / 2)}">
      ${c.modules.map((m) => html`<li class="mcard">
        <p class="mcard__n">Modul ${m.nr}</p>
        <h3 class="mcard__t">${m.titel}</h3>
        <ul class="mcard__list">
          ${m.lessons.map((l) => html`<li><a href="${lessonUrl(c, l)}" data-lesson="${c.id}/${l.slug}">${l.titel}</a></li>`)}
        </ul>
        <p class="mcard__foot">${m.lessons.length ? html`${m.lessons.length} ${m.lessons.length === 1 ? 'lektion' : 'lektioner'} · ${fmtMinutes(m.lessons.reduce((s, l) => s + l.minutes, 0))}${m.lessons.every((l) => l.gratis) ? html` · <span class="mcard__free">Gratis</span>` : ''}` : 'Kommer snart'}</p>
      </li>`)}
    </ol>
    <div class="syl__foot">
      <span>Indgår i ${tierNames(site, c.adgang)}</span>
      <a class="textlink" href="/kurser/${c.id}/">Se ${c.kort.toLowerCase()} ${icon('arrowRight', { size: 16 })}</a>
    </div>
  </section>`)}
</div>`;
}

function outline(site, c, current) {
  return html`<nav class="asidebox outline" aria-label="Kursets indhold">
  <h2><a href="/kurser/${c.id}/">${c.navn}</a></h2>
  <div class="pbar" data-course-progress="${c.id}" data-total="${c.lessons.length}"><span class="pbar__fill"></span></div>
  <p class="pbar__text" data-course-progress-text="${c.id}">${c.lessons.length} lektioner</p>
  <ol class="outline__mods">
    ${c.modules.filter((m) => m.lessons.length).map((m) => html`<li>
      <p class="outline__mod">Modul ${m.nr} · ${m.titel}</p>
      <ol class="outline__lessons">
        ${m.lessons.map((l) => html`<li><a href="${lessonUrl(c, l)}" data-lesson="${c.id}/${l.slug}"${current === l ? raw(' aria-current="page"') : ''}><span class="outline__dot" aria-hidden="true"></span><span>${l.titel}</span>${isLocked(site, l) ? icon('lock', { size: 13, cls: 'outline__lock' }) : ''}</a></li>`)}
      </ol>
    </li>`)}
  </ol>
</nav>`;
}

/* ---------- sider ---------- */
function overviewPage(site, courses) {
  const body = html`
${C.pageHead({ kicker: 'Kurser', title: 'Lær at investere – trin for trin', intro: 'Skrevne kurser, du kan læse i dit eget tempo. Første modul i hvert kursus er gratis, så du kan se, om formen passer dig.' })}
<section class="band band--paper band--flush">
  <div class="wrap">
    <div class="ccards">${courses.map((c) => courseCard(site, c))}</div>
  </div>
</section>
<section class="band band--white" aria-labelledby="syl-title">
  <div class="wrap">${syllabus(site, courses)}</div>
</section>
<section class="band band--paper" aria-labelledby="cfaq-title">
  <div class="wrap faqsplit">
    <div>
      <h2 id="cfaq-title">Spørgsmål om kurserne</h2>
      <p>Se også <a class="textlink" href="/faq/">alle spørgsmål</a>.</p>
    </div>
    ${S.faqList(COURSE_FAQ(site, courses))}
  </div>
</section>
<section class="band band--white band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: '/kurser/', html: layout(site, { title: 'Kurser', path: '/kurser/', active: 'kurser', body, scripts: ['courses'], description: `Lær at investere med skrevne kurser: ${courses.map((c) => c.navn).join(' og ')}. Første modul er gratis. Undervisning – ikke rådgivning.` }) };
}

function coursePage(site, c) {
  const free = firstFree(c);
  const body = html`
${C.pageHead({
    kicker: c.niveau ? `Kursus · ${c.niveau}` : 'Kursus',
    title: c.navn,
    intro: c.beskrivelse,
    actions: html`<p class="course__stats">${statLine(c)}</p>
    <div class="hero__actions">
      ${free ? html`<a class="btn btn--primary" href="${lessonUrl(c, free)}">Start med første lektion – gratis</a>` : ''}
      <a class="btn btn--secondary" href="/medlemskab/">Se medlemskaber</a>
    </div>`,
  })}
<section class="band band--paper band--flush">
  <div class="wrap course__grid">
    <div class="course__main">
      <h2 class="course__h">Indhold</h2>
      <ol class="modlist">
        ${c.modules.map((m) => html`<li class="mod">
          <div class="mod__head">
            <p class="mod__n">Modul ${m.nr}</p>
            <h3>${m.titel}</h3>
            ${m.beskrivelse ? html`<p>${m.beskrivelse}</p>` : ''}
          </div>
          ${m.lessons.length ? html`<ol class="lessonlist">
            ${m.lessons.map((l) => html`<li><a href="${lessonUrl(c, l)}" data-lesson="${c.id}/${l.slug}">
              <span class="lessonlist__n">${m.nr}.${l.index}</span>
              <span class="lessonlist__t">${l.titel}</span>
              <span class="lessonlist__meta">${l.gratis ? html`<span class="chip chip--free">Gratis</span>` : isLocked(site, l) ? icon('lock', { size: 15, label: 'For medlemmer' }) : ''}<span>${l.minutes} min.</span></span>
            </a></li>`)}
          </ol>` : html`<p class="mod__empty">Lektionerne kommer snart.</p>`}
        </li>`)}
      </ol>
    </div>
    <aside class="course__aside">
      ${c.forHvem.length ? html`<div class="asidebox">
        <h2>Kurset er for dig, hvis</h2>
        <ul class="ticklist">${c.forHvem.map((x) => html`<li>${icon('check', { size: 18 })}${x}</li>`)}</ul>
      </div>` : ''}
      <div class="asidebox">
        <h2>Dit fremskridt</h2>
        <div class="pbar" data-course-progress="${c.id}" data-total="${c.lessons.length}"><span class="pbar__fill"></span></div>
        <p class="pbar__text" data-course-progress-text="${c.id}">Du har ikke læst nogen lektioner endnu.</p>
      </div>
      <div class="asidebox asidebox--cta">
        <h2>Adgang</h2>
        <p>Første modul er gratis. Hele kurset indgår i ${tierNames(site, c.adgang)}.</p>
        <a class="btn btn--primary btn--block" href="/medlemskab/">Se medlemskaber</a>
      </div>
    </aside>
  </div>
</section>
<section class="band band--white band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: `/kurser/${c.id}/`, html: layout(site, { title: c.navn, path: `/kurser/${c.id}/`, active: 'kurser', body, scripts: ['courses'], description: `${c.beskrivelse} ${statLine(c)}.` }) };
}

function lessonPage(site, c, l) {
  const locked = isLocked(site, l);
  const m = l.module;
  const path = lessonUrl(c, l);
  const body = html`
<article class="lesson">
  <header class="lesson__head">
    <div class="wrap">
      <nav class="crumbs" aria-label="Brødkrummer"><a href="/kurser/">Kurser</a>${icon('chevronRight', { size: 14 })}<a href="/kurser/${c.id}/">${c.kort}</a>${icon('chevronRight', { size: 14 })}<span>Modul ${m.nr}</span></nav>
      <p class="lesson__kicker">Modul ${m.nr} · ${m.titel} · Lektion ${l.index} af ${m.lessons.length}</p>
      <h1>${l.titel}</h1>
      <p class="lesson__meta">${icon('clock', { size: 16 })}${l.minutes} min. læsning${l.gratis ? html`<span class="chip chip--free">Gratis lektion</span>` : ''}</p>
    </div>
  </header>
  <div class="wrap lesson__grid">
    <div class="lesson__main">
      <div class="prose">${raw(locked ? l.teaserHtml : l.html)}</div>
      ${locked ? html`<div class="paywall">
        <div class="paywall__icon">${icon('lock', { size: 22 })}</div>
        <h2>Resten af lektionen er for medlemmer</h2>
        <p>${c.navn} indgår i ${tierNames(site, c.adgang)}. Første modul er gratis, så du kan se, om formen passer dig.</p>
        <a class="btn btn--primary" href="/medlemskab/">Se medlemskaber</a>
      </div>` : html`<div class="lesson__done">
        <button type="button" class="btn btn--secondary" data-lesson-done="${c.id}/${l.slug}" aria-pressed="false">${icon('check', { size: 18 })}<span data-done-label>Markér som læst</span></button>
      </div>`}
      <nav class="lesson__nav" aria-label="Lektioner">
        ${l.prev ? html`<a class="lnav lnav--prev" href="${lessonUrl(c, l.prev)}"><span class="lnav__dir">Forrige</span><span class="lnav__t">${l.prev.titel}</span></a>` : html`<a class="lnav lnav--prev" href="/kurser/${c.id}/"><span class="lnav__dir">Tilbage</span><span class="lnav__t">Kursets forside</span></a>`}
        ${l.next ? html`<a class="lnav lnav--next" href="${lessonUrl(c, l.next)}" data-next-of="${c.id}/${l.slug}"><span class="lnav__dir">Næste lektion</span><span class="lnav__t">${l.next.titel}</span></a>` : html`<a class="lnav lnav--next" href="/kurser/${c.id}/" data-next-of="${c.id}/${l.slug}"><span class="lnav__dir">Du er færdig</span><span class="lnav__t">Tilbage til kurset</span></a>`}
      </nav>
      <p class="article__disc"><strong>Husk:</strong> ${DISC}${c.ratesYear ? ` Tal og satser er fra ${c.ratesYear} og kan ændre sig – tjek altid de aktuelle regler.` : ' Tal og satser kan ændre sig – tjek altid de aktuelle regler.'}</p>
    </div>
    <aside class="lesson__aside">${outline(site, c, l)}</aside>
  </div>
</article>`;
  return { path, html: layout(site, { title: `${l.titel} – ${c.kort}`, path, active: 'kurser', body, scripts: ['courses'], ogType: 'article', description: `${c.navn}, modul ${m.nr}: ${m.titel}. ${l.titel}.` }) };
}

module.exports = function kurserPages(site) {
  const courses = site.courses || [];
  if (!courses.length) return [];
  return [
    overviewPage(site, courses),
    ...courses.map((c) => coursePage(site, c)),
    ...courses.flatMap((c) => c.lessons.map((l) => lessonPage(site, c, l))),
  ];
};
module.exports.courseCard = courseCard;
module.exports.syllabus = syllabus;
module.exports.fmtMinutes = fmtMinutes;
module.exports.tierNames = tierNames;
module.exports.COURSE_FAQ = COURSE_FAQ;
