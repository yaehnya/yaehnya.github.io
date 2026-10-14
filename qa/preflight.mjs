#!/usr/bin/env node
/* =========================================================================
   preflight.mjs — revisión previa al deploy (estándar web ab*se)

   Sin dependencias. Requiere Node 18+.

   Uso:
     node qa/preflight.mjs <carpeta-del-build> [--domain https://dominio.com]
                           [--allow-noindex /link,/privado]
     node qa/preflight.mjs --url https://dominio.com [--url https://dominio.com/otra]

   Modo build: revisa los archivos generados (dist/, out/, .vercel/output/static…).
   Modo URL:   revisa el sitio publicado, incluida la respuesta del og:image.

   Sale con código 1 si hay errores, para que CI o un hook detengan el deploy.
   ========================================================================= */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

// ── Umbrales ────────────────────────────────────────────────────────────
const LIMITES = {
  imagenKB: 500,           // aviso por imagen
  jsGzipKB: 150,           // aviso por archivo JS (gzip)
  modeloMB: 5,             // aviso por .glb/.gltf
  videoMB: 10,             // aviso por video
  importantMax: 20,        // aviso si un CSS supera esta cantidad de !important
  ogImageKB: 300,          // aviso si la imagen OG pesa más
};

const DOMINIOS_PREVIEW = /\b[\w-]+\.(vercel\.app|netlify\.app|pages\.dev|onrender\.com|github\.io)\b/i;
const LOCAL = /\b(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\b/i;
const LOREM = /lorem ipsum|dolor sit amet/i;
const PENDIENTE = /\[PENDIENTE/i;

// ── Utilidades de salida ────────────────────────────────────────────────
const hallazgos = [];
const error = (donde, msg) => hallazgos.push({ nivel: 'error', donde, msg });
const aviso = (donde, msg) => hallazgos.push({ nivel: 'aviso', donde, msg });

function reportar() {
  const errores = hallazgos.filter((h) => h.nivel === 'error');
  const avisos = hallazgos.filter((h) => h.nivel === 'aviso');
  const porLugar = new Map();
  for (const h of hallazgos) {
    if (!porLugar.has(h.donde)) porLugar.set(h.donde, []);
    porLugar.get(h.donde).push(h);
  }
  for (const [donde, lista] of porLugar) {
    console.log(`\n${donde}`);
    for (const h of lista) console.log(`  ${h.nivel === 'error' ? '✖' : '⚠'} ${h.msg}`);
  }
  console.log(`\n${errores.length} error(es), ${avisos.length} aviso(s).`);
  if (errores.length === 0) console.log('Preflight OK: sin errores bloqueantes.');
  process.exit(errores.length ? 1 : 0);
}

// ── Parser mínimo de HTML (suficiente para <head> y atributos) ──────────
function atributos(tag) {
  const attrs = {};
  const re = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const cuerpo = tag.replace(/^<\w+/, '').replace(/\/?>$/, '');
  let m;
  while ((m = re.exec(cuerpo))) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  }
  return attrs;
}

function etiquetas(html, nombre) {
  return (html.match(new RegExp(`<${nombre}\\b[^>]*>`, 'gi')) || []).map(atributos);
}

function meta(html) {
  const out = {};
  for (const a of etiquetas(html, 'meta')) {
    const clave = (a.property || a.name || '').toLowerCase();
    if (clave && !(clave in out)) out[clave] = a.content ?? '';
  }
  return out;
}

function esAbsoluta(url) {
  return /^https:\/\//i.test(url || '');
}

function host(url) {
  try { return new URL(url).host; } catch { return null; }
}

// ── Revisión de un documento HTML (común a ambos modos) ─────────────────
function revisarHTML(html, donde, { dominio, permitirNoindex = false } = {}) {
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
  const m = meta(sinComentarios);
  const htmlTag = etiquetas(sinComentarios, 'html')[0] || {};

  // Básicos
  if (!/<title>[^<]+<\/title>/i.test(sinComentarios)) error(donde, 'Falta <title> o está vacío.');
  if (!m.description) error(donde, 'Falta <meta name="description">.');
  if (!htmlTag.lang) error(donde, 'Falta el atributo lang en <html> (p. ej. lang="es-MX").');
  if (!m.viewport) error(donde, 'Falta <meta name="viewport">.');

  // Open Graph / Twitter
  for (const clave of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!m[clave]) error(donde, `Falta ${clave}.`);
  }
  if (!m['twitter:card']) aviso(donde, 'Falta twitter:card (recomendado: summary_large_image).');
  if (m['og:image'] && !m['og:image:alt']) aviso(donde, 'Falta og:image:alt.');

  const canonical = etiquetas(sinComentarios, 'link').find((l) => (l.rel || '').toLowerCase() === 'canonical');
  if (!canonical) aviso(donde, 'Falta <link rel="canonical">.');

  const urlsClave = {
    'og:image': m['og:image'],
    'og:url': m['og:url'],
    'twitter:image': m['twitter:image'],
    canonical: canonical?.href,
  };
  for (const [clave, url] of Object.entries(urlsClave)) {
    if (!url) continue;
    if (LOCAL.test(url)) error(donde, `${clave} apunta a localhost: ${url}`);
    else if (!esAbsoluta(url)) error(donde, `${clave} no es una URL absoluta con https: ${url}`);
    else if (DOMINIOS_PREVIEW.test(url)) error(donde, `${clave} usa un dominio de preview: ${url}`);
    else if (dominio && host(url) !== host(dominio)) error(donde, `${clave} no usa el dominio final (${host(dominio)}): ${url}`);
  }

  // Indexación
  const robots = (m.robots || '') + ' ' + (m.googlebot || '');
  if (/noindex/i.test(robots)) {
    if (permitirNoindex) aviso(donde, 'noindex presente (permitido explícitamente).');
    else error(donde, 'La página tiene noindex. Si es intencional, pásala en --allow-noindex.');
  }

  // Contenido de relleno y rastros de desarrollo
  if (LOCAL.test(sinComentarios)) error(donde, 'El HTML contiene referencias a localhost.');
  if (LOREM.test(sinComentarios)) error(donde, 'Contiene lorem ipsum.');
  if (PENDIENTE.test(sinComentarios)) error(donde, 'Contiene marcadores [PENDIENTE] sin resolver.');
  if (DOMINIOS_PREVIEW.test(sinComentarios)) aviso(donde, 'Menciona un dominio de preview (*.vercel.app, *.netlify.app…).');

  // Imágenes
  const imgs = etiquetas(sinComentarios, 'img');
  const sinAlt = imgs.filter((a) => !('alt' in a));
  if (sinAlt.length) error(donde, `${sinAlt.length} <img> sin atributo alt (usa alt="" si es decorativa).`);
  const sinDim = imgs.filter((a) => !('width' in a && 'height' in a) && !/aspect-ratio/i.test(a.style || ''));
  if (sinDim.length) aviso(donde, `${sinDim.length} <img> sin width/height (riesgo de saltos de layout).`);

  // Estructura
  const h1 = (sinComentarios.match(/<h1\b/gi) || []).length;
  if (h1 === 0) aviso(donde, 'No hay <h1>.');
  if (h1 > 1) aviso(donde, `Hay ${h1} <h1>; normalmente debe haber uno.`);

  // Iconos
  const iconos = etiquetas(sinComentarios, 'link').filter((l) => /icon/i.test(l.rel || ''));
  if (!iconos.length) aviso(donde, 'No se declara favicon.');

  return m;
}

