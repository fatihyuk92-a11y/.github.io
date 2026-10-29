// Handelsbetingelser og privatlivspolitik. Teksterne bygges ud fra indstillingerne (firmanavn, CVR, adresse, e-mail og priser),
// så de altid passer til siden. Gennemgå dem, før du tager betaling – de er et solidt udgangspunkt, ikke juridisk rådgivning.
const { html } = require('../lib/util');
const { layout } = require('../templates/layout');
const C = require('../templates/components');

const UPDATED = '28. oktober 2026';

function provider(s) {
  const name = s.firmanavn || s.sitenavn;
  return html`<p>${name}${s.cvr ? html`, CVR ${s.cvr}` : ''}${s.adresse ? html`<br>${s.adresse}` : ''}${s.email ? html`<br>E-mail: <a href="mailto:${s.email}">${s.email}</a>` : ''}</p>`;
}

function legalPage(site, { path, title, intro, body, description }) {
  const page = html`
${C.pageHead({ title, intro })}
<section class="band band--white band--tight">
  <div class="wrap">
    <div class="prose prose--lg legaldoc">
      ${body}
      <p class="legaldoc__updated">Senest opdateret ${UPDATED}.</p>
    </div>
  </div>
</section>`;
  return { path, html: layout(site, { title, path, active: '', body: page, description }) };
}

function handelsbetingelser(site) {
  const s = site.settings;
  const n = s.sitenavn;
  const contact = s.email ? html`<a href="mailto:${s.email}">${s.email}</a>` : 'os';
  const body = html`
<h2>1. Hvem sælger</h2>
${provider(s)}

<h2>2. Hvad du køber – undervisning, ikke rådgivning</h2>
<p>${n} er en undervisningsplatform om aktier og investering. Et medlemskab giver adgang til undervisningsmateriale, ${site.edu ? 'cases' : 'analyser'}, værktøjer og fællesskab. Indholdet er generelt og er det samme for alle medlemmer.</p>
<p><strong>${n} yder ikke personlig investeringsrådgivning, porteføljepleje eller formidling af handler</strong> og er ikke en finansiel virksomhed med tilladelse fra Finanstilsynet. Indholdet tager ikke højde for din økonomi, dine mål eller din risikovillighed${site.edu ? ', og det indeholder ingen opfordringer til at købe eller sælge bestemte værdipapirer' : ''}. Du træffer selv dine investeringsbeslutninger og bærer selv risikoen.</p>
${site.model && s.vis_portefolje ? html`<p>Porteføljen på siden er en modelportefølje: handlerne er tænkte og ikke foretaget med rigtige penge. Afkastet viser, hvordan metoden ville have klaret sig, og er ikke et udtryk for et faktisk opnået resultat.</p>` : ''}
${site.edu ? '' : html`<p>Analyser kan indeholde forfatterens egne vurderinger, herunder kursmål. De er generelle, er ikke tilpasset dig, og oplysninger om forfatterens egne positioner fremgår af den enkelte analyse.</p>`}

<h2>3. Medlemskaber og priser</h2>
${s.priser.length ? html`<ul>${s.priser.map((t) => html`<li><strong>${t.navn}:</strong> ${t.pris} ${t.periode}${t.note ? html` – ${t.note.toLowerCase()}` : ''}</li>`)}</ul>` : ''}
<p>Alle priser er i danske kroner og er de endelige priser, du betaler.</p>

<h2>4. Betaling</h2>
<p>Du betaler via vores betalingsudbyder med de betalingsmetoder, der vises ved købet. Vi får ikke adgang til dine kortoplysninger. Løbende medlemskaber betales forud for hver periode og fornyes automatisk, indtil du opsiger dem.</p>

<h2>5. Opsigelse</h2>
<p>Løbende medlemskaber har ingen binding. Du kan opsige når som helst med virkning fra udløbet af den periode, du har betalt for – skriv til ${contact}. Du beholder adgangen, til perioden udløber.</p>

<h2>6. Fortrydelsesret</h2>
<p>Som forbruger har du 14 dages fortrydelsesret, når du køber online. Fristen regnes fra den dag, købet er gennemført. Vil du fortryde, så skriv til ${contact}, inden fristen udløber. Du får pengene tilbage senest 14 dage efter, at vi har modtaget din besked, med samme betalingsmiddel som ved købet.</p>
<p>Ved digitalt indhold, som du får adgang til med det samme, bortfalder fortrydelsesretten kun, hvis du ved købet udtrykkeligt har accepteret, at leveringen begynder med det samme, og har anerkendt, at du dermed mister fortrydelsesretten.</p>

<h2>7. Ansvar</h2>
<p>Indholdet er udarbejdet omhyggeligt, men kan indeholde fejl og kan være forældet. Kursdata vises kun til information og kan være forsinkede. AI-assistenten giver generelle, undervisende svar og kan tage fejl.</p>
<p>${n} er ikke ansvarlig for tab som følge af investeringsbeslutninger, du træffer på baggrund af indholdet. Al investering indebærer risiko for tab, og historiske afkast er ingen garanti for fremtidige afkast.</p>

<h2>8. Regler for fællesskab, grupper og spørgetimer</h2>
<ul>
  <li>Ingen opfordringer til at købe eller sælge bestemte værdipapirer – hverken fra ${n} eller fra medlemmer.</li>
  <li>Ingen personlig rådgivning. Spørgsmål om din egen økonomi og dine investeringer hører hjemme hos en autoriseret rådgiver.</li>
  <li>Del aldrig intern viden, rygter eller indhold, der kan påvirke en kurs.</li>
  <li>Hold en respektfuld tone.</li>
</ul>
<p>Indlæg, der bryder reglerne, fjernes, og gentagne brud kan føre til, at medlemskabet ophører.</p>

<h2>9. Ophavsret</h2>
<p>Indholdet er beskyttet af ophavsret og er til din personlige brug. Det må ikke deles, videresælges eller offentliggøres uden skriftlig tilladelse.</p>

<h2>10. Persondata</h2>
<p>Læs, hvordan vi behandler dine oplysninger, i vores <a href="/privatliv/">privatlivspolitik</a>.</p>

<h2>11. Klager</h2>
<p>Kontakt os først på ${contact}, så finder vi en løsning. Er du forbruger, og kan vi ikke blive enige, kan du klage til Nævnenes Hus på <a href="https://naevneneshus.dk" target="_blank" rel="noopener">naevneneshus.dk</a>.</p>

<h2>12. Lovvalg</h2>
<p>Handelsbetingelserne er underlagt dansk ret.</p>`;
  return legalPage(site, { path: '/handelsbetingelser/', title: 'Handelsbetingelser', intro: `Betingelser for køb af medlemskaber og adgang til indhold på ${n}.`, body, description: `Handelsbetingelser for medlemskaber på ${n}: undervisning, ikke rådgivning. Ingen binding.` });
}

