// ════════════════════════════════════════════════════════════════
// GITHUB OAUTH — STEP 2: CALLBACK
// ════════════════════════════════════════════════════════════════
// GitHub redirects user back here after authorization with a `code`.
// We exchange the code for an access token, then post it back to
// the Decap CMS window so it can talk to GitHub on user's behalf.
// ════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing OAuth environment variables');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      const errorPayload = {
        token: null,
        provider: 'github',
        error: tokenData.error_description || tokenData.error,
      };
      return res.status(400).send(buildResponseHtml('error', errorPayload));
    }

    // Send token back to Decap CMS window via postMessage
    const successPayload = {
      token: tokenData.access_token,
      provider: 'github',
    };
    return res.status(200).send(buildResponseHtml('success', successPayload));
  } catch (err) {
    return res.status(500).send(buildResponseHtml('error', {
      token: null,
      provider: 'github',
      error: err.message,
    }));
  }
}

function buildResponseHtml(status, payload) {
  // Decap CMS listens for messages with the format:
  // "authorization:github:STATUS:JSON_PAYLOAD"
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0c0c0b; color: #f5f1ea; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; padding: 2rem; }
    .ok { color: #4ade80; }
    .err { color: #f87171; }
  </style>
</head>
<body>
  <div class="box">
    <h1 class="${status === 'success' ? 'ok' : 'err'}">
      ${status === 'success' ? '✓ Logget ind!' : '✗ Login mislykkedes'}
    </h1>
    <p>Du kan lukke dette vindue og vende tilbage til admin.</p>
  </div>
  <script>
    (function() {
      function receiveMessage(e) {
        window.opener.postMessage(
          ${JSON.stringify(message)},
          e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</body>
</html>`;
}
