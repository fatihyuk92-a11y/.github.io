# Aktiekompas

Tekniske og fundamentale aktieanalyser for den selvbestemmende investor.

## Struktur

```
.
├── index.html              → /
├── analyser/index.html     → /analyser/
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

## Lokal udvikling

Du kan ikke bare dobbeltklikke `index.html` — de absolutte stier (`/analyser/`, `/assets/style.css`) virker kun fra en webserver-rod.

**Den nemmeste måde at se siden lokalt:**

```bash
# Python (forudinstalleret på Mac/Linux)
cd aktiekompas-site
python3 -m http.server 8000

# Eller med Node
npx serve
```

Åbn så `http://localhost:8000` i din browser.

## Deploy til GitHub Pages

1. **Opret nyt repository** på [github.com](https://github.com) — fx `aktiekompas`
2. **Upload alle filer og mapper** i dette repo (drag &amp; drop på GitHub.com fungerer fint)
3. **Aktiver Pages**: Settings → Pages → Source: `main` branch, folder: `/ (root)` → Save
4. Vent 1-2 minutter. Din side er live på `https://<dit-brugernavn>.github.io/aktiekompas/`

> **Note:** Hvis du deployer i en undermappe (fx `aktiekompas.github.io/aktiekompas/`), skal de absolutte stier i HTML-filerne ændres fra `/analyser/` til `/aktiekompas/analyser/` osv. Den nemmeste løsning er at bruge et brugerdefineret domæne — så virker `/`-stierne direkte.

## Brugerdefineret domæne

Når du har et domæne (fx `aktiekompas.dk`):

1. Tilføj en fil ved navn `CNAME` (uden filendelse) til repo'et med kun indholdet:
   ```
   aktiekompas.dk
   ```
2. Hos din DNS-udbyder peg domænet mod GitHub Pages:
   - A-records mod: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Eller CNAME for `www` mod `<dit-brugernavn>.github.io`

## AI-assistent

AI-chatten kører i **demo-tilstand** indtil du opretter en backend-endpoint. Du kan ikke kalde Anthropic's API direkte fra browseren — så ville din API-nøgle være offentligt eksponeret.

**Anbefalet:** Opret en serverless function på Vercel eller Cloudflare Workers.

Når endpoint'en er klar, sæt den i `assets/script.js`:
```js
window.AKTIEKOMPAS_CHAT_API = '/api/chat'; // eller fuld URL
```

## Juridisk

Aktiekompas er en uddannelses- og analyseplatform, **ikke** finansiel rådgivning. Se `/vigtigt/` for den fulde ansvarsfraskrivelse.

---

© 2026 Aktiekompas
