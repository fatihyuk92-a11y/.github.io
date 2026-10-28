// En simpel side til login-forløbet.
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function page(title, text, showBack = false, extra = '') {
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7fb;color:#0a1a3f;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}main{max-width:440px;margin:24px;padding:32px;background:#fff;border:1px solid #e2e8f1;border-radius:20px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#3f4c66;margin:0 0 20px}a{display:inline-block;padding:10px 20px;border-radius:999px;background:#1f4fff;color:#fff;text-decoration:none;font-weight:600}</style>
</head><body><main><h1>${esc(title)}</h1><p id="msg">${esc(text)}</p>${showBack ? '<a href="/admin/">Tilbage til admin</a>' : ''}</main>${extra}</body></html>`;
}

module.exports = { page, esc };
