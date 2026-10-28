// GET /api/chart?symbol=VWS.CO&range=6mo
// Kurshistorik til grafer og sparklines. Kun tid og lukkekurs sendes for at holde svaret lille.
const { chart, cleanSymbol, INTERVAL } = require('./_lib/yahoo');
const { query, sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  const q = query(req);
  const symbol = cleanSymbol(q.symbol);
  const range = INTERVAL[q.range] ? q.range : '1d';
  if (!symbol) return sendJson(res, 400, { error: 'Angiv et gyldigt symbol' });
  try {
    const c = await chart(symbol, range);
    const maxAge = range === '1d' ? 60 : range === '5d' ? 300 : 1800;
    return sendJson(res, 200, {
      symbol, range, currency: c.currency, name: c.name, prevClose: c.prevClose,
      points: c.points.map((p) => ({ t: p.t, c: p.c })),
    }, { 'Cache-Control': `public, max-age=60, s-maxage=${maxAge}, stale-while-revalidate=3600` });
  } catch (err) {
    return sendJson(res, err.status === 404 ? 404 : 502, { error: err.status === 404 ? 'Symbolet findes ikke' : 'Kursdata kunne ikke hentes' }, { 'Cache-Control': 'public, s-maxage=30' });
  }
};