// ── Modo build ──────────────────────────────────────────────────────────
function listar(dir) {
  const out = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules' || nombre.startsWith('.git')) continue;
    const ruta = join(dir, nombre);
    const st = statSync(ruta);
    if (st.isDirectory()) out.push(...listar(ruta));
    else out.push({ ruta, tam: st.size });
  }
  return out;
}

function rutaDePagina(raiz, archivo) {
  let r = '/' + relative(raiz, archivo).split(sep).join('/');
  r = r.replace(/index\.html$/, '').replace(/\.html$/, '');
  return r || '/';
}

function revisarBuild(raiz, { dominio, rutasNoindex }) {
  if (!existsSync(raiz) || !statSync(raiz).isDirectory()) {
    console.error(`No existe la carpeta de build: ${raiz}`);
    process.exit(2);
  }
  const archivos = listar(raiz);
  const html = archivos.filter((f) => extname(f.ruta) === '.html');
  if (!html.length) error(raiz, 'No se encontraron archivos .html (¿es la carpeta correcta del build?).');

  for (const f of html) {
    const ruta = rutaDePagina(raiz, f.ruta);
    const donde = relative(raiz, f.ruta);
    if (/^\/?404/.test(ruta) || /^\/?500/.test(ruta)) continue; // páginas de error: sin exigencias de OG
    const permitirNoindex = rutasNoindex.some((r) => ruta === r || ruta === r + '/' || ruta.replace(/\/$/, '') === r);
    revisarHTML(readFileSync(f.ruta, 'utf8'), donde, { dominio, permitirNoindex });
  }

  if (!html.some((f) => /(^|[\\/])404(\.html|[\\/]index\.html)$/.test(f.ruta))) {
    aviso(raiz, 'No hay página 404 propia.');
  }

  // robots y sitemap
  const robotsPath = join(raiz, 'robots.txt');
  if (!existsSync(robotsPath)) aviso(raiz, 'Falta robots.txt.');
  else {
    const robots = readFileSync(robotsPath, 'utf8');
    if (/^\s*Disallow:\s*\/\s*$/im.test(robots)) error('robots.txt', 'Bloquea todo el sitio (Disallow: /).');
    if (LOCAL.test(robots)) error('robots.txt', 'Contiene localhost.');
  }
  const haySitemap = archivos.some((f) => /sitemap[^/\\]*\.xml$/i.test(f.ruta));
  if (!haySitemap) aviso(raiz, 'No hay sitemap.xml.');
  for (const f of archivos.filter((x) => /sitemap[^/\\]*\.xml$/i.test(x.ruta))) {
    const xml = readFileSync(f.ruta, 'utf8');
    if (LOCAL.test(xml)) error(relative(raiz, f.ruta), 'El sitemap contiene localhost.');
    if (dominio && !xml.includes(host(dominio))) aviso(relative(raiz, f.ruta), `El sitemap no menciona ${host(dominio)}.`);
  }

  // Assets
  for (const f of archivos) {
    const ext = extname(f.ruta).toLowerCase();
    const donde = relative(raiz, f.ruta);
    const kb = f.tam / 1024;
    if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext) && kb > LIMITES.imagenKB) {
      aviso(donde, `Imagen de ${kb.toFixed(0)} KB (límite sugerido ${LIMITES.imagenKB} KB).`);
    }
    if (['.png', '.jpg', '.jpeg'].includes(ext) && kb > 150) {
      aviso(donde, 'Considera AVIF/WebP para esta imagen.');
    }
    if (['.glb', '.gltf'].includes(ext) && kb / 1024 > LIMITES.modeloMB) {
      aviso(donde, `Modelo de ${(kb / 1024).toFixed(1)} MB. ¿Pasó por gltf-transform?`);
    }
    if (['.mp4', '.webm', '.mov'].includes(ext) && kb / 1024 > LIMITES.videoMB) {
      aviso(donde, `Video de ${(kb / 1024).toFixed(1)} MB.`);
    }
    if (ext === '.mov') aviso(donde, 'Archivo .mov en producción; usa WebM/MP4.');
    if (['.ttf', '.otf'].includes(ext)) aviso(donde, 'Fuente en TTF/OTF; usa woff2 con subset.');
    if (ext === '.js' || ext === '.mjs') {
      const codigo = readFileSync(f.ruta);
      const gz = gzipSync(codigo).length / 1024;
      if (gz > LIMITES.jsGzipKB) aviso(donde, `JS de ${gz.toFixed(0)} KB gzip. Si carga al inicio, divídelo o difiérelo.`);
      const texto = codigo.toString('utf8');
      const logs = (texto.match(/console\.log\(/g) || []).length;
      if (logs) aviso(donde, `${logs} console.log en producción.`);
      if (/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(texto)) aviso(donde, 'El JS contiene URLs a localhost.');
    }
    if (ext === '.css') {
      const css = readFileSync(f.ruta, 'utf8');
      const imp = (css.match(/!important/g) || []).length;
      if (imp > LIMITES.importantMax) aviso(donde, `${imp} usos de !important.`);
    }
  }
}

