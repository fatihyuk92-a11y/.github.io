// GET /api/auth – starter GitHub-login til admin.
// Kræver OAUTH_GITHUB_CLIENT_ID og OAUTH_GITHUB_CLIENT_SECRET i Vercel (samme OAuth-app som før).
const crypto = require('crypto');
const { sendHtml } = require('./_lib/http');
const { page } = require('./_lib/pages');

module.exports = function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    return sendHtml(res, 500, page('Login er ikke sat op', 'Miljøvariablen OAUTH_GITHUB_CLIENT_ID mangler i Vercel. Tilføj den under Settings → Environment Variables, og deploy igen.'));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${proto}://${host}/api/callback`,
    scope: 'repo',
    state,
    allow_signup: 'false',
  });
  res.statusCode = 302;
  res.setHeader('Set-Cookie', `ak_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`);
  res.end();
};
