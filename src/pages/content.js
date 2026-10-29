// Indholdssider: AI-assistent, metode, om, FAQ, vigtigt at vide, medlemskab og 404.
const { html, raw, genitive } = require('../lib/util');
const { renderMarkdown } = require('../lib/markdown');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');
const S = require('../templates/sections');

function aiPage(site) {
  const body = html`
${C.pageHead({
    title: 'AI-assistenten',
    intro: 'Spørg om nøgletal, indikatorer, regnskaber og markedsbegreber. Assistenten forklarer og underviser – den giver aldrig køb- eller salgsanbefalinger.',
  })}
<section class="band band--paper band--flush">
  <div class="wrap chatlayout">
    <div class="chat" data-chat>
      <div class="chat__head">
        <span class="chat__avatar">${icon('sparkle', { size: 18 })}</span>
        <div><strong>${genitive(site.settings.sitenavn)} AI-assistent</strong><span class="chat__status" data-chat-status>Klar</span></div>
      </div>
      <div class="chat__log" data-chat-log aria-live="polite">
        <div class="msg msg--bot">
          <p>Hej! Jeg kan forklare begreber som RSI, P/E, frie pengestrømme og renters betydning for aktier – og hjælpe dig med at strukturere din egen research.</p>
          <p class="msg__disc">Jeg giver ikke personlig rådgivning eller køb- og salgsanbefalinger. Alt, jeg skriver, er undervisning.</p>
        </div>
      </div>
      <div class="chat__suggest" data-chat-suggest>
        <button type="button" data-q="Hvad er RSI, og hvordan læser man den?">Hvad er RSI?</button>
        <button type="button" data-q="Hvad er forskellen på P/E og EV/EBITDA?">P/E eller EV/EBITDA?</button>
        <button type="button" data-q="Hvilke spørgsmål bør jeg stille mig selv, før jeg køber en aktie?">Spørgsmål før et køb</button>
        <button type="button" data-q="Hvordan påvirker stigende renter bankaktier?">Renter og bankaktier</button>
      </div>
      <form class="chat__form" data-chat-form>
        <label class="sr-only" for="chat-input">Skriv dit spørgsmål</label>
        <textarea id="chat-input" rows="1" maxlength="1500" placeholder="Skriv dit spørgsmål …" data-chat-input></textarea>
        <button class="btn btn--primary btn--icon" type="submit" aria-label="Send">${icon('send', { size: 18 })}</button>
      </form>
      <p class="chat__foot">Kun til undervisning – ikke rådgivning. AI kan tage fejl, så tjek vigtige oplysninger i primære kilder.</p>
    </div>
    <aside class="chatinfo">
      <h2>Det kan assistenten</h2>
      <ul class="ticklist">
        <li>${icon('check', { size: 18 })}Forklare tekniske indikatorer som RSI, MACD og glidende gennemsnit</li>
        <li>${icon('check', { size: 18 })}Gennemgå nøgletal som P/E, EV/EBITDA, ROIC og frie pengestrømme</li>
        <li>${icon('check', { size: 18 })}Forklare makro: renter, valuta og sektorrotation</li>
        <li>${icon('check', { size: 18 })}Foreslå spørgsmål, du selv bør undersøge</li>
      </ul>
      <h2>Det gør den ikke</h2>
      <ul class="ticklist ticklist--no">
        <li>${icon('close', { size: 16 })}Siger hvad du skal købe eller sælge</li>
        <li>${icon('close', { size: 16 })}Vurderer, hvad der passer til din økonomi</li>
        <li>${icon('close', { size: 16 })}Lover afkast</li>
      </ul>
    </aside>
  </div>
</section>`;
  return { path: '/ai-assistent/', html: layout(site, { title: 'AI-assistenten', path: '/ai-assistent/', active: 'ai', body, scripts: ['chat'], description: 'Stil spørgsmål om nøgletal, indikatorer og markedsbegreber. Undervisning – ikke rådgivning.' }) };
}

