// Sprogtjek: finder formuleringer, der kan læses som en anbefaling, et handelsniveau eller en kursprognose.
// Bruges både af admin (live, mens du skriver) og af byggeren (advarsler i Overblik), så de tjekker præcis det samme.
// Filen er et almindeligt script uden import/export, så byggeren kan køre den direkte (se src/lib/lint.js).
(function () {
  // Ordgrænser, der også virker med æ, ø og å (JavaScripts \b kender kun a-z).
  const W = (src) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, 'giu');

  const RULES = [
    [W('køb|sælg|buy|sell'), 'opfordring til at købe eller sælge'],
    [W('(?:bør|skal)\\s+(?:du\\s+)?(?:købe|sælge|eje|holde)'), 'opfordring til at handle'],
    [W('(?:købs|salgs)?anbefal(?:er|ede|ing|inger|et|ingen)?'), 'anbefaling'],
    [W('(?:købs|salgs)signal(?:et|er|erne)?'), 'handelssignal'],
    [W('kursmål(?:et)?|målkurs(?:en)?|target'), 'kursmål'],
    [W('kurspotentiale(?:t)?|upside'), 'kursprognose'],
    [W('stop[- ]?loss|stop(?:pet)?\\s+(?:ved|på|under|over)'), 'stop'],
    [W('(?:gå|går|gik|er|var|være|blive|bliver)\\s+(?:long|short)|(?:long|short)[- ]?position(?:en|er)?|short(?:e|er|ede)'), 'handelsretning'],
    [W('(?:tag|tage|tager)\\s+(?:gevinst|gevinsten|profit|hjem|tabet)'), 'opfordring til at sælge'],
    [W('indgang|indgangskurs(?:en)?|entry|købszone(?:n)?'), 'handelsniveau'],
    [W('(?:undervurderet|overvurderet|billig|dyr)\\s+(?:lige\\s+)?nu'), 'vurdering af kursen nu'],
    [W('(?:er|virker)\\s+(?:\\p{L}+\\s+)?(?:undervurderet|overvurderet|undervurderede|overvurderede|billig|dyr)'), 'vurdering af aktiens værdi'],
    [W('kursen\\s+(?:vil|skal|kommer\\s+til\\s+at)\\s+(?:stige|falde|ramme|nå|teste)'), 'kursprognose'],
  ];

  // "ikke en anbefaling", "ingen kursmål", "uden opfordring til at købe" er ansvarsfraskrivelser, ikke anbefalinger.
  // Et ord tæller derfor ikke, hvis der står en nægtelse lige foran det i samme sætningsled.
  const NEG = W('ikke|ingen|intet|aldrig|uden|hverken|not|no|never');
  function negated(text, index) {
    const clause = text.slice(Math.max(0, index - 80), index).split(/[.,;:!?()[\]\n–—]/).pop();
    const words = clause.trim().split(/\s+/).filter(Boolean).slice(-6).join(' ');
    NEG.lastIndex = 0;
    return NEG.test(words);
  }

  /** Finder formuleringer i teksterne. Returnerer [{ phrase, why, count, context }], flest først. */
  function checkLanguage(...texts) {
    const found = new Map();
    for (const text of texts) {
      const t = String(text || '');
      for (const [re, why] of RULES) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(t))) {
          if (negated(t, m.index)) continue;
          const phrase = m[0].toLowerCase().replace(/\s+/g, ' ');
          const hit = found.get(phrase) || { phrase, why, count: 0, context: '' };
          hit.count += 1;
          if (!hit.context) hit.context = '…' + t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ').trim() + '…';
          found.set(phrase, hit);
        }
      }
    }
    return [...found.values()].sort((a, b) => b.count - a.count);
  }

  globalThis.AkLint = { checkLanguage };
})();
