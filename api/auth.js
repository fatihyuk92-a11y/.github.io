// ════════════════════════════════════════════════════════════════
// GITHUB OAUTH — STEP 1: AUTHORIZATION
// ════════════════════════════════════════════════════════════════
// When user clicks "Login with GitHub" in /admin, Decap CMS sends
// them here. We redirect them to GitHub's OAuth authorization page.
// ════════════════════════════════════════════════════════════════

export default function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;

  if (!clientId) {
    return res.status(500).send('Missing OAUTH_GITHUB_CLIENT_ID environment variable');
  }

  // Build the GitHub authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo,user',
    redirect_uri: `https://${req.headers.host}/api/callback`,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.redirect(302, authUrl);
}
