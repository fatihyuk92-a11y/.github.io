// Markdown -> HTML til analyser og "Om"-siden.
// Overskrifter får id'er (til indholdsfortegnelsen), tabeller pakkes ind så de kan scrolle på mobil,
// eksterne links åbnes i ny fane, og billeder lazy-loades.

const { Marked } = require('marked');
const { slugify, esc } = require('./util');

function decodeEntities(s) {
  return s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: ' ' }[e]));
}

function createRenderer(headings) {
  const used = new Map();
  return {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      const plain = decodeEntities(text.replace(/<[^>]+>/g, ''));
      let id = slugify(plain) || `afsnit-${headings.length + 1}`;
      const n = used.get(id) || 0;
      used.set(id, n + 1);
      if (n) id = `${id}-${n + 1}`;
      if (token.depth === 2) headings.push({ id, text: plain.trim() });
      return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
    },
    table(token) {
      let header = '';
      for (const cell of token.header) header += this.tablecell(cell);
      let body = '';
      for (const row of token.rows) {
        let r = '';
        for (const cell of row) r += this.tablecell(cell);
        body += `<tr>${r}</tr>`;
      }
      return `<div class="prose-table"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>\n`;
    },
    link(token) {
      const text = this.parser.parseInline(token.tokens);
      const href = token.href || '';
      const external = /^https?:\/\//i.test(href);
      const title = token.title ? ` title="${esc(token.title)}"` : '';
      return `<a href="${esc(href)}"${title}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    },
    image(token) {
      const alt = esc(token.text || '');
      const title = token.title ? `<figcaption>${esc(token.title)}</figcaption>` : '';
      return `<figure class="prose-figure"><img src="${esc(token.href)}" alt="${alt}" loading="lazy" decoding="async">${title}</figure>`;
    },
  };
}

/** Returnerer { html, headings }. */
function renderMarkdown(src) {
  const headings = [];
  const md = new Marked({ gfm: true, breaks: false });
  md.use({ renderer: createRenderer(headings) });
  const htmlOut = md
    .parse(String(src || ''))
    // Et billede alene i et afsnit bliver til <figure> – figure må ikke ligge inde i <p>.
    .replace(/<p>\s*(<figure class="prose-figure">[\s\S]*?<\/figure>)\s*<\/p>/g, '$1')
    // Tal og enhed holdes sammen på samme linje: "27 %", "79.400 kr.", "1,5 mio. kr."
    .replace(/>([^<]+)</g, (m, t) => `>${t.replace(/(\d) (%|kr\.|mio\.|mia\.)/g, '$1\u00a0$2')}<`);
  return { html: htmlOut, headings };
}

/**
 * Del brødteksten til premium-teaser: alt frem til (men ikke med) anden H2-overskrift,
 * så læseren får introduktionen og første afsnit.
 */
function teaserMarkdown(src) {
  const lines = String(src || '').split('\n');
  let h2 = 0;
  const out = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      h2 += 1;
      if (h2 === 2) break;
    }
    out.push(line);
  }
  return out.join('\n');
}

module.exports = { renderMarkdown, teaserMarkdown };
