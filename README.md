# Aktiekompas

Dansk undervisningsplatform om aktier: skrevne kurser, cases med teknisk og fundamental analyse, en åben portefølje med live kurser, et marked-overblik, en opsparingsberegner, en AI-assistent og medlemskaber. Alt indhold redigeres i **admin** på `/admin/` – du skal aldrig røre koden for at tilføje en lektion, en case eller en investering.

Siden er bygget til at holde sig på **undervisningssiden** af reglerne: ingen personlig rådgivning, ingen køb/salg-anbefalinger, ingen kursmål. Læs afsnit 6 og 7, før du tager betaling.

- **Kurser:** to skrevne kurser – *Kom i gang med at investere* (5 moduler, 17 lektioner) og *Investeringskurset* (8 moduler, 39 lektioner). Første modul i hvert kursus er gratis. Læserens fremskridt ("Markér som læst") huskes i browseren. Se afsnit 6.
- **Beregner** (`/beregner/` og på forsiden): hvad en opsparing kan vokse til med renters rente, afkast og omkostninger – et regneeksempel, ikke en prognose.
- **Forside, analyser, portefølje, markedet:** live kurser fra Yahoo Finance (gratis, ingen nøgle), grafer med TradingView Lightweight Charts. Forsiden har amerikanske aktier som hovedmarked – det kan skiftes til Danmark i admin.
- **Undervisningstilstand (standard):** cases uden kursmål, stop, setup-retning og "kursudvikling siden analysen". Admin har et sprogtjek, der markerer formuleringer, som lyder som køb/salg.
- **Portefølje med forsinkelse:** dine egne handler eller en **modelportefølje** med tænkte handler. Nye køb og salg vises først efter 30 dage (kan ændres), så porteføljen er gennemsigtighed – ikke handelssignaler.
- **AI-assistent:** Claude via Anthropics API, låst til undervisning – giver aldrig køb/salg-råd eller personlig rådgivning.
- **Handelsbetingelser og privatlivspolitik** bygges automatisk ud fra dine oplysninger i admin.

---

## 1. Læg den nye version op på GitHub

Siden bygges af Vercel fra dit repo `fatihyuk92-a11y/.github.io`.

1. Pak zip-filen ud.
2. Gå til repoet på github.com → **Add file → Upload files**.
3. Træk **mapperne** `api`, `public`, `scripts`, `src` og **filerne** `package.json`, `package-lock.json`, `vercel.json`, `README.md` ind i feltet. Træk selve mapperne – ikke filerne inde i dem – så mappestrukturen bevares.
4. Skriv fx "Kurser og beregner" og tryk **Commit changes**.
5. **Kurserne:** Åbn mappen `_data` i repoet, vælg **Add file → Upload files**, og træk mappen `kurser` (fra `_data` i zip-filen) ind. Tryk **Commit changes**.

**Vigtigt om `_data`:** Mappen indeholder også dine indstillinger og din portefølje. Upload derfor **ikke** hele `_data` igen, hvis du har rettet noget i admin – så overskriver du dine ændringer. Den eneste anden ændring i `_data` i denne version er teksterne til medlemskaberne i `settings.json`. Ret dem i stedet selv under **Indstillinger → Priser** (se afsnit 4). Har du slet ikke brugt admin endnu, kan du uploade hele `_data`.

De gamle filer fra den første version (`index.html`, `assets/`, `admin/config.yml`, `analyser/` m.fl. i roden) bruges ikke længere og kan slettes, når du har tid.

## 2. Indstillinger i Vercel

Under **Settings → Environment Variables** i Vercel-projektet:

