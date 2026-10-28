// Gratis kursdata fra Yahoo Finance (uofficielt chart-endpoint, ingen nøgle).
// Svarene caches i funktionens hukommelse, og samme symbol hentes kun én gang ad gangen.

const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
};
const INTERVAL = { '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1d', '2y': '1wk', '5y': '1wk', max: '1mo' };
const TTL = { '1d': 60e3, '5d': 5 * 60e3 };
const DEFAULT_TTL = 30 * 60e3;

const cache = new Map(); // key -> { t, v }
const inflight = new Map(); // key -> Promise

const SYMBOL_RE = /^[\^A-Z0-9][A-Z0-9.\-=^]{0,19}$/;
function cleanSymbol(s) {
  const v = String(s || '').trim().toUpperCase();
  return SYMBOL_RE.test(v) ? v : null;
}

class YahooError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function getJson(path) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, { headers: HEADERS, signal: AbortSignal.timeout(7000) });
      if (res.status === 404) throw new YahooError('Ukendt symbol', 404);
      if (!res.ok) { lastErr = new YahooError(`Yahoo svarede ${res.status}`, res.status); continue; }
      return await res.json();
    } catch (err) {
      if (err instanceof YahooError && err.status === 404) throw err;
      lastErr = err;
    }
  }
  throw lastErr || new YahooError('Ingen forbindelse til kursdata', 502);
}

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }

function normalizeChart(symbol, range, json) {
  const err = json && json.chart && json.chart.error;
  if (err) throw new YahooError(err.description || 'Ingen data', err.code === 'Not Found' ? 404 : 502);
  const r = json && json.chart && json.chart.result && json.chart.result[0];
  if (!r || !r.meta) throw new YahooError('Ingen data', 502);
  const m = r.meta;
  const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  const ts = r.timestamp || [];
  const points = [];
  for (let i = 0; i < ts.length; i++) {
    const c = num(q.close && q.close[i]);
    if (c == null) continue;
    points.push({ t: ts[i], o: num(q.open && q.open[i]), h: num(q.high && q.high[i]), l: num(q.low && q.low[i]), c, v: num(q.volume && q.volume[i]) });
  }
  const last = points.length ? points[points.length - 1] : null;
  const price = num(m.regularMarketPrice) ?? (last && last.c);
  const prevClose = range === '1d' ? (num(m.previousClose) ?? num(m.chartPreviousClose)) : num(m.chartPreviousClose);
  const reg = m.currentTradingPeriod && m.currentTradingPeriod.regular;
  const now = Date.now() / 1000;
  return {
    symbol,
    name: m.longName || m.shortName || symbol,
    currency: m.currency || '',
    exchange: m.fullExchangeName || m.exchangeName || '',
    timezone: m.exchangeTimezoneName || '',
    price,
    prevClose,
    time: num(m.regularMarketTime) ?? (last && last.t),
    dayHigh: num(m.regularMarketDayHigh),
    dayLow: num(m.regularMarketDayLow),
    open: reg && reg.start && reg.end ? now >= reg.start && now < reg.end : null,
    points,
  };
}

/** Kurshistorik for ét symbol og én periode. */
async function chart(symbol, range = '1d') {
  if (!INTERVAL[range]) range = '1d';
  const key = `${symbol}|${range}`;
  const hit = cache.get(key);
  const ttl = TTL[range] || DEFAULT_TTL;
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const json = await getJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${INTERVAL[range]}&includePrePost=false&events=div%2Csplits`);
      const v = normalizeChart(symbol, range, json);
      cache.set(key, { t: Date.now(), v });
      if (cache.size > 800) cache.delete(cache.keys().next().value);
      return v;
    } catch (err) {
      // Hellere en lidt gammel kurs end ingen kurs.
      if (hit) return hit.v;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Aktuel kurs og dagens ændring. */
async function quote(symbol) {
  const c = await chart(symbol, '1d');
  const change = c.price != null && c.prevClose ? c.price - c.prevClose : null;
  return {
    symbol,
    name: c.name,
    currency: c.currency,
    price: c.price,
    prevClose: c.prevClose,
    change,
    changePct: change != null ? (change / c.prevClose) * 100 : null,
    time: c.time,
    dayHigh: c.dayHigh,
    dayLow: c.dayLow,
    open: c.open,
  };
}

/** Kør opgaver med højst `limit` samtidige forespørgsler. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Søg efter aktier og andre papirer (bruges i admin). */
async function search(q) {
  const json = await getJson(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false&lang=en-US&region=US`);
  const allowed = new Set(['EQUITY', 'ETF', 'INDEX', 'CURRENCY', 'CRYPTOCURRENCY', 'FUTURE', 'MUTUALFUND']);
  return (json.quotes || [])
    .filter((x) => x && x.symbol && allowed.has(x.quoteType))
    .map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      exchange: x.exchDisp || x.exchange || '',
      type: x.quoteType,
      sector: x.sectorDisp || x.sector || '',
      industry: x.industryDisp || x.industry || '',
    }));
}

module.exports = { chart, quote, pool, search, cleanSymbol, INTERVAL, YahooError };
