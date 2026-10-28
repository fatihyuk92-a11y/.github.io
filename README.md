# Aktiekompas

Dansk aktiesite med tekniske og fundamentale analyser, en åben portefølje med live kurser, et marked-overblik, en AI-assistent og medlemskaber. Alt indhold redigeres i **admin** på `/admin/` – du skal aldrig røre koden for at tilføje en analyse eller en investering.

- **Forside, analyser, portefølje, markedet:** live kurser fra Yahoo Finance (gratis, ingen nøgle), grafer med TradingView Lightweight Charts. Forsiden har amerikanske aktier som hovedmarked (25 store selskaber) – det kan skiftes til Danmark i admin.
- **AI-assistent:** Claude via Anthropics API, låst til undervisning – giver aldrig køb/salg-råd.
- **Admin:** log ind med GitHub, opret analyser og investeringer, luk positioner, ret priser og kurslister. Siden opdaterer sig selv ca. 1 minut efter, at du har gemt.

---

## 1. Læg den nye version op på GitHub

Siden bygges af Vercel fra dit repo `fatihyuk92-a11y/.github.io`.

1. Pak zip-filen ud.
2. Gå til repoet på github.com → **Add file → Upload files**.
3. Træk **mapperne** `_data`, `api`, `public`, `scripts`, `src` og **filerne** `package.json`, `package-lock.json`, `vercel.json`, `README.md` ind i feltet. Træk selve mapperne – ikke filerne inde i dem – så mappestrukturen bevares.
4. Skriv fx "Ny version" og tryk **Commit changes**.

De gamle filer fra den tidligere version (`index.html`, `assets/`, `admin/config.yml`, `analyser/` m.fl. i roden) bliver ikke længere brugt og kan ligge, til du har tid til at slette dem. Den nye side bygges kun fra mapperne ovenfor.

## 2. Indstillinger i Vercel

Under **Settings → Environment Variables** i Vercel-projektet:

| Navn | Værdi | Status |
| --- | --- | --- |
| `OAUTH_GITHUB_CLIENT_ID` | fra din GitHub OAuth-app | findes allerede – behold |
| `OAUTH_GITHUB_CLIENT_SECRET` | fra din GitHub OAuth-app | findes allerede – behold |
| `ANTHROPIC_API_KEY` | din nøgle fra console.anthropic.com | **ny** – kræves til AI-assistenten |
| `AI_MODEL` | fx `claude-sonnet-5-5` | valgfri (standard er `claude-haiku-5-5`, billigst) |
| `SITE_URL` | fx `https://aktiekompas.dk` | valgfri – kun når du får eget domæne |

GitHub OAuth-appen skal stadig have callback-adressen `https://github-io-lemon.vercel.app/api/callback` (samme som før). Får du et nyt domæne, skal adressen rettes i OAuth-appen på GitHub.

Byggeindstillingerne (build-kommando og output-mappe `dist`) ligger i `vercel.json` og overstyrer indstillingerne i Vercel. Tryk **Redeploy**, efter du har tilføjet nøglen.

## 3. Tjek at alt virker

- `/` – den nye forside med kursbjælke og markedskompas.
- `/api/health` – viser `"quotes": { "ok": true }`, hvis kurserne kan hentes, og `"ai": true`, hvis AI-nøglen er sat.
- `/admin/` – log ind med GitHub. Overblikket viser et systemtjek.

## 4. Første gang i admin

1. **Indstillinger → Generelt:** skriv dit navn og din titel (fx "Privatinvestor og skribent"). Det vises på alle analyser. Her vælger du også **hovedmarkedet** (USA eller Danmark), som styrer markedskompasset og heatmappet på forsiden.
2. **Slet eksemplerne**, når du er klar: analyser og positioner mærket "Eksempel" er kun til at vise opbygningen.
3. **Slet testanalysen "tessst: testt"**, som ligger i repoet fra den gamle editor: Analyser → klik på den → Slet.
4. **Indstillinger → Priser:** indsæt dine betalingslinks (fx Stripe Payment Links). Tomt link = knappen åbner en e-mail til dig.

## 5. Sådan bruger du admin

