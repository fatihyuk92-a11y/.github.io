// Bygger hele sitet til dist/. Køres af Vercel (npm run build) ved hvert commit.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSettings, loadAnalyses, loadPortfolio, delayPortfolio, loadCourses, warnings, warn, ROOT } = require('./lib/data');
const { checkLanguage } = require('./lib/lint');
const { toString } = require('./lib/util');

const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const NM = path.join(ROOT, 'node_modules');

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  mkdirp(dest);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function write(rel, content) {
  const file = path.join(DIST, rel);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, content);
}
function copyFrom(modPath, destRel) {
  const src = path.join(NM, modPath);
  if (!fs.existsSync(src)) throw new Error(`Mangler ${modPath} – kør npm install`);
  mkdirp(path.dirname(path.join(DIST, destRel)));
  fs.copyFileSync(src, path.join(DIST, destRel));
}

function siteUrl() {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  return '';
}

function adminRepo() {
  // ADMIN_REPO=ejer/navn kan sættes i Vercel, hvis repoet flyttes. Ellers bruges det repo, Vercel bygger fra.
  const [o, r] = String(process.env.ADMIN_REPO || '').split('/');
  return {
    owner: (o && r && o) || process.env.VERCEL_GIT_REPO_OWNER || 'fatihyuk92-a11y',
    repo: (o && r && r) || process.env.VERCEL_GIT_REPO_SLUG || '.github.io',
    branch: process.env.ADMIN_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main',
  };
}

