# Aktiekompas

Tekniske og fundamentale aktieanalyser for den selvbestemmende investor.

## 📁 Struktur

```
.
├── index.html              → forsiden /
├── analyser/
│   ├── index.html          → analyseoversigt /analyser/
│   ├── _skabelon/          → SKABELON til nye analyser (kopier denne!)
│   ├── vestas-vinden-vender/
│   ├── tesla-kanalbrudd-nedad/
│   └── genmab-pipeline-undervurderes/
├── ai-assistent/index.html → /ai-assistent/
├── metode/index.html       → /metode/
├── om/index.html           → /om/
├── medlemskab/index.html   → /medlemskab/
├── vigtigt/index.html      → /vigtigt/
├── faq/index.html          → /faq/
├── 404.html                → fallback for ukendte URLs
└── assets/
    ├── style.css           → delt CSS
    └── script.js           → delt JS (nav, FAQ, AI-chat)
```

## ✏️ Sådan laver du en ny analyse

### Trin 1: Kopier skabelonen

Kopier hele mappen `analyser/_skabelon/` og giv den et nyt navn baseret på aktien og emnet.

**Eksempler på gode mappenavne** (brug bindestreger, ikke mellemrum):
- `novo-nordisk-wegovy-volumen`
- `maersk-head-shoulders`
- `rheinmetall-skalering-vinder`

URL'en bliver så `https://dit-domæne.dk/analyser/novo-nordisk-wegovy-volumen/`

### Trin 2: Udfyld teksten

Åbn `analyser/[din-mappe]/index.html` i en teksteditor. Find alle steder med `[SKRIV: ...]` og udskift dem med dit eget indhold.

**Tip:** Brug **Ctrl+F** ("Find") i editoren til at finde alle `[SKRIV:`-steder.

### Trin 3: Beslut om analysen skal være låst

Hver analyse har en "paywall"-blok i koden. Find sektionen markeret med:

```html
<!-- ═══ PAYWALL — kun for Premium-analyser ═══ -->
```

- **Gratis analyse:** Slet hele blokken `<div class="paywall">...</div>`
- **Premium analyse:** Behold den. Skriv kun en kort gratis intro før, og resten kommer som "teaser"

### Trin 4: Tilføj analysen til oversigten

Åbn `analyser/index.html` og kopier et af de eksisterende `<article class="ana-card">`-kort. Skift:

- `href="..."` til din nye URL
- Tags, titel, og excerpt
- `data-cat="..."` til den rigtige kategori (teknisk / fundamental / makro / dansk / internationalt)

### Trin 5: Commit og push

I GitHub Desktop: skriv en commit-besked og klik "Commit to main" → "Push origin".

Vercel opdaterer automatisk inden for 1-2 minutter.

## 🎨 Tekst-formatering

Inde i analysens HTML kan du bruge:

| Markering | Resultat |
|---|---|
| `<b>vigtig tekst</b>` | Guldfarvet fed tekst |
| `<em>kursiv</em>` i overskrifter | Guldfarvet kursiv |
| `<h2>Overskrift</h2>` | Stor overskrift |
| `<h3>Underoverskrift</h3>` | Mindre overskrift |
| `<ul><li>punkt</li></ul>` | Punktliste med pile |
| `<ol><li>punkt</li></ol>` | Nummereret liste |
| `<blockquote>citat</blockquote>` | Fremhævet citat |

## 🚀 Deploy

Siden hostes på Vercel. Når du pusher til main-branchen på GitHub, opdaterer Vercel automatisk.

## 🤖 AI-assistent

AI-chatten kører i demo-tilstand indtil du opretter en backend-endpoint på Vercel.
Konfigurer den i `assets/script.js`:

```js
window.AKTIEKOMPAS_CHAT_API = '/api/chat';
```

## ⚠️ Vigtigt om medlemskaber

**OBS:** Den nuværende paywall-effekt er kun **visuel** — den blurrer indholdet men beskytter det ikke teknisk. En bruger kan se hele indholdet ved at åbne "View Source" i browseren.

For ægte medlemskabs-beskyttelse skal du bruge en platform som:
- **Memberstack** (kan integreres i HTML)
- **Outseta** (komplet medlemskab + Stripe)
- **Ghost** (skift hele platformen)

Indtil da, hold reelt "premium-only" indhold ude af HTML-filerne.

## 📜 Juridisk

Aktiekompas er en uddannelses- og analyseplatform, **ikke** finansiel rådgivning. Se `/vigtigt/` for den fulde ansvarsfraskrivelse.

---

© 2026 Aktiekompas