**Ny investering** (Portefølje → Ny investering)
1. Søg efter aktien, fx "Novo" eller "AAPL". Navn, valuta, sektor og dagens kurs udfyldes.
2. Ret købsdato, købskurs og vægt, og skriv evt. en kommentar.
3. Tryk **Gem investering**. Afkastet beregnes automatisk på siden.

Når du sælger: tryk **Luk position** ud for aktien, og skriv salgskursen. Positionen flyttes til "Lukkede handler" med det realiserede afkast. "Kun medlemmer" skjuler navn og kurser på den offentlige side.

**Ny analyse** (Analyser → Ny analyse)
- Søg aktien frem, skriv titel og ledetekst, vælg setup og type, og udfyld kurs, kursmål og stop.
- Skriv teksten med værktøjslinjen. Brug H2-overskrifter – de bliver til indholdsfortegnelsen. Grafer og skærmbilleder kan indsættes med Ctrl+V eller trækkes ind i feltet.
- **Gem kladde** gemmer uden at udgive. **Gem og udgiv** lægger analysen på siden. Ctrl+S gemmer.
- "Premium" viser intro og første afsnit for alle – resten er låst.

## 6. Juridisk – vigtigt

Siden har ansvarsfraskrivelse på alle sider, men **Finanstilsynet skriver, at man ikke kan komme uden om reglerne for investeringsanbefalinger ved at skrive, at en anbefaling ikke er en opfordring til handel**. Analyser med kursmål på et investeringssite kan være omfattet – også når de kræver medlemskab.

Derfor viser hver analyse nu de oplysninger, Finanstilsynet nævner som generelle krav: afsenderens navn og titel, dato og klokkeslæt for færdiggørelse, kursmål markeret som prognoser med forudsætninger, kilder, egne positioner og om selskabet har set analysen. Udfyld felterne i admin – de er lavet til det.

Hvis du gentagne gange giver direkte anbefalinger og fremstår som ekspert, kan der gælde yderligere krav (bl.a. en liste over dine anbefalinger de seneste 12 måneder). Få en advokat med kendskab til finansiel regulering til at gennemgå opsætningen, før du tager betaling. Jeg er ikke advokat, og dette er ikke juridisk rådgivning.

- Finanstilsynet om investeringsanbefalinger: https://www.finanstilsynet.dk/finansielle-temaer/kapitalmarked/markedsmisbrugsforordningen/investeringsanbefalinger
- Finanstilsynets guide til opslag på sociale medier: https://cdn.finanstilsynet.dk/finanstilsynet/Media/638470587761874611/Guide_investeringsanbefaling.pdf

## 7. Gør repoet privat

Repoet er offentligt, så alle kan læse premium-analyser og skjulte positioner direkte på GitHub. Gør det privat under **Settings → General → Danger Zone → Change visibility** på GitHub. Vercel og admin virker som før.

## 8. Kursdata

Kurserne hentes fra Yahoo Finance via sidens egne funktioner i `/api` og caches 1–5 minutter på Vercel, så siden er hurtig og ikke rammer Yahoo for hver besøgende. Kurserne kan være op til 15 minutter forsinkede.

Yahoos adgang er gratis, men uofficiel og uden garanti. Hvis den driller, viser siden "–" i stedet for kurser, og analysegrafer skifter automatisk til TradingViews gratis widget. Når siden tjener penge, så overvej en betalt dataudbyder, der tillader visning på en hjemmeside.

## 9. Lokal udvikling (valgfrit)

```bash
npm install
npm run build        # bygger siden til dist/
npm run dev          # http://localhost:4321 med opdigtede kurser (virker uden internet)
node scripts/dev-server.js   # med rigtige kurser
```

## Filer

```
_data/analyser/*.md     analyserne (skrives af admin)
_data/portefolje.json   porteføljen (skrives af admin)
_data/settings.json     tekster, priser og kurslister (skrives af admin)
api/                    serverfunktioner: kurser, søgning, AI-chat og GitHub-login
public/                 CSS, JavaScript, admin og uploadede billeder
src/                    byggeren, der laver HTML-siderne
vercel.json             byggeindstillinger og sikkerhedsheadere
```