function privatliv(site) {
  const s = site.settings;
  const n = s.sitenavn;
  const contact = s.email ? html`<a href="mailto:${s.email}">${s.email}</a>` : 'os';
  const body = html`
<h2>Dataansvarlig</h2>
${provider(s)}

<h2>Hvilke oplysninger vi behandler – og hvorfor</h2>
<h3>Når du skriver til os</h3>
<p>Vi behandler dit navn, din e-mailadresse og indholdet af din henvendelse for at kunne svare dig. Grundlaget er vores legitime interesse i at besvare henvendelser (databeskyttelsesforordningens artikel 6, stk. 1, litra f).</p>
<h3>Når du køber et medlemskab</h3>
<p>Vi behandler dit navn, din e-mailadresse og oplysninger om dit køb for at kunne levere medlemskabet (artikel 6, stk. 1, litra b) og for at overholde bogføringsreglerne (artikel 6, stk. 1, litra c). Betalingen håndteres af vores betalingsudbyder – vi ser aldrig dine kortoplysninger.</p>
<h3>Når du bruger AI-assistenten</h3>
<p>Dine beskeder sendes til vores AI-leverandør, Anthropic, som laver svaret. Vi gemmer ikke samtalerne. Skriv derfor ikke navne, CPR-numre eller andre personlige oplysninger i chatten.</p>
<h3>Når du besøger siden</h3>
<p>Vores hostingudbyder registrerer tekniske oplysninger som IP-adresse og browsertype i logfiler for at sikre drift og sikkerhed. Kursdata hentes af vores egen server, så din browser kontakter ikke dataudbyderen direkte.</p>

<h2>Cookies</h2>
<p>Siden bruger ingen cookies til statistik eller markedsføring. Administrationen bruger kun teknisk nødvendig lagring til at holde udgiveren logget ind.</p>

<h2>Hvem vi deler oplysninger med</h2>
<p>Vi bruger leverandører, der behandler oplysninger på vores vegne: hosting (Vercel), AI-assistent (Anthropic), betaling og e-mail. Nogle af dem er placeret i USA. Overførsler sker på grundlag af EU-Kommissionens standardkontraktbestemmelser eller EU-U.S. Data Privacy Framework. Vi sælger aldrig dine oplysninger.</p>

<h2>Hvor længe vi gemmer oplysningerne</h2>
<p>Henvendelser slettes, når de er afsluttet, medmindre de indgår i et kundeforhold. Oplysninger om medlemskaber gemmes, så længe medlemskabet løber, og bogføringsmateriale gemmes i 5 år fra udgangen af det regnskabsår, det vedrører.</p>

<h2>Dine rettigheder</h2>
<p>Du har ret til at få indsigt i de oplysninger, vi behandler om dig, og til at få dem rettet eller slettet. Du kan også gøre indsigelse, få behandlingen begrænset og få dine oplysninger udleveret (dataportabilitet). Skriv til ${contact}.</p>
<p>Du kan klage over vores behandling af dine oplysninger til Datatilsynet på <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener">datatilsynet.dk</a>.</p>`;
  return legalPage(site, { path: '/privatliv/', title: 'Privatlivspolitik', intro: `Sådan behandler ${n} dine personoplysninger.`, body, description: `Privatlivspolitik for ${n}: hvilke oplysninger vi behandler, hvorfor og hvor længe.` });
}

module.exports = function legalPages(site) {
  return [handelsbetingelser(site), privatliv(site)];
};