| Navn | Værdi | Status |
| --- | --- | --- |
| `OAUTH_GITHUB_CLIENT_ID` | fra din GitHub OAuth-app | findes allerede – behold |
| `OAUTH_GITHUB_CLIENT_SECRET` | fra din GitHub OAuth-app | findes allerede – behold |
| `ANTHROPIC_API_KEY` | din nøgle fra console.anthropic.com | kræves til AI-assistenten |
| `AI_MODEL` | fx `claude-sonnet-5-5` | valgfri (standard er `claude-haiku-5-5`, billigst) |
| `SITE_URL` | fx `https://aktiekompas.dk` | valgfri – kun når du får eget domæne |
| `DEPLOY_HOOK_URL` | adressen på en Deploy Hook (se nedenfor) | valgfri – daglig opdatering |
| `CRON_SECRET` | en tilfældig tekst på mindst 16 tegn | valgfri – daglig opdatering |

**Daglig opdatering (anbefales):** Porteføljen vises med forsinkelse. Siden bygges normalt kun, når du gemmer i admin, så en handel ville først dukke op næste gang, du gemmer noget. Med to variabler bygger siden sig selv hver nat:

1. I Vercel: **Settings → Git → Deploy Hooks**. Skriv navnet `daglig`, branch `main`, og tryk **Create Hook**. Kopiér adressen.
2. Opret `DEPLOY_HOOK_URL` med adressen og `CRON_SECRET` med en tilfældig tekst (fx fra en adgangskodegenerator).
3. Tryk **Redeploy**. Vercel kalder nu `/api/rebuild` én gang i døgnet (på Hobby-planen et tidspunkt mellem kl. 5 og 6 dansk vintertid) og sender `CRON_SECRET` med, så ingen andre kan starte bygninger.

GitHub OAuth-appen skal stadig have callback-adressen `https://github-io-lemon.vercel.app/api/callback`. Får du et nyt domæne, skal adressen rettes i OAuth-appen på GitHub.

Byggeindstillingerne (build-kommando og output-mappe `dist`) ligger i `vercel.json` og overstyrer indstillingerne i Vercel. Tryk **Redeploy**, efter du har tilføjet variabler.

## 3. Tjek at alt virker

- `/` – forsiden med kursbjælke og markedskompas.
- `/kurser/` – kursusoversigten. Første modul i hvert kursus kan læses af alle.
- `/beregner/` – opsparingsberegneren.
- `/handelsbetingelser/` og `/privatliv/` – bygges ud fra dine oplysninger.
- `/api/health` – viser `"quotes": { "ok": true }`, hvis kurserne kan hentes, `"ai": true`, hvis AI-nøglen er sat, og `"rebuild": true`, hvis den daglige opdatering er sat op.
- `/admin/` – log ind med GitHub. Overblikket viser et systemtjek og eventuelle advarsler.

## 4. Første gang i admin

1. **Indstillinger → Generelt → Afsender:** dit navn og din titel (fx "Privatinvestor og skribent") samt **firmanavn, CVR, adresse og e-mail**. De skal stå på siden, når du sælger online, og de bruges i handelsbetingelserne og privatlivspolitikken.
2. **Indstillinger → Generelt → Indhold og regler:** lad indholdstypen stå på **Undervisning (anbefalet)**.
3. **Indstillinger → Generelt → Portefølje:** vælg **porteføljetype** – "Mine egne handler" eller "Modelportefølje (tænkte handler)". Den står på modelportefølje fra start. Vælg også, om porteføljen vises, og hvor mange dages forsinkelse nye handler har (standard 30).
4. **Hovedmarked:** USA eller Danmark – styrer markedskompasset og heatmappet på forsiden.
5. **Slet eksemplerne**, når du er klar: cases og positioner mærket "Eksempel" viser kun opbygningen. Slet også testanalysen **"tessst: testt"** fra den gamle editor (Analyser → klik på den → Slet).
6. **Indstillinger → Priser:** indsæt dine betalingslinks (fx Stripe Payment Links). Tomt link = knappen åbner en e-mail til dig. Teksterne er sat op sådan: **Introduktion** = Begynderkurset med livstidsadgang, **Plus** = Begynderkurset + arkivet, **Premium** = begge kurser + spørgetimer og fællesskab. Ret dem, så de passer til det, du vil sælge.
7. **Kurser:** læs lektionerne igennem – især skattelektionerne – og ret det, du vil sige anderledes. Under hvert kursus vælger du, hvilke medlemskaber det indgår i.

