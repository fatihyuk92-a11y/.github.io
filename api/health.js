// GET /api/health – bruges af admin-overblikket. Viser kun ja/nej, aldrig selve nøglerne.
const { quote } = require('./_lib/yahoo');
const { sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  let quotes = { ok: false, error: '' };
  try {
    const q = await quote('^OMXC25');
    quotes = { ok: q.price != null, error: '' };
  } catch (err) {
    quotes = { ok: false, error: err.message };
  }
  return sendJson(res, 200, {
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    aiModel: process.env.AI_MODEL || 'claude-haiku-5-5',
    login: Boolean(process.env.OAUTH_GITHUB_CLIENT_ID && process.env.OAUTH_GITHUB_CLIENT_SECRET),
    quotes,
  }, { 'Cache-Control': 'no-store' });
};
