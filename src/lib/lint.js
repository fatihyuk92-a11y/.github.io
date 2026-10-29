// Byggerens sprogtjek. Reglerne ligger ét sted – public/admin/lint.js – som admin også bruger,
// så Overblik i admin advarer om præcis det samme, som editoren viser, mens man skriver.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let lint = null;
function load() {
  if (!lint) {
    const ctx = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'admin', 'lint.js'), 'utf8'), ctx);
    lint = ctx.AkLint;
    if (!lint || typeof lint.checkLanguage !== 'function') throw new Error('public/admin/lint.js definerer ikke AkLint.checkLanguage');
  }
  return lint;
}

/** [{ phrase, why, count, context }] for formuleringer, der kan læses som en anbefaling. */
function checkLanguage(...texts) {
  return load().checkLanguage(...texts);
}

module.exports = { checkLanguage };
