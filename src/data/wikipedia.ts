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
      body: cleanBody(body, base),
    };
  } catch {
    return null;
  }
}
