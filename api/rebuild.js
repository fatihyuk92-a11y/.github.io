// GET /api/rebuild – kaldes af Vercel Cron én gang i døgnet og starter en ny bygning via en Deploy Hook.
// Så kommer porteføljehandler med på siden, når forsinkelsen er udløbet, selv om du ikke har gemt noget i admin.
// Kræver to miljøvariabler i Vercel: CRON_SECRET (vilkårlig lang tekst) og DEPLOY_HOOK_URL (fra Settings → Git → Deploy Hooks).
const { sendJson } = require('./_lib/http');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!secret || !hook) return sendJson(res, 200, { ok: false, message: 'Daglig genopbygning er ikke sat op (CRON_SECRET og DEPLOY_HOOK_URL mangler).' }, { 'Cache-Control': 'no-store' });
  if (req.headers.authorization !== `Bearer ${secret}`) return sendJson(res, 401, { ok: false }, { 'Cache-Control': 'no-store' });
  if (!/^https:\/\/api\.vercel\.com\//.test(hook)) return sendJson(res, 500, { ok: false, message: 'DEPLOY_HOOK_URL skal være en Vercel Deploy Hook.' });
  try {
    const r = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(10000) });
    return sendJson(res, r.ok ? 200 : 502, { ok: r.ok }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    return sendJson(res, 502, { ok: false, message: err.message }, { 'Cache-Control': 'no-store' });
  }
};