const METHOD = [
  { t: 'Makro', lead: 'Regimet sætter rammen.', p: 'Jeg starter oppefra. Renter, valuta, sektorrotation og kreditmarkedet fortæller, om vinden er med eller imod. En god aktie i et dårligt marked er stadig en svær case.', list: ['Renteforventninger og rentekurvens form', 'Dollarens styrke som tegn på global likviditet', 'Hvilke sektorer kapitalen flytter til og fra', 'Risikovilje i kreditmarkedet og volatiliteten'] },
  { t: 'Fundamental', lead: 'Regnskabet, ikke forsiden.', p: 'Jeg læser hele regnskabet: noter, pengestrømsopgørelse og segmenter. Værdiansættelsen bygger på DCF, hvor det giver mening, og på sammenligning med konkurrenterne.', list: ['DCF med åbne antagelser om vækst, marginer og afkastkrav', 'EV/EBITDA, P/E og P/B i historisk perspektiv', 'Frie pengestrømme mod den rapporterede indtjening', 'ROIC mod kapitalomkostning: skaber selskabet værdi?'] },
  { t: 'Teknisk', lead: 'Timingen, ikke beslutningen.', p: 'Tekniske niveauer bruges til at vælge indgang og stop. De skal aldrig være selve beslutningen – siger fundamentet nej, betyder et pænt chart ingenting.', list: ['Trend og brud i trendstrukturen', 'Støtte og modstand, der har holdt før', 'Volumen som bekræftelse', 'RSI, MACD og glidende gennemsnit som sekundære filtre'] },
  { t: 'Risiko', lead: 'Uden ramme er det bare en mening.', p: 'Hver analyse slutter med et stop og scenarier for, hvad der kan gå galt. Positionsstørrelsen afhænger af din risikoprofil – ikke af min.', list: ['Bull-, base- og bear-scenarie', 'Stop placeret efter den tekniske struktur', 'Hvad sker der, hvis hele casen falder fra hinanden?', 'Hvordan aktien passer ind i resten af porteføljen'] },
];

const METHOD_EDU = [
  METHOD[0],
  METHOD[1],
  { t: 'Teknisk', lead: 'Forløbet, ikke forudsigelsen.', p: 'Chartet viser, hvordan markedet har handlet aktien: trend, støtte, modstand og volumen. Jeg bruger historiske forløb til at vise, hvordan man læser et chart – ikke til at forudsige, hvor kursen går hen.', list: ['Trend og brud i trendstrukturen', 'Støtte og modstand, der har holdt før', 'Volumen som bekræftelse', 'RSI, MACD og glidende gennemsnit forklaret med eksempler'] },
  { t: 'Risiko', lead: 'Hvad skal der til, før casen ikke holder?', p: 'Hver case gennemgår scenarier for, hvad der kan gå galt, og hvilke forudsætninger der bærer den. Hvordan du selv styrer risiko og positionsstørrelse, afhænger af din økonomi og risikovillighed – det er din beslutning.', list: ['Bull-, base- og bear-scenarie', 'De forudsætninger, casen hviler på', 'Hvad sker der, hvis hele casen falder fra hinanden?', 'Begreber som spredning, positionsstørrelse og stop-loss forklaret generelt'] },
];