## 5. Sådan bruger du admin

**Ny investering** (Portefølje → Ny investering)
1. Søg efter aktien, fx "Novo" eller "AAPL". Navn, valuta, sektor og dagens kurs udfyldes.
2. Ret købsdato, købskurs og vægt, og skriv evt. en kort, faktuel kommentar (fx "Købt efter regnskabet for 3. kvartal").
3. Tryk **Gem investering**. Afkastet beregnes automatisk.

**Modelportefølje:** Står porteføljen som modelportefølje, hedder det "Ny handel", og siden skriver tydeligt alle steder, at handlerne er tænkte og ikke foretaget med rigtige penge. Registrér hver handel med dagens dato og kurs. Admin spørger, før den gemmer, hvis datoen ikke er i dag, hvis kursen afviger mere end 2 % fra den aktuelle, eller hvis du retter i en handel, der allerede er registreret.

Nye handler får mærket **"Vises fra …"** og kommer først på siden, når forsinkelsen er udløbet. Sælger du en ældre position, står den som åben på siden, indtil salget må vises. **Luk position** flytter den til "Lukkede handler" med det realiserede afkast. "Kun medlemmer" skjuler navn og kurser for andre end medlemmer.

**Ny case** (Analyser → Ny analyse)
- Søg aktien frem, skriv titel og ledetekst, og vælg type. Kursen ved udgivelsen udfyldes automatisk.
- Skabelonen guider dig: hvad chartet viser, den fundamentale case, risici og hvad læseren kan lære. Brug H2-overskrifter – de bliver til indholdsfortegnelsen. Grafer og skærmbilleder kan indsættes med Ctrl+V eller trækkes ind.
- **Sprogtjekket** under teksten markerer ord som "køb", "kursmål", "stop under", "er undervurderet" og "kursen vil stige". Udgiver du alligevel, spørger admin først, og advarslen vises også i Overblik.
- **Gem kladde** gemmer uden at udgive. **Gem og udgiv** lægger casen på siden. Ctrl+S gemmer.
- "Premium" viser intro og første afsnit for alle – resten er låst.

**Kurser** (Kurser → vælg et kursus)
- Kursets side viser modulerne og lektionerne. Klik på en lektion for at redigere den, brug pilene til at flytte den op eller ned i modulet, og **Ny lektion** for at skrive en ny.
- En lektion har titel, modul, rækkefølge og en tekst i samme editor som casene. Brug H2-overskrifter, og slut gerne med "Det vigtigste" i punktform.
- **Gratis lektion** kan læses af alle. Andre lektioner viser kun indledningen og første afsnit (alt frem til anden H2-overskrift) – skriv derfor en indledning, der kan stå alene.
- **Gem kladde** gemmer uden at udgive. **Gør til kladde** fjerner en udgivet lektion fra siden. **Slet** fjerner den helt.
- Under **Kursets oplysninger** retter du navn, beskrivelse, "Kurset er for dig, hvis …", hvilke medlemskaber kurset indgår i og **"Tal og satser er fra"**. Når et nyt år starter, viser Overblik en påmindelse om at gennemgå skattelektionerne og rette årstallet.
- Under **Moduler** retter du titler og beskrivelser og tilføjer nye moduler. Et modul uden lektioner vises som "Lektionerne kommer snart".

## 6. Kurser, medlemskab og ophavsret

**Låste lektioner:** Siden har endnu ikke medlemslogin. Lektioner uden for første modul viser derfor kun starten og en knap til medlemskaberne – resten af teksten ligger ikke på siden. For at kunne levere hele kurset til betalende medlemmer skal der et medlemslogin til (fx login med e-mail, koblet til betalingen), der låser lektionerne op. Indtil da kan du vælge **Indstillinger → Generelt → Premium-indhold → Vis alt for alle**, så alle kan læse hele kurset (og premium-analyserne) – eller sende teksterne til køberne på anden vis.

