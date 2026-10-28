// GET /api/search?q=novo
// Søg efter aktier, indeks og valuta (bruges af admin, når du opretter analyser og investeringer).
const { search } = require('./_lib/yahoo');
const { query, sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  const q = String(query(req).q || '').trim().slice(0, 60);
  if (q.length < 1) return sendJson(res, 400, { error: 'Skriv mindst ét tegn' });
  try {
    const results = await search(q);
    return sendJson(res, 200, { results }, { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' });
  } catch (err) {
    return sendJson(res, 502, { error: 'Søgningen virker ikke lige nu. Du kan skrive symbolet selv, fx NOVO-B.CO.' });
  }
};
