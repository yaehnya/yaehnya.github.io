// Fetches a Wikipedia article page exactly as Wikipedia serves it (skin, sidebar, footer and all) for
// the game's level. Runs when the site is built (and on each request in dev). Scripts are dropped,
// links and images made absolute; Wikipedia's own stylesheets are linked so it looks the same.
// The page keeps Wikipedia's footer, which carries the CC BY-SA licence for the text.

export interface WikiPage {
  title: string;        // the document title, e.g. "Yeyo (músico) - Wikipedia, la enciclopedia libre"
  url: string;
  lang: string;
  htmlClass: string;
  bodyClass: string;
  styles: string[];     // stylesheet URLs
  body: string;         // the inside of <body>
}

const USER_AGENT = 'YeyoSite/1.0 (artist website; build-time fetch)';

const decode = (s: string) => s.replace(/&amp;/g, '&');
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? '';

function cleanBody(html: string, base: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/(href|src|action)="\/\//g, '$1="https://')
    .replace(/(href|src|action)="\/(?!\/)/g, `$1="${base}/`)
    .replace(/srcset="([^"]*)"/g, (_, set: string) =>
      `srcset="${set.replace(/(^|,\s*)\/\//g, '$1https://').replace(/(^|,\s*)\/(?!\/)/g, `$1${base}/`)}"`)
    .replace(/<a ([^>]*?)href="https:/g, '<a $1target="_blank" rel="noopener" href="https:');
}

// What the artist asked to have blacked out on the page, as a censored document is: the 2026 section's
// first two paragraphs (the accusation and his answer), the two articles they cite, and those words in
// the section's title. The paragraph about his return stays. The text itself is taken out of the page,
// not just covered: in its place, a black bar per word, as long as the word.
const SECTION = '2026: suspensión de La Obsesión Factory y regreso a la música';
const SECTION_ID = '2026:_suspensión_de_La_Obsesión_Factory_y_regreso_a_la_música';
const SECTION_FALLBACK = '2026:_suspensi.C3.B3n_de_La_Obsesi.C3.B3n_Factory_y_regreso_a_la_m.C3.BAsica';
const CITED = ['cite_note-infobae2026-10', 'cite_note-record2026-11'];
const KEEP = 'Tras un periodo alejado';

const plain = (html: string) => html.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, ' ');
const bars = (text: string) =>
  `<span class="yeyo-redacted" aria-label="Texto censurado">${text.trim().split(/\s+/).map(w => 'x'.repeat(w.length)).join(' ')}</span>`;

function redact(html: string) {
  const h = html.indexOf(`<h3 id="${SECTION_ID}"`);
  const keep = h < 0 ? -1 : html.indexOf(KEEP, h);
  if (keep < 0) return html;                       // the article changed: leave it as it is
  const from = html.indexOf('</div>', h) + 6, to = html.lastIndexOf('<p', keep);
  const middle = html.slice(from, to).replace(/<p([^>]*)>([\s\S]*?)<\/p>/g, (_, a: string, inner: string) => `<p${a}>${bars(plain(inner))}</p>`);
  html = html.slice(0, from) + middle + html.slice(to);
  for (const id of CITED) {
    const at = html.indexOf(`id="${id}"`);
    if (at < 0) continue;
    const start = html.lastIndexOf('<li', at), open = html.indexOf('>', start) + 1, end = html.indexOf('</li>', at);
    html = html.slice(0, open) + bars(plain(html.slice(open, end).replace(/<span class="mw-cite-backlink"[\s\S]*?<\/a><\/span>/, ''))) + html.slice(end);
  }
  return html
    .replace(`title="Editar sección: ${SECTION}"`, 'title="Editar sección: 2026"')
    .split(SECTION_ID).join('2026')
    .split(SECTION_FALLBACK).join('2026-')
    .split(SECTION).join(`2026: ${bars('suspensión de La Obsesión Factory y')} regreso a la música`);
}

export async function fetchPage(lang: string, title: string): Promise<WikiPage | null> {
  const base = `https://${lang}.wikipedia.org`;
  const url = `${base}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const html = await res.text();
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1];
    if (!body) return null;
    return {
      title: decode(/<title>([^<]*)<\/title>/.exec(head)?.[1] ?? title),
      url,
      lang,
      htmlClass: attr(/<html[^>]*>/.exec(html)?.[0] ?? '', 'class'),
      bodyClass: attr(/<body[^>]*>/.exec(html)?.[0] ?? '', 'class'),
      styles: [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => base + decode(m[1])),
      body: redact(cleanBody(body, base)),
    };
  } catch {
    return null;
  }
}
