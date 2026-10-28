// Lokal udviklingsserver: serverer dist/ og kører funktionerne i api/.
//   npm run build && node scripts/dev-server.js          (rigtige kurser fra Yahoo)
//   npm run build && node scripts/dev-server.js --mock   (opdigtede kurser, virker uden internet)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4321);
const MOCK = process.argv.includes('--mock');

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

if (MOCK) installMockFetch();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/\/$/, '');
    const file = path.join(ROOT, 'api', `${name}.js`);
    if (!/^[a-z-]+$/.test(name) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Ikke fundet'); }
    try {
      delete require.cache[require.resolve(file)];
      await require(file)(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500; res.end('Fejl: ' + err.message);
    }
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', TYPES['.html']);
    return fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
});
server.listen(PORT, () => console.log(`Aktiekompas kører på http://localhost:${PORT}${MOCK ? ' (opdigtede kurser)' : ''}`));

/* ---------- Opdigtede kurser til lokal test ---------- */
function installMockFetch() {
  const real = global.fetch;
  const BASE = { '^OMXC25': 1842, 'NOVO-B.CO': 412, 'DSV.CO': 1580, 'NSIS-B.CO': 455, 'MAERSK-B.CO': 11230, 'DANSKE.CO': 268, 'COLO-B.CO': 712, 'VWS.CO': 151, 'CARL-B.CO': 905, 'PNDORA.CO': 1104, 'GMAB.CO': 1262, 'ORSTED.CO': 121, 'TRYG.CO': 161, 'DEMANT.CO': 251, 'GN.CO': 121, 'ISS.CO': 178, 'JYSK.CO': 553, 'NKT.CO': 712, 'ROCK-B.CO': 251, 'RBREW.CO': 512, 'ZEAL.CO': 402, 'AMBU-B.CO': 118, 'BAVA.CO': 231, 'FLS.CO': 381, 'SYDB.CO': 452, 'NDA-DK.CO': 102, '^GSPC': 6812, '^NDX': 25110, '^GDAXI': 24210, '^STOXX50E': 5620, AAPL: 268, MSFT: 531, NVDA: 196, AMZN: 231, GOOGL: 258, META: 742, TSLA: 441, AVGO: 352, 'BRK-B': 482, JPM: 301, LLY: 818, V: 346, WMT: 101, ORCL: 284, MA: 572, XOM: 116, NFLX: 1152, COST: 931, UNH: 338, JNJ: 191, PG: 156, HD: 392, KO: 69.4, AMD: 243, BAC: 52.3, '^DJI': 46810, 'USDDKK=X': 6.43, 'EURDKK=X': 7.4615, 'GC=F': 4012, 'BZ=F': 66.2, 'BTC-USD': 112400 };
  const seed = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  const ranges = { '1d': [78, 300], '5d': [130, 900], '1mo': [22, 86400], '3mo': [64, 86400], '6mo': [126, 86400], '1y': [252, 86400], '2y': [104, 604800], '5y': [260, 604800], max: [240, 2592000] };
  function series(symbol, range) {
    const rnd = seed(symbol + range);
    const dayRnd = seed(symbol + new Date().toISOString().slice(0, 10));
    const base = BASE[symbol] || 100;
    const [n, step] = ranges[range] || ranges['1d'];
    const vol = range === '1d' ? 0.0016 : range === '5d' ? 0.0025 : 0.014;
    const drift = (dayRnd() - 0.47) * (range === '1d' ? 0.035 : 0.25);
    const end = Math.floor(Date.now() / 1000);
    const pts = [];
    let v = base * (1 - drift);
    for (let i = 0; i < n; i++) {
      v *= 1 + (rnd() - 0.5) * 2 * vol + drift / n;
      pts.push({ t: end - (n - 1 - i) * step, c: v });
    }
    const scale = base / pts[pts.length - 1].c;
    pts.forEach((p) => { p.c *= scale; });
    return pts;
  }
  global.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (!/finance\.yahoo\.com/.test(url)) return real(input, init);
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
    const u = new URL(url);
    if (u.pathname.includes('/v1/finance/search')) {
      const q = (u.searchParams.get('q') || '').toLowerCase();
      const all = [
        { symbol: 'NOVO-B.CO', longname: 'Novo Nordisk A/S', exchDisp: 'Copenhagen', quoteType: 'EQUITY', sector: 'Healthcare', industry: 'Biotechnology' },
        { symbol: 'NVO', longname: 'Novo Nordisk A/S', exchDisp: 'NYSE', quoteType: 'EQUITY', sector: 'Healthcare', industry: 'Biotechnology' },
        { symbol: 'NSIS-B.CO', longname: 'Novonesis A/S', exchDisp: 'Copenhagen', quoteType: 'EQUITY', sector: 'Basic Materials', industry: 'Specialty Chemicals' },
        { symbol: 'DSV.CO', longname: 'DSV A/S', exchDisp: 'Copenhagen', quoteType: 'EQUITY', sector: 'Industrials', industry: 'Integrated Freight & Logistics' },
        { symbol: 'AAPL', longname: 'Apple Inc.', exchDisp: 'NASDAQ', quoteType: 'EQUITY', sector: 'Technology', industry: 'Consumer Electronics' },
        { symbol: 'MSFT', longname: 'Microsoft Corporation', exchDisp: 'NASDAQ', quoteType: 'EQUITY', sector: 'Technology', industry: 'Software—Infrastructure' },
        { symbol: 'PNDORA.CO', longname: 'Pandora A/S', exchDisp: 'Copenhagen', quoteType: 'EQUITY', sector: 'Consumer Cyclical', industry: 'Luxury Goods' },
      ];
      const quotes = all.filter((x) => x.symbol.toLowerCase().includes(q) || x.longname.toLowerCase().includes(q));
      return new Response(JSON.stringify({ quotes }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const m = u.pathname.match(/\/v8\/finance\/chart\/([^/]+)/);
    const symbol = decodeURIComponent(m ? m[1] : '');
    if (!BASE[symbol]) return new Response(JSON.stringify({ chart: { result: null, error: { code: 'Not Found', description: 'No data found' } } }), { status: 404 });
    const range = u.searchParams.get('range') || '1d';
    const pts = series(symbol, range);
    const day = series(symbol, '1d');
    const dayRnd = seed(symbol + 'prev' + new Date().toISOString().slice(0, 10));
    const prevClose = day[0].c * (1 + (dayRnd() - 0.5) * 0.004);
    const now = Date.now() / 1000;
    const body = {
      chart: {
        result: [{
          meta: {
            currency: symbol.endsWith('.CO') ? 'DKK' : symbol.endsWith('=X') ? 'DKK' : 'USD', symbol, exchangeName: 'MOCK', fullExchangeName: 'Mock', regularMarketPrice: day[day.length - 1].c, regularMarketTime: Math.floor(now - 60),
            chartPreviousClose: range === '1d' ? prevClose : pts[0].c, previousClose: prevClose,
            regularMarketDayHigh: Math.max(...day.map((p) => p.c)), regularMarketDayLow: Math.min(...day.map((p) => p.c)),
            longName: symbol, exchangeTimezoneName: symbol.endsWith('.CO') ? 'Europe/Copenhagen' : 'America/New_York',
            currentTradingPeriod: { regular: { start: Math.floor(now - 3600), end: Math.floor(now + 3600) } },
          },
          timestamp: pts.map((p) => p.t),
          indicators: { quote: [{ close: pts.map((p) => p.c), open: pts.map((p) => p.c), high: pts.map((p) => p.c), low: pts.map((p) => p.c), volume: pts.map(() => 1000) }] },
        }],
        error: null,
      },
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
