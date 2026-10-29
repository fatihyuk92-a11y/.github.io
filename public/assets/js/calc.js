// Beregneren "Hvad kan din opsparing vokse til?" – samme regnestykke som i src/templates/sections.js.
const NF = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const kr = (n) => `${NF.format(Math.round(n))} kr.`;
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('da-DK', { maximumFractionDigits: 1 })} mio. kr.` : `${NF.format(Math.round(n / 1e3) * 1e3)} kr.`);
const parseMoney = (v) => { const n = Number(String(v).replace(/[^\d,]/g, '').replace(',', '.')); return Number.isFinite(n) ? Math.min(n, 1e9) : 0; };

function project({ start, monthly, rate, years, cost }) {
  const r = rate / 100, c = cost / 100;
  const m = Math.pow((1 + r) * (1 - c), 1 / 12) - 1;
  const mg = Math.pow(1 + r, 1 / 12) - 1;
  let v = start, g = start;
  const rows = [];
  for (let y = 1; y <= years; y++) {
    for (let i = 0; i < 12; i++) { v = v * (1 + m) + monthly; g = g * (1 + mg) + monthly; }
    rows.push({ y, value: v, paid: start + monthly * 12 * y });
  }
  const paid = start + monthly * 12 * years;
  return { value: v, paid, gain: v - paid, costLoss: g - v, rows };
}

function chart(el, rows) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.paid)));
  const pct = (v) => `${Math.max(0, (v / max) * 100).toFixed(2)}%`;
  const bars = rows.map((r) => {
    const base = Math.min(r.paid, r.value);
    const gain = Math.max(0, r.value - r.paid);
    return `<span class="calc__bar" title="År ${r.y}: ${kr(r.value)}"><i class="calc__gain" style="height:${pct(gain)}"></i><i class="calc__paid" style="height:${pct(base)}"></i></span>`;
  }).join('');
  const n = rows.length;
  const mid = n > 4 ? `<span>År ${rows[Math.floor((n - 1) / 2)].y}</span>` : '';
  el.innerHTML = `<span class="calc__max">${short(max)}</span><div class="calc__bars">${bars}</div><div class="calc__axis"><span>År 1</span>${mid}<span>År ${rows[n - 1].y}</span></div>`;
}

document.querySelectorAll('[data-calc]').forEach((root) => {
  const get = (k) => root.querySelector(`[data-calc-in="${k}"]`);
  const out = (k) => root.querySelector(`[data-calc-out="${k}"]`);
  const show = (k) => root.querySelector(`[data-calc-show="${k}"]`);
  const unit = { rate: ' %', years: ' år', cost: ' %' };
  const update = () => {
    const v = {
      start: parseMoney(get('start').value),
      monthly: parseMoney(get('monthly').value),
      rate: Number(get('rate').value),
      years: Math.max(1, Math.round(Number(get('years').value))),
      cost: Number(get('cost').value),
    };
    for (const k of ['rate', 'years', 'cost']) { const s = show(k); if (s) s.textContent = `${String(v[k]).replace('.', ',')}${unit[k]}`; }
    const p = project(v);
    out('years').textContent = v.years;
    out('value').textContent = kr(p.value);
    out('paid').textContent = kr(p.paid);
    out('gain').textContent = kr(p.gain);
    out('cost').textContent = kr(p.costLoss);
    const c = root.querySelector('[data-calc-chart]');
    if (c) chart(c, p.rows);
  };
  root.querySelectorAll('[data-calc-in]').forEach((input) => {
    input.addEventListener('input', update);
    if (input.type === 'text') input.addEventListener('blur', () => { input.value = NF.format(parseMoney(input.value)); });
  });
  update();
});
