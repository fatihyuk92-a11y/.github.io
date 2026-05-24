# Aktiekompas

Tekniske og fundamentale aktieanalyser med integreret admin-dashboard (Decap CMS).

---

## 🚀 Sådan kommer du i gang med admin-dashboardet

For at få `/admin/`-dashboardet til at virke skal du sætte tre ting op (engangs-arbejde, ca. 20 minutter):

### Trin 1 — Opret en GitHub OAuth-app

1. Gå til [github.com/settings/developers](https://github.com/settings/developers)
2. Klik **"OAuth Apps" → "New OAuth App"**
3. Udfyld:
   - **Application name:** `Aktiekompas CMS`
   - **Homepage URL:** `https://github-io-lemon.vercel.app` (eller dit Vercel-domæne)
   - **Authorization callback URL:** `https://github-io-lemon.vercel.app/api/callback`
4. Klik **"Register application"**
5. Notér **Client ID** ned
6. Klik **"Generate a new client secret"** → notér også den ned

### Trin 2 — Tilføj OAuth-credentials til Vercel

1. Gå til [vercel.com](https://vercel.com) og åbn dit projekt
2. **Settings → Environment Variables**
3. Tilføj to nye:
   - `OAUTH_GITHUB_CLIENT_ID` = (Client ID fra Trin 1)
   - `OAUTH_GITHUB_CLIENT_SECRET` = (Client secret fra Trin 1)
4. Vælg "Production" som scope
5. Klik **Save**

### Trin 3 — Opdater `admin/config.yml` med dit repo-navn

Åbn `admin/config.yml` i en editor. Find linjen:

```yaml
repo: fatihyuk92-a11y/fatihyuk92-a11y.github.io
base_url: https://github-io-lemon.vercel.app
```

Ret begge til at matche dit faktiske GitHub-repo og Vercel-domæne (de er allerede sat for dig).

### Trin 4 — Push til GitHub og vent på Vercel-deploy

Vercel deployer automatisk. Når det er færdigt:

1. Gå til `https://github-io-lemon.vercel.app/admin/`
2. Klik **"Login with GitHub"**
3. Godkend appen
4. Du er inde i CMS'et! 🎉

---

## ✍️ Sådan opretter du en ny analyse

1. Gå til `/admin/`
2. Klik **"📊 Analyser" → "New Analyser"**
3. Udfyld felterne:
   - **Titel** — kort beskrivende titel (uden aktiens navn)
   - **Slug** — URL-stien (auto-genereres, fx `novo-wegovy-volumen`)
   - **Aktie/Selskab** — fx "Novo Nordisk"
   - **Dato** — analysens publikationsdato
   - **Setup-type** — Bullish/Bearish/Neutral
   - **Analyse-type** — Teknisk og/eller Fundamental og/eller Makro
   - **Tier** — Gratis eller Premium (Premium vises som låst)
   - **Ledetekst** — 60-100 ord intro
   - **Nøgleniveauer** — kurs, mål, stop, R/R
   - **Sidebar-fakta** — ticker, market cap, P/E osv.
   - **Selve analysen** — skriv i editor'en (samme som Word)
   - **Position-oplysning** — angiv om du ejer aktien
4. Klik **"Save"** for kladde, eller **"Publish"** for at gå live

Når du klikker Publish:
- Decap CMS committer en ny `.md`-fil til GitHub
- Vercel detekterer ændringen og rebuilder siden
- Build-scriptet konverterer markdown → HTML med dit design
- Analysen er live på `/analyser/<slug>/` indenfor ~60 sekunder

---

## 📁 Struktur

```
.
├── admin/                   → CMS dashboard (Decap)
│   ├── index.html
│   └── config.yml          → CMS-felter defineres her
├── api/                     → Vercel serverless functions
│   ├── auth.js              → GitHub OAuth start
│   └── callback.js          → GitHub OAuth callback
├── _data/
│   └── analyser/            → Markdown-filer (én pr. analyse)
│       ├── vestas-vinden-vender.md
│       ├── tesla-kanalbrudd-nedad.md
│       └── genmab-pipeline-undervurderes.md
├── _templates/
│   └── analyse.html         → HTML-skabelon med placeholders
├── scripts/
│   └── build-analyses.js    → Konverterer markdown → HTML
├── analyser/                → AUTO-GENERERET — rør ikke!
│   ├── index.html           → Listing page
│   ├── vestas-vinden-vender/
│   ├── tesla-kanalbrudd-nedad/
│   └── genmab-pipeline-undervurderes/
├── assets/
│   ├── style.css
│   ├── script.js
│   └── uploads/             → Decap gemmer billeder her
├── (alle andre sider: index, om, faq, osv.)
├── package.json
└── vercel.json              → Fortæller Vercel hvordan den bygger
```

---

## 🛠️ Lokal udvikling

```bash
# Installer dependencies
npm install

# Byg analyserne lokalt
npm run build

# Start en lokal server
python3 -m http.server 8000
# eller
npx serve
```

Åbn `http://localhost:8000` i din browser.

---

## ⚠️ Vigtigt om filerne i `analyser/`

Mapperne under `analyser/` er **auto-genererede** af build-scriptet. Hvis du redigerer dem manuelt, bliver dine ændringer overskrevet næste gang Vercel deployer.

Den eneste fil i `analyser/` du selv kan redigere er listing-siden (`analyser/index.html`) — men kun delene **uden for** `<div class="analyses-flat">`. Selve kortene genereres automatisk.

**Alle analyser redigeres via /admin/ eller direkte i `_data/analyser/*.md`.**

---

## 💰 Vil du tilføje medlemskab/betaling?

Næste skridt (ikke inkluderet):
- Stripe-integration for abonnement
- Login-system så Premium-analyser kun er tilgængelige for medlemmer
- Email-newsletter til medlemmer

Sig til hvis du vil have hjælp til disse.

---

## 📧 Spørgsmål

Skriv til hej@aktiekompas.dk (sæt en ægte email op via fx Google Workspace eller ProtonMail).