function metodePage(site) {
  const edu = site.edu;
  const steps = edu ? METHOD_EDU : METHOD;
  const body = html`
${C.pageHead({ title: 'Metoden', intro: 'Fire trin, i samme rækkefølge hver gang. Hvert trin vurderes for sig, så du kan se præcis, hvor casen er stærk, og hvor den er svag.' })}
<section class="band band--white band--flush">
  <div class="wrap">
    <ol class="method">
      ${steps.map((m, i) => html`<li class="method__step">
        <div class="method__n" aria-hidden="true">${i + 1}</div>
        <div class="method__body">
          <h2>${m.t}</h2>
          <p class="method__lead">${m.lead}</p>
          <p>${m.p}</p>
          <ul class="ticklist">${m.list.map((x) => html`<li>${icon('check', { size: 18 })}${x}</li>`)}</ul>
        </div>
      </li>`)}
    </ol>
  </div>
</section>
<section class="band band--paper">
  <div class="wrap">
    <div class="sechead"><div><h2>${edu ? 'Det får du i hver case' : 'Det får du i hver analyse'}</h2></div></div>
    <div class="trio">
      ${edu
        ? html`<div class="trio__item">${icon('target', { size: 26 })}<h3>Metoden i praksis</h3><p>Teknisk og fundamental analyse gennemgået trin for trin på en rigtig aktie – så du kan gøre det selv.</p></div>`
        : html`<div class="trio__item">${icon('target', { size: 26 })}<h3>Klare niveauer</h3><p>Kurs ved analysen, kursmål og stop – så du aldrig skal gætte, hvad der menes.</p></div>`}
      <div class="trio__item">${icon('shield', { size: 26 })}<h3>Egne positioner oplyst</h3><p>Ejer jeg selv aktien, står det i analysen. Interessekonflikter skal være synlige.</p></div>
      ${edu
        ? html`<div class="trio__item">${icon('pulse', { size: 26 })}<h3>Kilder og scenarier</h3><p>Hvor tallene kommer fra, og hvad der skal til, før casen ikke længere holder.</p></div>`
        : html`<div class="trio__item">${icon('pulse', { size: 26 })}<h3>Opfølgning live</h3><p>Kursudviklingen siden analysen vises automatisk, så alle kan se, hvordan casen holder.</p></div>`}
    </div>
  </div>
</section>
<section class="band band--white band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: '/metode/', html: layout(site, { title: 'Metoden', path: '/metode/', active: 'metode', body, description: 'Sådan bliver en analyse til: makro, fundamental, teknisk og risiko.' }) };
}

function omPage(site) {
  const s = site.settings;
  const { html: omHtml } = renderMarkdown(s.om_tekst || '');
  const body = html`
${C.pageHead({ title: `Om ${s.sitenavn}`, intro: 'Et uafhængigt projekt uden bank, mægler eller provision i baghånden.' })}
<section class="band band--white band--flush">
  <div class="wrap omgrid">
    <div class="prose prose--lg">${raw(omHtml)}</div>
    <aside class="omfacts">
      <div class="asidebox">
        <h2>Det kan du altid regne med</h2>
        <ul class="ticklist">
          <li>${icon('check', { size: 18 })}Egne positioner oplyses i hver analyse</li>
          <li>${icon('check', { size: 18 })}Ingen betaling fra børsnoterede selskaber</li>
          ${s.vis_portefolje ? html`<li>${icon('check', { size: 18 })}${site.model ? 'Modelporteføljen' : 'Porteføljen'} vises åbent – også tabene</li>` : ''}
          <li>${icon('check', { size: 18 })}Analyserne skrives af et menneske, ikke en AI</li>
        </ul>
      </div>
      ${s.email ? html`<div class="asidebox"><h2>Kontakt</h2><p>Spørgsmål til siden eller metoderne? Skriv til <a class="textlink" href="mailto:${s.email}">${s.email}</a>. Jeg giver ikke personlig rådgivning om dine investeringer.</p></div>` : ''}
    </aside>
  </div>
</section>
<section class="band band--paper band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: '/om/', html: layout(site, { title: `Om ${s.sitenavn}`, path: '/om/', active: 'om', body }) };
}

