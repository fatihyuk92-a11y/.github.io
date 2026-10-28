// Enkle stregikoner (24×24, currentColor). Holdt bevidst få og ens i stregtykkelse.
const { raw } = require('../lib/util');

const P = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star: '<path d="M12 4.5l2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 16.4l-4.65 2.4.9-5.15L4.5 10l5.2-.8z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-3.2a2.2 2.2 0 0 1 4.4 0V16M11.5 10.5V16"/>',
  x: '<path d="M5 4.5h4.2l9.8 15h-4.2zM18.6 4.5l-5.7 6.6M5.4 19.5l5.8-6.6"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M7.5 15l3.5-4 3 2.5 4.5-6"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/>',
  chat: '<path d="M5 18.5V6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9z"/>',
  book: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4M12 16.8v.1"/>',
  chevronDown: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  chevronRight: '<path d="M9.5 6.5l5.5 5.5-5.5 5.5"/>',
  arrowRight: '<path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5"/>',
  arrowUpRight: '<path d="M7 17L17 7M8.5 7H17v8.5"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  shield: '<path d="M12 3.5l7 2.8v5.4c0 4.2-3 7.4-7 8.8-4-1.4-7-4.6-7-8.8V6.3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
  send: '<path d="M4.5 12L19.5 5l-4 14.5-3.5-6.2z"/><path d="M12 13.3l7.5-8.3"/>',
  pulse: '<path d="M3.5 12h4l2-5.5 4 11 2-5.5h5"/>',
};

function icon(name, { size = 20, cls = '', label = '' } = {}) {
  const body = P[name] || P.info;
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return raw(`<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${aria}>${body}</svg>`);
}

/** Logo: en kompasnål i en ring – samme form som markedskompasset på forsiden. */
function logoMark(size = 30) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="14.5" fill="#fff" stroke="currentColor" stroke-width="1.5"/>
    <path d="M16 4.5l3.2 11.5H12.8z" fill="#1f4fff"/>
    <path d="M16 27.5l-3.2-11.5h6.4z" fill="#ffc629"/>
    <circle cx="16" cy="16" r="2.2" fill="#fff" stroke="currentColor" stroke-width="1.2"/>
  </svg>`);
}

module.exports = { icon, logoMark };
