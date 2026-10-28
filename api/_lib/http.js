// Små hjælpere til Vercel-funktionerne. Skrevet uden Vercels hjælpe-API, så de også kan køres lokalt.

function query(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, html, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(html);
}

async function readJson(req, limit = 32 * 1024) {
  // På Vercel er body allerede parset; lokalt læser vi selv strømmen.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('For stor forespørgsel'), { status: 413 });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || req.socket?.remoteAddress || 'ukendt';
}

/** Enkel hastighedsbegrænsning pr. IP i den enkelte funktions hukommelse. */
const buckets = new Map();
function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, n: 1 });
    if (buckets.size > 5000) buckets.delete(buckets.keys().next().value);
    return { ok: true };
  }
  b.n += 1;
  if (b.n > limit) return { ok: false, retryAfter: Math.ceil((b.start + windowMs - now) / 1000) };
  return { ok: true };
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

module.exports = { query, sendJson, sendHtml, readJson, clientIp, rateLimit, parseCookies };
