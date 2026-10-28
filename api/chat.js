// POST /api/chat  { messages: [{ role: 'user'|'assistant', content: '...' }] }
// AI-assistenten. Kræver miljøvariablen ANTHROPIC_API_KEY i Vercel.
const { sendJson, readJson, clientIp, rateLimit } = require('./_lib/http');

const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const SITE = process.env.SITE_NAME || 'Aktiekompas';

const SYSTEM = `Du er AI-assistenten på ${SITE}, en dansk undervisnings- og analyseplatform om aktier.

GRUNDPRINCIP – MÅ ALDRIG BRYDES
${SITE} udbyder ikke rådgivning eller anbefalinger. Alt, du skriver, er udelukkende undervisning. Du er ikke autoriseret finansiel rådgiver og er ikke under Finanstilsynets tilsyn.

REGLER
1. Giv aldrig køb-, salg- eller hold-anbefalinger om konkrete aktier, fonde, obligationer, kryptovaluta eller andre værdipapirer. Sig aldrig "du bør købe", "du skal sælge" eller "det er en god investering for dig".
2. Hvis brugeren spørger, om vedkommende skal købe eller sælge noget, eller hvad der passer til vedkommendes økonomi: forklar venligt, at du ikke kan give personlig rådgivning, og tilbyd i stedet at gennemgå de nøgletal, indikatorer og spørgsmål, brugeren selv kan undersøge.
3. Forudsig ikke kurser og lov aldrig afkast. Historiske afkast er ingen garanti for fremtidige afkast.
4. Mind om, at man aldrig bør investere penge, man ikke har råd til at tabe, når det er relevant.
5. Afslut hvert svar, der handler om konkrete aktier eller investeringsbeslutninger, med linjen: "Kun til undervisning – ikke rådgivning."
6. Hvis du nævner tal om konkrete selskaber, så sig, at de er illustrative og kan være forældede, og henvis til årsrapporter og selskabsmeddelelser.
7. Hjælp ikke med noget, der kan være markedsmanipulation, insiderhandel eller omgåelse af regler.

DU MÅ GERNE
- Forklare tekniske indikatorer: RSI, MACD, glidende gennemsnit, Bollinger-bånd, støtte og modstand, volumen.
- Forklare nøgletal og regnskab: P/E, P/B, EV/EBITDA, DCF, frie pengestrømme, ROIC, gældsgrad, udbytte.
- Forklare makro: renter, inflation, valuta, sektorrotation.
- Hjælpe brugeren med at strukturere sin egen research og foreslå spørgsmål, brugeren selv bør undersøge.
- Forklare begreber som risiko, spredning, positionsstørrelse og stop-loss i generelle vendinger.

FORM
- Skriv på dansk, venligt, klart og konkret. Brug eksempler frem for abstrakte definitioner.
- Hold svarene korte: typisk 2-4 korte afsnit eller en kort punktliste. Gå kun i dybden, hvis brugeren beder om det.
- Brug almindelig tekst med **fed** og punktlister. Ingen tabeller, overskrifter eller HTML.
- Hvis spørgsmålet ikke handler om investering, økonomi eller aktier, så sig venligt, at du kun hjælper med emner om aktier og investering.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Brug POST' }, { Allow: 'POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return sendJson(res, 503, { error: 'AI-assistenten er ikke slået til endnu. Prøv igen senere.' });

  const ip = clientIp(req);
  const minute = rateLimit(`chat:m:${ip}`, { limit: 6, windowMs: 60e3 });
  const hour = rateLimit(`chat:h:${ip}`, { limit: 40, windowMs: 60 * 60e3 });
  if (!minute.ok || !hour.ok) {
    return sendJson(res, 429, { error: 'Du har stillet mange spørgsmål på kort tid. Vent lidt, og prøv igen.' }, { 'Retry-After': String((minute.ok ? hour : minute).retryAfter) });
  }

  let body;
  try { body = await readJson(req); } catch { return sendJson(res, 400, { error: 'Ugyldig forespørgsel' }); }
  const input = Array.isArray(body.messages) ? body.messages : [];
  const messages = input
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, m.role === 'user' ? 1500 : 4000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return sendJson(res, 400, { error: 'Skriv et spørgsmål' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, messages }),
      signal: AbortSignal.timeout(28000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[chat] Anthropic-fejl', r.status, data && data.error && data.error.message);
      return sendJson(res, 502, { error: 'Assistenten svarer ikke lige nu. Prøv igen om lidt.' });
    }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text) return sendJson(res, 502, { error: 'Assistenten gav et tomt svar. Prøv at omformulere spørgsmålet.' });
    return sendJson(res, 200, { text }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('[chat]', err.message);
    return sendJson(res, 504, { error: 'Assistenten var for længe om at svare. Prøv igen.' });
  }
};
