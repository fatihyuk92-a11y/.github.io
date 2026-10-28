// GET /api/callback – GitHub sender brugeren hertil efter login. Koden byttes til et adgangstoken,
// som gemmes i browseren, hvorefter brugeren sendes tilbage til /admin/.
const { query, sendHtml, parseCookies } = require('./_lib/http');
const { page } = require('./_lib/pages');

module.exports = async function handler(req, res) {
  const { code, state, error } = query(req);
  const expected = parseCookies(req).ak_oauth_state;
  const headers = { 'Cache-Control': 'no-store', 'Set-Cookie': 'ak_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0' };

  if (error) return sendHtml(res, 400, page('Login blev afbrudt', 'GitHub-login blev annulleret. Gå tilbage til admin, og prøv igen.', true), headers);
  if (!code) return sendHtml(res, 400, page('Login mislykkedes', 'GitHub sendte ingen kode tilbage. Prøv igen.', true), headers);
  if (!state || !expected || state !== expected) {
    return sendHtml(res, 400, page('Login udløb', 'Login-forsøget var for gammelt eller blev startet i en anden fane. Prøv igen fra admin.', true), headers);
  }
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return sendHtml(res, 500, page('Login er ikke sat op', 'OAuth-miljøvariablerne mangler i Vercel.', true), headers);

  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (!data.access_token) {
      return sendHtml(res, 400, page('Login mislykkedes', `GitHub afviste login (${data.error_description || data.error || 'ukendt fejl'}). Prøv igen.`, true), headers);
    }
    const token = JSON.stringify(data.access_token);
    const script = `<script>
      (function () {
        var token = ${token};
        var remember = false;
        try { remember = localStorage.getItem('ak_admin_remember') === '1'; } catch (e) {}
        try {
          (remember ? localStorage : sessionStorage).setItem('ak_admin_token', token);
          location.replace('/admin/');
        } catch (e) {
          document.getElementById('msg').textContent = 'Din browser tillader ikke at gemme login. Slå cookies og lokal lagring til for siden, og prøv igen.';
        }
      })();
    </script>`;
    return sendHtml(res, 200, page('Du er logget ind', 'Sender dig videre til admin …', false, script), headers);
  } catch (err) {
    return sendHtml(res, 502, page('Login mislykkedes', 'Der var ingen forbindelse til GitHub. Prøv igen om lidt.', true), headers);
  }
};
