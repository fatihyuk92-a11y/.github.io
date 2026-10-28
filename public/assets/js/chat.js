// AI-assistenten. Svarene formateres med en lille, sikker markdown-omsætter (ingen rå HTML fra modellen).
const root = document.querySelector('[data-chat]');
if (root) init();

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Fed, kursiv og kode inde i en linje – bygget som DOM-noder, så intet HTML kan smugles ind. */
function inline(text, parent) {
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parent.append(document.createTextNode(text.slice(last, m.index)));
    const t = m[0];
    if (t.startsWith('**')) parent.append(el('strong', null, t.slice(2, -2)));
    else if (t.startsWith('`')) parent.append(el('code', null, t.slice(1, -1)));
    else parent.append(el('em', null, t.slice(1, -1)));
    last = m.index + t.length;
  }
  if (last < text.length) parent.append(document.createTextNode(text.slice(last)));
}

function renderAnswer(text, target) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  let list = null, para = [];
  const flushPara = () => { if (para.length) { const p = el('p'); inline(para.join(' '), p); target.append(p); para = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    const ul = line.match(/^[-*•]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.tagName.toLowerCase() !== type) { list = el(type); target.append(list); }
      const li = el('li');
      inline((ul || ol)[1], li);
      list.append(li);
      continue;
    }
    list = null;
    if (!line) { flushPara(); continue; }
    if (h) { flushPara(); const p = el('p'); const s = el('strong'); inline(h[1], s); p.append(s); target.append(p); continue; }
    para.push(line);
  }
  flushPara();
}

function init() {
  const log = root.querySelector('[data-chat-log]');
  const form = root.querySelector('[data-chat-form]');
  const input = root.querySelector('[data-chat-input]');
  const status = root.querySelector('[data-chat-status]');
  const suggest = root.querySelector('[data-chat-suggest]');
  const history = [];
  let busy = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const grow = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 160)}px`; };
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    suggest.hidden = true;
    log.append(el('div', 'msg msg--user', text));
    history.push({ role: 'user', content: text });
    input.value = '';
    grow();
    const wait = el('div', 'msg msg--bot');
    const dots = el('span', 'typing');
    dots.append(el('i'), el('i'), el('i'));
    dots.setAttribute('aria-label', 'Assistenten skriver');
    wait.append(dots);
    log.append(wait);
    status.textContent = 'Skriver …';
    scroll();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Assistenten svarer ikke lige nu. Prøv igen om lidt.');
      wait.textContent = '';
      renderAnswer(data.text, wait);
      history.push({ role: 'assistant', content: data.text });
    } catch (err) {
      wait.textContent = '';
      wait.classList.add('msg--error');
      wait.append(el('p', null, err.message));
      history.pop();
    } finally {
      busy = false;
      status.textContent = 'Klar';
      scroll();
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  suggest.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (b) send(b.dataset.q);
  });
}