function main() {
  const t0 = Date.now();
  console.log('Bygger Aktiekompas …');
  const settings = loadSettings();
  const analyses = loadAnalyses();
  const allPositions = loadPortfolio();
  // Nye handler vises først efter forsinkelsen (se delayPortfolio). Skjulte positioner kommer slet ikke med i HTML'en.
  const { visible: portfolio, pending } = delayPortfolio(allPositions, settings.portefolje_forsinkelse);
  const buildId = crypto.createHash('sha1').update(String(Date.now()) + JSON.stringify(settings).length).digest('hex').slice(0, 8);
  const site = {
    settings, analyses, portfolio, buildId, siteUrl: siteUrl(),
    edu: settings.indholdstype !== 'anbefalinger', // undervisningstilstand: ingen kursmål, stop eller køb/salg
    portfolioPending: pending.length,
    model: settings.portefolje_type === 'model', // modelportefølje: tænkte handler
    courses: loadCourses(),
  };

  // Kursernes tal og satser (skattegrænser, satser, lofter) gælder ét år ad gangen. Påmind om at gennemgå dem, når året skifter.
  for (const c of site.courses) {
    const y = new Date().getFullYear();
    if (c.ratesYear && c.ratesYear < y) warn(`Tal og satser i "${c.navn}" er fra ${c.ratesYear}. Gennemgå især skattelektionerne, og ret derefter årstallet under Kurser i admin.`);
  }

  // Sprogtjek i undervisningstilstand: udgivet indhold, der lyder som en anbefaling, vises som advarsel i admin (Overblik).
  if (site.edu) {
    const report = (where, hits) => {
      if (!hits.length) return;
      const words = hits.slice(0, 4).map((x) => `«${x.phrase}»`).join(', ');
      warn(`Sprogtjek: ${where} indeholder ${words}, som kan læses som en anbefaling. Siden står i undervisningstilstand – beskriv metoden og det, der er sket, i stedet.`);
    };
    for (const a of analyses) report(`analysen "${a.titel}"`, checkLanguage(a.titel, a.lede, a.md));
    for (const p of allPositions) if (p.kommentar) report(`kommentaren til ${p.navn || p.symbol} i porteføljen`, checkLanguage(p.kommentar));
    report('forsidens tekst', checkLanguage(settings.hero_titel, settings.hero_tekst));
    report('teksten på Om-siden', checkLanguage(settings.om_tekst));
    report('beskrivelsen af medlemskaberne', checkLanguage(...settings.priser.flatMap((t) => [t.beskrivelse, t.note, ...(t.features || []).map((f) => f.tekst)])));
  }

  // Porteføljetypen: teksterne må ikke tale om "min egen portefølje", hvis porteføljen er en modelportefølje – og omvendt.
  if (settings.vis_portefolje) {
    const OWN = /(?<![\p{L}\p{N}])(?:min\s+egen\s+portefølje|min\s+portefølje|mine\s+egne\s+(?:køb|handler|investeringer|positioner))(?![\p{L}\p{N}])/iu;
    const MODEL = /(?<![\p{L}\p{N}])(?:modelportefølje\p{L}*|papirportefølje\p{L}*|tænkte\s+handler)(?![\p{L}\p{N}])/iu;
    const texts = [
      ['forsidens tekst', [settings.hero_titel, settings.hero_tekst]],
      ['teksten på Om-siden', [settings.om_tekst]],
      ['beskrivelsen af medlemskaberne', settings.priser.flatMap((t) => [t.beskrivelse, t.note, ...(t.features || []).map((f) => f.tekst)])],
    ];
    for (const [where, list] of texts) {
      const m = list.join(' \n ').match(site.model ? OWN : MODEL);
      if (m) warn(`Porteføljen står som ${site.model ? 'modelportefølje' : 'dine egne handler'}, men ${where} skriver «${m[0]}». Ret teksten under Indstillinger, så den passer.`);
    }
  }

  rmrf(DIST);
  mkdirp(DIST);
  copyDir(PUBLIC, DIST);

  // Biblioteker og skrifttyper hostes selv (hurtigt, og ingen data sendes til Google).
  const lwcVersion = require(path.join(NM, 'lightweight-charts', 'package.json')).version;
  copyFrom('lightweight-charts/dist/lightweight-charts.standalone.production.js', `vendor/lightweight-charts-${lwcVersion}.js`);
  // Admin-bibliotekerne får versionsnummer i filnavnet, så browseren aldrig bruger en gammel version.
  const markedVersion = require(path.join(NM, 'marked', 'package.json')).version;
  const yamlVersion = require(path.join(NM, 'js-yaml', 'package.json')).version;
  copyFrom('marked/lib/marked.esm.js', `vendor/marked-${markedVersion}.esm.js`);
  copyFrom('js-yaml/dist/browser/js-yaml.esm.min.mjs', `vendor/js-yaml-${yamlVersion}.esm.js`);
  copyFrom('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2', 'fonts/bricolage-grotesque-latin.woff2');
  copyFrom('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'fonts/geist-latin.woff2');

  // Sider
  const pages = [
    ...require('./pages/home')(site),
    ...require('./pages/analyser')(site),
    ...require('./pages/analyse')(site),
    ...(settings.vis_portefolje ? require('./pages/portefolje')(site) : []),
    ...require('./pages/markedet')(site),
    ...require('./pages/content')(site),
    ...require('./pages/legal')(site),
    ...require('./pages/kurser')(site),
    ...require('./pages/beregner')(site),
  ];
  for (const p of pages) {
    const rel = p.file || path.join(p.path.replace(/^\//, ''), 'index.html');
    write(rel, toString(p.html));
  }

  // Data til admin og klient (kun offentlige felter)
  write('data/analyser.json', JSON.stringify(analyses.map((a) => ({
    slug: a.slug, titel: a.titel, aktie: a.aktie, symbol: a.symbol, dato: a.dato, tier: a.tier, ...(site.edu ? {} : { setup: a.setup }),
  }))));
  write('data/build.json', JSON.stringify({ buildId, built: new Date().toISOString(), analyser: analyses.length, positioner: portfolio.length, ventende_positioner: pending.length, lwc: lwcVersion, warnings }));

  // Sitemap og robots
  const urls = pages.filter((p) => !p.file).map((p) => p.path);
  if (site.siteUrl) {
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  }
  write('robots.txt', `User-agent: *\nDisallow: /admin/\n${site.siteUrl ? `Sitemap: ${site.siteUrl}/sitemap.xml\n` : ''}`);

  // Admin: hvilket GitHub-repo og hvilken branch der gemmes i (Vercel kender dem automatisk)
  write('admin/config.json', JSON.stringify(adminRepo()));
  const adminJs = path.join(DIST, 'admin/admin.js');
  if (fs.existsSync(adminJs)) {
    const out = fs.readFileSync(adminJs, 'utf8')
      .replace("'/vendor/marked.esm.js'", `'/vendor/marked-${markedVersion}.esm.js'`)
      .replace("'/vendor/js-yaml.esm.min.js'", `'/vendor/js-yaml-${yamlVersion}.esm.js'`);
    if (out.includes("'/vendor/marked.esm.js'") || out.includes("'/vendor/js-yaml.esm.min.js'")) throw new Error('admin.js: kunne ikke indsætte versionsnumre for marked/js-yaml');
    fs.writeFileSync(adminJs, out);
  }

  // Erstat {{LWC}} i analysescriptet med den faktiske versionsfil
  const analysisJs = path.join(DIST, 'assets/js/analysis.js');
  if (fs.existsSync(analysisJs)) fs.writeFileSync(analysisJs, fs.readFileSync(analysisJs, 'utf8').replace('{{LWC_FILE}}', `/vendor/lightweight-charts-${lwcVersion}.js`));

  console.log(`✓ ${pages.length} sider, ${analyses.length} analyser, ${site.courses.reduce((n, c) => n + c.lessons.length, 0)} lektioner, ${portfolio.length} positioner${pending.length ? ` (+${pending.length} vises senere)` : ''}, ${site.edu ? 'undervisningstilstand' : 'analyser med kursmål'} på ${Date.now() - t0} ms`);
  if (warnings.length) console.log(`  ${warnings.length} advarsel(er) – se ovenfor`);
}

try {
  main();
} catch (err) {
  console.error('✗ Bygningen fejlede:', err && err.stack || err);
  process.exit(1);
}