// ── Modo URL ────────────────────────────────────────────────────────────
async function revisarURL(url) {
  const donde = url;
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'facebookexternalhit/1.1 (preflight ab*se)' } });
  } catch (e) {
    error(donde, `No se pudo abrir: ${e.message}`);
    return;
  }
  if (!res.ok) { error(donde, `Responde ${res.status}.`); return; }
  if (res.url !== url) aviso(donde, `Redirige a ${res.url}.`);
  if (/noindex/i.test(res.headers.get('x-robots-tag') || '')) error(donde, 'Cabecera X-Robots-Tag con noindex.');
  if (!res.url.startsWith('https://')) error(donde, 'No se sirve por HTTPS.');

  const html = await res.text();
  const m = revisarHTML(html, donde, { dominio: res.url });

  // og:image accesible y ligera
  const og = m['og:image'];
  if (og && esAbsoluta(og) && !LOCAL.test(og)) {
    try {
      let img = await fetch(og, { method: 'HEAD', redirect: 'follow' });
      if (!img.ok || !img.headers.get('content-type')) img = await fetch(og, { redirect: 'follow' });
      const tipo = img.headers.get('content-type') || '';
      if (!img.ok) error(donde, `og:image responde ${img.status}: ${og}`);
      else if (!tipo.startsWith('image/')) error(donde, `og:image no devuelve una imagen (content-type: ${tipo}).`);
      const largo = Number(img.headers.get('content-length') || 0) / 1024;
      if (largo > LIMITES.ogImageKB) aviso(donde, `og:image pesa ${largo.toFixed(0)} KB (sugerido < ${LIMITES.ogImageKB} KB).`);
    } catch (e) {
      error(donde, `No se pudo descargar og:image: ${e.message}`);
    }
  }

  // robots.txt del origen
  try {
    const origen = new URL(res.url).origin;
    const r = await fetch(origen + '/robots.txt');
    if (!r.ok) aviso(origen, 'robots.txt no responde.');
    else if (/^\s*Disallow:\s*\/\s*$/im.test(await r.text())) error(origen, 'robots.txt bloquea todo el sitio.');
  } catch { /* sin red: ya se reportó arriba */ }
}

// ── Entrada ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const valor = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const urls = args.flatMap((a, i) => (a === '--url' ? [args[i + 1]] : []));

if (urls.length) {
  for (const u of urls) await revisarURL(u);
  reportar();
} else {
  const carpeta = args.find((a, i) => !a.startsWith('--') && !['--domain', '--allow-noindex'].includes(args[i - 1]));
  if (!carpeta) {
    console.log('Uso: node qa/preflight.mjs <carpeta-del-build> [--domain https://dominio.com] [--allow-noindex /ruta,/otra]');
    console.log('     node qa/preflight.mjs --url https://dominio.com');
    process.exit(2);
  }
  const dominio = valor('--domain');
  if (dominio && !esAbsoluta(dominio)) {
    console.error('--domain debe ser una URL con https://');
    process.exit(2);
  }
  const rutasNoindex = (valor('--allow-noindex') || '').split(',').map((s) => s.trim()).filter(Boolean);
  revisarBuild(carpeta, { dominio, rutasNoindex });
  reportar();
}