function faqGroups(site) {
  const edu = site.edu;
  const s = site.settings;
  return [
  { title: 'Det juridiske', items: [
    { q: 'Er det her finansiel rådgivning?', a: '<p><strong>Nej.</strong> Sitet er en undervisningsplatform. Indholdet er generelt, er det samme for alle og tager ikke højde for din økonomi, dine mål eller din risikovillighed. Udgiveren er ikke en finansiel virksomhed med tilladelse fra Finanstilsynet og giver ikke personlig investeringsrådgivning.</p>' },
    edu
      ? { q: 'Hvorfor står der ingen kursmål eller køb og salg?', a: '<p>Fordi analyserne er undervisning. Hver case viser, hvordan man læser et chart og et regnskab – med historiske forløb som eksempler – men siger ikke, hvad du skal gøre. Den beslutning er din.</p>' }
      : { q: 'Hvad betyder kursmål og stop i analyserne?', a: '<p>Det er forfatterens egne, generelle vurderinger på udgivelsestidspunktet – markeret som prognoser med forudsætninger. De er ikke tilpasset dig og er ikke en instruks.</p>' },
    { q: 'Kan jeg få personlig rådgivning?', a: '<p>Nej. Spørgetimer og grupper handler om metoder og begreber – ikke om, hvad du selv bør købe eller sælge. Har du brug for personlig rådgivning, så kontakt en autoriseret rådgiver, fx i din bank.</p>' },
    { q: 'Hvem hæfter, hvis jeg taber penge?', a: '<p>Det gør du selv. Du træffer dine egne beslutninger, og sitet fratager sig ansvaret for analyserne. Invester aldrig penge, du ikke har råd til at tabe.</p>' },
  ] },
  { title: 'Medlemskab', items: [
    { q: 'Kan jeg opsige når som helst?', a: '<p>Ja. Plus og Premium har ingen binding og kan opsiges fra måned til måned. Læs mere i <a href="/handelsbetingelser/">handelsbetingelserne</a>.</p>' },
    { q: 'Hvad er forskellen på Plus og Premium?', a: '<p>Plus giver dig hele arkivet og nye cases. Premium giver derudover spørgetimer om metoderne, de lukkede grupper og ubegrænset brug af AI-assistenten.</p>' },
    { q: 'Jeg er helt ny. Hvor starter jeg?', a: '<p>Start med <strong>Introduktion</strong>. Den giver dig fundamentet, før du kaster dig over de løbende cases.</p>' },
  ] },
  ...((site.courses || []).length ? [{ title: 'Kurser', items: require('./kurser').COURSE_FAQ(site, site.courses) }] : []),
  { title: 'Indhold og data', items: [
    { q: 'Hvilke markeder dækkes?', a: `<p>${s.forside_marked === 'dk' ? 'Primært danske storaktier og udvalgte amerikanske og europæiske aktier.' : 'Primært amerikanske og danske storaktier – og udvalgte europæiske aktier.'}</p>` },
    { q: 'Hvor kommer aktiekurserne fra?', a: '<p>Aktiekurserne hentes fra Yahoo Finance via sitets egen server. De opdateres løbende, men kan være forsinkede op til 15 minutter.</p>' },
    s.portefolje_type === 'model'
      ? { q: 'Ejer du selv de aktier, du skriver om?', a: `<p>Det står altid i den enkelte case.${s.vis_portefolje ? ' Porteføljen på siden er en modelportefølje med tænkte handler, så den viser ikke, hvad jeg selv ejer.' : ''}</p>` }
      : { q: 'Ejer du selv de aktier, du skriver om?', a: `<p>Ofte. Det står altid i den enkelte analyse${s.vis_portefolje ? `, og porteføljen vises åbent${s.portefolje_forsinkelse ? ` med ${s.portefolje_forsinkelse} dages forsinkelse` : ''}` : ''}.</p>` },
    ...(s.portefolje_type === 'model' && s.vis_portefolje ? [{ q: 'Er porteføljen rigtig?', a: `<p>Nej. Det er en modelportefølje: handlerne er tænkte og ikke foretaget med rigtige penge. Hver handel registreres med datoen og kursen den dag, den lægges ind, og der rettes ikke i den bagefter. Den viser, hvordan metoden ville have klaret sig – uden kurtage, skat og udbytte.${s.portefolje_forsinkelse ? ` Nye handler vises med ${s.portefolje_forsinkelse} dages forsinkelse.` : ''}</p>` }] : []),
    { q: 'Kan AI-assistenten tage fejl?', a: '<p>Ja. Sprogmodeller kan tage fejl eller bruge forældede tal. Brug assistenten til at lære begreberne, og tjek vigtige oplysninger i årsrapporter og selskabsmeddelelser.</p>' },
  ] },
  ];
}