**Ophavsret:** Kursernes tekster er skrevet til Aktiekompas. De følger en almindelig opbygning for et investeringskursus (privatøkonomi, strategi, aktier, handel, analyse, skat og krypto), men er ikke kopieret fra andre kurser. Kopiér ikke tekster, billeder eller videoer fra andre sider eller kurser ind i lektionerne – brug dem kun som inspiration til emner.

**Tal og satser:** Skattesatser, grænser og lofter i lektionerne er for 2026 (fx aktieindkomst 27/42 % med grænsen 79.400 kr., aktiesparekonto 17 % med loftet 174.200 kr.). De ændrer sig hvert år, og reglerne for krypto er under forandring. Tjek tallene på skat.dk, før du udgiver nye kurser, og ret dem hvert år.

**Undervisning, ikke rådgivning:** Lektionerne er generelle og ens for alle. Eksemplerne bruger et opdigtet selskab ("Nordisk Cykel A/S") og opdigtede personer, og der nævnes ingen aktier, der "bør" købes. Hold fast i det, når du skriver nye lektioner – og giv ikke personlige råd i spørgetimerne (se afsnit 7).

## 7. Juridisk – sådan holder siden sig uden for finansiel rådgivning

Der er to regelsæt, og siden er sat op til at holde sig fri af begge:

1. **Investeringsrådgivning kræver tilladelse fra Finanstilsynet.** Rådgivning er *personlige* anbefalinger – råd, der er tilpasset den enkeltes økonomi eller præsenteres som egnede for vedkommende. Generelt indhold, som er det samme for alle, er ikke personlig rådgivning. Derfor: ingen en-til-en-sparring om medlemmernes penge, ingen porteføljepleje, og AI-assistenten afviser personlige spørgsmål.
2. **Reglerne for investeringsanbefalinger (markedsmisbrugsforordningen) gælder alle** – også privatpersoner, også bag betalingsmur. Finanstilsynet skriver, at man ikke kan komme uden om dem ved at skrive, at en anbefaling ikke er en opfordring til handel. En ansvarsfraskrivelse alene er altså ikke nok. ESMA skriver, at undervisning bør bruge historiske data og tidligere eksempler og undgå at anbefale en strategi eller give en vurdering af den nuværende eller fremtidige kurs. Det er præcis, hvad undervisningstilstanden gør.

**Det er bygget ind:** undervisningstilstand uden kursmål, stop og retning · sprogtjek i admin og ved hver bygning · generelle kurser med opdigtede eksempler · porteføljen med forsinkelse · ansvarsfraskrivelse på alle sider · oplysning om dine egne positioner i hver case · handelsbetingelser og privatlivspolitik · en AI-assistent, der ikke må anbefale noget.

**Det skal du selv holde fast i:**
- Skriv om, hvad der er sket, og hvordan metoden bruges – aldrig om, hvad læseren skal gøre.
- Ingen kursmål, stop, "køb nu", "aktien er billig/undervurderet" eller "kursen vil stige" – heller ikke i nyhedsbreve, opslag, Telegram- og Facebook-grupper.
- Fortæl aldrig om en handel, før den er sket. Et annonceret køb kan i sig selv være en anbefaling.
- Svar aldrig på "hvad skal jeg gøre med mine penge/min aktie?" – heller ikke i spørgetimer, mails eller beskeder. Forklar metoden generelt, og henvis til en autoriseret rådgiver.
- Lov aldrig afkast. Vis kun faktiske historiske tal, og skriv at historiske afkast ingen garanti er.
- Oplys altid, om du ejer aktier i det selskab, du skriver om (feltet findes i admin).
- Er handlerne tænkte, skal porteføljen hedde modelportefølje. Skriv aldrig "mine egne køb" om handler, du ikke har foretaget – det er vildledende markedsføring, og du skal kunne dokumentere det, du skriver (markedsføringsloven §§ 5 og 13). Byggeren advarer, hvis teksterne under Indstillinger ikke passer til porteføljetypen.
- Hold modelporteføljen adskilt fra dine egne aktier. "Forfatterens position" i en case handler altid om det, du faktisk ejer.
- Moderér grupperne: slet opslag med køb/salg-opfordringer, rygter eller intern viden.
- Skifter du indholdstypen til "Analyser med kursmål", er indholdet investeringsanbefalinger, og du skal opfylde kravene i hver analyse.

