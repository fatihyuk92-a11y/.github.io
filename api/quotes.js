// GET /api/quotes?symbols=NOVO-B.CO,AAPL,^OMXC25
// Aktuelle kurser og dagens ændring for op til 60 symboler.
const { quote, pool, cleanSymbol } = require('./_lib/yahoo');
const { query, sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  const raw = String(query(req).symbols || '');
  const symbols = [...new Set(raw.split(',').map(cleanSymbol).filter(Boolean))].slice(0, 60);
  if (!symbols.length) return sendJson(res, 400, { error: 'Angiv mindst ét symbol, fx ?symbols=NOVO-B.CO' });

  const results = await pool(symbols, 8, (s) => quote(s).catch((err) => ({ symbol: s, error: err.message })));
  const quotes = results.filter((r) => !r.error && r.price != null);
  const errors = results.filter((r) => r.error).map((r) => ({ symbol: r.symbol, error: r.error }));
  const anyOpen = quotes.some((q) => q.open);
  const maxAge = anyOpen ? 60 : 300;

  if (!quotes.length) {
    return sendJson(res, 502, { error: 'Kursdata kunne ikke hentes', errors }, { 'Cache-Control': 'public, s-maxage=20' });
  }
  return sendJson(res, 200, { quotes, errors, fetched: new Date().toISOString() }, {
    'Cache-Control': `public, max-age=30, s-maxage=${maxAge}, stale-while-revalidate=600`,
  });
};