function faqPage(site) {
  const s = site.settings;
  const body = html`
${C.pageHead({ title: 'Spørgsmål og svar', intro: html`Klare svar på det, jeg oftest bliver spurgt om.${s.email ? html` Mangler du et svar, så skriv til <a class="textlink" href="mailto:${s.email}">${s.email}</a>.` : ''}` })}
<section class="band band--white band--flush">
  <div class="wrap faqpage">
    ${faqGroups(site).map((g) => html`<section class="faqgroup"><h2>${g.title}</h2>${S.faqList(g.items)}</section>`)}
  </div>
</section>
<section class="band band--paper band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: '/faq/', html: layout(site, { title: 'Spørgsmål og svar', path: '/faq/', active: 'faq', body }) };
}

function vigtigtPage(site) {
  const n = site.settings.sitenavn;
  const s = site.settings;
  const body = html`
${C.pageHead({ title: 'Vigtigt at vide', intro: 'Læs dette, før du bliver medlem – og før hver beslutning.' })}
<section class="band band--white band--flush">
  <div class="wrap legal">
    <div class="letter">
      <p class="letter__lead">Alle analyser og oplysninger på ${n} er baseret på den viden, jeg har opnået på aktiemarkedet igennem de sidste mange år.</p>
      <p><strong>${n} udbyder ikke rådgivning eller anbefalinger</strong>, og alle analyser er udelukkende til undervisning.</p>
      <p>Der er altid en risiko forbundet med investering. Derfor bør du <strong>ikke handle med penge, som du ikke har råd til at tabe.</strong></p>
      <p>Brug analyserne og oplysningerne som en slags undervisningsmateriale, men <strong>foretag altid dine egne beslutninger og analyser</strong>, inden du handler.</p>
      <p>Historiske afkast er ikke en garanti for fremtidige afkast. <strong>${n} fratager sig alt ansvar for analyserne.</strong></p>
      <p>Du er velkommen til at kontakte ${n} med spørgsmål til siden og metoderne${s.email ? html` – skriv til <a class="textlink" href="mailto:${s.email}">${s.email}</a>` : ''}. ${n} giver ikke personlig rådgivning om dine investeringer.</p>
    </div>
    <div class="legal__formal prose">
      <h2>Den formelle ansvarsfraskrivelse</h2>
      <h3>Indholdets karakter</h3>
      <p>${n} er en privat udgivet undervisningsplatform. Indholdet er generel information og undervisning, der henvender sig til alle på samme måde. Det udgør ikke finansiel, skattemæssig eller juridisk rådgivning, tager ikke højde for din økonomi, dine mål eller din risikovillighed og må ikke opfattes som en personlig anbefaling om at købe, sælge eller beholde finansielle instrumenter.</p>
      ${site.edu ? html`<p>Analyserne er undervisningscases. De viser, hvordan metoderne bruges på rigtige aktier – ofte med historiske forløb som eksempler – men indeholder ingen kursmål, stop eller opfordringer til at handle.</p>` : ''}
      <h3>Ingen tilladelse fra Finanstilsynet</h3>
      <p>${n} og udgiveren er ikke en finansiel virksomhed med tilladelse fra Finanstilsynet og yder ikke investeringsservice som personlig investeringsrådgivning, porteføljepleje eller formidling af handler. Indholdet er udtryk for udgiverens egen vurdering, baseret på offentligt tilgængelige kilder.</p>
      <h3>Investeringsrisiko</h3>
      <p>Al investering i aktier og andre finansielle instrumenter indebærer risiko for tab, herunder tab af hele det investerede beløb. Tidligere afkast er ikke en pålidelig indikator for fremtidige resultater.</p>
      <h3>Dit eget ansvar</h3>
      <p>Du bærer selv det fulde ansvar for dine investeringsbeslutninger og bør altid søge rådgivning hos en autoriseret rådgiver, der kender dine personlige forhold.</p>
      <h3>Interessekonflikter</h3>
      <p>Udgiveren kan eje aktier i de selskaber, der omtales. Det oplyses i den enkelte analyse${s.vis_portefolje ? (site.model ? '. Porteføljen på siden er en modelportefølje med tænkte handler og viser ikke udgiverens egne investeringer' : ', og porteføljen vises åbent') : ''}. ${n} modtager ikke betaling fra børsnoterede selskaber for omtale.</p>
      <h3>Kursdata og AI-assistent</h3>
      <p>Kurser vises kun til information og kan være forsinkede eller fejlbehæftede. AI-assistenten giver undervisende svar, kan tage fejl og giver aldrig personlig rådgivning eller konkrete anbefalinger.</p>
      <h3>Medlemskab og persondata</h3>
      <p>Læs også <a href="/handelsbetingelser/">handelsbetingelserne</a> og <a href="/privatliv/">privatlivspolitikken</a>.</p>
      <h3>Lovvalg</h3>
      <p>Ansvarsfraskrivelsen er underlagt dansk ret.</p>
    </div>
  </div>
</section>`;
  return { path: '/vigtigt/', html: layout(site, { title: 'Vigtigt at vide', path: '/vigtigt/', active: 'vigtigt', body, description: 'Ansvarsfraskrivelse: indholdet er undervisning og ikke finansiel rådgivning.' }) };
}

function medlemskabPage(site) {
  const tiers = site.settings.priser;
  // Sammenligningen viser linjer, som flere medlemskaber har – plus dem, kun det største har.
  // Linjer, kun et mindre medlemskab har, beskriver dets indhold (fx begynderkursets emner) og står på kortet.
  const featureNames = [];
  for (const t of tiers) for (const f of t.features) if (!featureNames.includes(f.tekst)) featureNames.push(f.tekst);
  const inTiers = (name) => tiers.filter((t) => t.features.some((f) => f.tekst === name));
  const compareNames = featureNames.filter((name) => { const ts = inTiers(name); return ts.length > 1 || ts[0] === tiers[tiers.length - 1]; });
  const has = (t, name) => { const f = t.features.find((x) => x.tekst === name); return f ? f.med : false; };
  const body = html`
${C.pageHead({ title: 'Medlemskab', intro: 'Tre måder at komme i gang på. Plus og Premium har ingen binding og kan opsiges fra måned til måned.' })}
<section class="band band--paper band--flush">
  <div class="wrap">
    ${S.pricing(site, { headingLevel: 2 })}
    <div class="compare">
      <h2>Sammenlign medlemskaber</h2>
      <div class="tablewrap">
        <table class="dtable dtable--compare">
          <thead><tr><th scope="col">Det får du</th>${tiers.map((t) => html`<th scope="col" class="c${t.fremhaevet ? ' is-featured' : ''}">${t.navn}</th>`)}</tr></thead>
          <tbody>
            ${compareNames.map((name) => html`<tr><th scope="row">${name}</th>${tiers.map((t) => html`<td class="c${t.fremhaevet ? ' is-featured' : ''}">${has(t, name) ? html`<span class="yes">${icon('check', { size: 18, label: 'Inkluderet' })}</span>` : html`<span class="no" aria-label="Ikke inkluderet">–</span>`}</td>`)}</tr>`)}
            <tr><th scope="row">Pris</th>${tiers.map((t) => html`<td class="c${t.fremhaevet ? ' is-featured' : ''}"><strong>${t.pris}</strong><small class="block">${t.periode}</small></td>`)}</tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>
<section class="band band--white band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return { path: '/medlemskab/', html: layout(site, { title: 'Medlemskab', path: '/medlemskab/', active: 'medlemskab', body, description: 'Vælg mellem Introduktion, Plus og Premium. Ingen binding.' }) };
}

function notFoundPage(site) {
  const body = html`
<section class="nf">
  <div class="wrap nf__in">
    <p class="nf__code" aria-hidden="true">404</p>
    <h1>Kompasset kan ikke finde siden</h1>
    <p>Siden findes ikke længere, eller adressen er skrevet forkert.</p>
    <div class="hero__actions"><a class="btn btn--primary" href="/">Til forsiden</a><a class="btn btn--secondary" href="/analyser/">Se analyserne</a></div>
  </div>
</section>`;
  return { path: '/404.html', file: '404.html', html: layout(site, { title: 'Siden findes ikke', path: '/404.html', body, noindex: true }) };
}

module.exports = function contentPages(site) {
  return [aiPage(site), metodePage(site), omPage(site), faqPage(site), vigtigtPage(site), medlemskabPage(site), notFoundPage(site)];
};