**Betaling og fortrydelsesret:** Som forbruger har kunden 14 dages fortrydelsesret. Ved digitalt indhold bortfalder den kun, hvis kunden udtrykkeligt har accepteret, at adgangen begynder med det samme, og anerkendt, at fortrydelsesretten dermed bortfalder. Brug en betalingsløsning, hvor kunden skal sætte flueben ved netop det og acceptere dine handelsbetingelser – eller giv i stedet en pengene-tilbage-garanti.

Få en advokat med kendskab til finansiel regulering og forbrugerret til at gennemgå opsætningen, handelsbetingelserne og privatlivspolitikken, før du tager betaling. Dette er ikke juridisk rådgivning.

- Finanstilsynet om investeringsanbefalinger: https://www.finanstilsynet.dk/finansielle-temaer/kapitalmarked/markedsmisbrugsforordningen/investeringsanbefalinger
- Finanstilsynets guide til opslag på sociale medier: https://cdn.finanstilsynet.dk/finanstilsynet/Media/638470587761874611/Guide_investeringsanbefaling.pdf
- ESMA om sociale medier og investeringsanbefalinger: https://www.esma.europa.eu/sites/default/files/2024-02/ESMA74-1103241886-912_Warnings_on_Social_Media_and_Investment_Recommendations.pdf
- Tilladelse som investeringsrådgiver (virk.dk): https://www.virk.dk/myndigheder/stat/FT/selvbetjening/Investeringsraadgiver_-_Ansoegning_om_tilladelse/

## 8. Gør repoet privat

Repoet er offentligt, så alle kan læse premium-tekster, de låste lektioner og skjulte positioner direkte på GitHub – og se handler, før forsinkelsen er udløbet. Gør det privat under **Settings → General → Danger Zone → Change visibility** på GitHub. Vercel og admin virker som før.

## 9. Kursdata

Kurserne hentes fra Yahoo Finance via sidens egne funktioner i `/api` og caches 1–5 minutter på Vercel, så siden er hurtig og ikke rammer Yahoo for hver besøgende. Kurserne kan være op til 15 minutter forsinkede.

Yahoos adgang er gratis, men uofficiel og uden garanti. Hvis den driller, viser siden "–" i stedet for kurser, og grafer skifter automatisk til TradingViews gratis widget. Når siden tjener penge, så overvej en betalt dataudbyder, der tillader visning på en hjemmeside.

## 10. Lokal udvikling (valgfrit)

```bash
npm install
npm run build        # bygger siden til dist/
npm run dev          # http://localhost:4321 med opdigtede kurser (virker uden internet)
node scripts/dev-server.js   # med rigtige kurser
```

## Filer

```
_data/analyser/*.md     cases og analyser (skrives af admin)
_data/kurser/kurser.json            kurserne: navn, moduler, adgang og årstal for satserne (skrives af admin)
_data/kurser/<kursus>/*.md          lektionerne – én fil pr. lektion (skrives af admin)
_data/portefolje.json   porteføljen (skrives af admin)
_data/settings.json     tekster, priser, kurslister og regler (skrives af admin)
api/                    serverfunktioner: kurser, søgning, AI-chat, GitHub-login og daglig opdatering
public/                 CSS, JavaScript, billeder og admin (public/admin/lint.js er sprogtjekket)
src/                    byggeren, der laver HTML-siderne (src/pages/kurser.js: kurserne, src/pages/legal.js: handelsbetingelser og privatliv)
vercel.json             byggeindstillinger, sikkerhedsheadere og den daglige opdatering
```
