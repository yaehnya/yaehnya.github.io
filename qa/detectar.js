/* =========================================================================
   detectar.js — inspección técnica de un sitio publicado (estándar web ab*se)

   Es una expresión que devuelve una Promise con un reporte JSON. Se puede:
     · ejecutar en la consola del navegador o con una herramienta de
       ejecución de JavaScript en la página (resuelve con top-level await),
     · o correr con scripts/inspeccionar.mjs (Playwright), que lo lee y lo evalúa.

   Solo lee: no modifica la página ni crea contextos WebGL nuevos.
   Las detecciones son pistas, no pruebas: confírmalas mirando el código.
   ========================================================================= */
(async () => {
  const unico = (a) => [...new Set(a.filter(Boolean))];
  const origen = location.origin;
  const r = { url: location.href, fecha: new Date().toISOString() };

  // ── Metadata ──────────────────────────────────────────────────────────
  const meta = {};
  document.querySelectorAll('meta').forEach((m) => {
    const k = m.getAttribute('property') || m.getAttribute('name');
    if (k && !(k in meta)) meta[k] = (m.getAttribute('content') || '').slice(0, 300);
  });
  r.metadata = {
    title: document.title,
    lang: document.documentElement.lang || null,
    canonical: document.querySelector('link[rel=canonical]')?.href || null,
    generator: meta.generator || null,
    robots: meta.robots || null,
    og: Object.fromEntries(Object.entries(meta).filter(([k]) => /^(og|twitter):/.test(k))),
    description: meta.description || null,
  };
  const ogUrls = [meta['og:image'], meta['og:url'], meta['twitter:image'], r.metadata.canonical].filter(Boolean);
  r.metadata.alertas = [
    ...ogUrls.filter((u) => /localhost|127\.0\.0\.1/.test(u)).map((u) => `URL de metadata en localhost: ${u}`),
    ...ogUrls.filter((u) => /\.(vercel\.app|netlify\.app|pages\.dev)/.test(u)).map((u) => `URL de metadata en dominio de preview: ${u}`),
    ...ogUrls.filter((u) => !/^https?:\/\//.test(u)).map((u) => `URL de metadata relativa: ${u}`),
    ...(/noindex/i.test(meta.robots || '') ? ['La página tiene noindex'] : []),
  ];

  // ── Scripts, estilos e import maps ────────────────────────────────────
  const scripts = [...document.scripts];
  const srcs = scripts.map((s) => s.src).filter(Boolean);
  r.scripts = {
    externos: srcs.filter((s) => !s.startsWith(origen)),
    propios: srcs.filter((s) => s.startsWith(origen)).slice(0, 40),
    inline: scripts.filter((s) => !s.src).length,
    importmap: scripts.find((s) => s.type === 'importmap')?.textContent.trim().slice(0, 1500) || null,
  };
  r.estilos = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href);
  r.terceros = unico([...srcs, ...r.estilos].map((u) => { try { return new URL(u).host; } catch { return null; } }))
    .filter((h) => h !== location.host);

  // ── Framework / plataforma ────────────────────────────────────────────
  const html = document.documentElement.outerHTML;
  const fw = [];
  if (window.__NEXT_DATA__ || self.__next_f || /\/_next\//.test(html)) fw.push(`Next.js${window.next?.version ? ' ' + window.next.version : ''}${/turbopack/.test(html) ? ' (Turbopack)' : ''}`);
  if (window.__NUXT__ || /\/_nuxt\//.test(html)) fw.push('Nuxt');
  if (document.querySelector('astro-island') || /\/_astro\//.test(html)) fw.push('Astro');
  if (window.__sveltekit || /__sveltekit/.test(html)) fw.push('SvelteKit');
  if (window.___gatsby || document.getElementById('___gatsby')) fw.push('Gatsby');
  if (window.__remixContext) fw.push('Remix / React Router');
  if (document.documentElement.dataset.wfSite || /webflow/i.test(meta.generator || '')) fw.push('Webflow');
  if (/framerusercontent\.com|framer\.com\/m\//.test(html)) fw.push('Framer');
  if (/wixstatic\.com|wix\.com/.test(html)) fw.push('Wix');
  if (window.Shopify) fw.push('Shopify');
  if (/wp-content|wp-includes/.test(html)) fw.push('WordPress');
  if (/squarespace/i.test(html)) fw.push('Squarespace');
  if (!fw.length && srcs.some((s) => /\/assets\/index-[\w-]+\.js/.test(s))) fw.push('Vite (SPA)');
  if (!fw.length) fw.push('HTML/JS sin framework detectable');
  r.framework = fw;

  // ── Librerías por variables globales ──────────────────────────────────
  const g = window;
  const libs = {};
  if (g.gsap) libs.gsap = g.gsap.version || true;
  if (g.ScrollTrigger) libs.ScrollTrigger = true;
  if (g.THREE || g.__THREE__) libs.three = g.THREE?.REVISION || g.__THREE__ || true;
  if (g.Lenis || g.lenis) libs.lenis = true;
  if (g.LocomotiveScroll) libs.locomotive = true;
  if (g.barba) libs.barba = true;
  if (g.Swup || g.swup) libs.swup = true;
  if (g.PIXI) libs.pixi = g.PIXI.VERSION || true;
  if (g.lottie || g.bodymovin) libs.lottie = true;
  if (g.anime) libs.anime = true;
  if (g.p5) libs.p5 = true;
  if (g.Howl) libs.howler = true;
  if (g.Tone) libs.tone = true;
  if (g.Swiper) libs.swiper = true;
  if (g.jQuery) libs.jquery = g.jQuery.fn?.jquery || true;
  if (document.querySelector('spline-viewer')) libs.spline = true;
  if (document.querySelector('model-viewer')) libs['model-viewer'] = true;
  r.libreriasGlobales = libs;

  // ── Firmas dentro del código (scripts propios del sitio) ──────────────
  const firmas = {
    gsap: /gsap|GreenSock/, ScrollTrigger: /ScrollTrigger/, SplitText: /SplitText/,
    lenis: /lenis/i, locomotive: /locomotive-scroll|LocomotiveScroll/,
    three: /WebGLRenderer|three\.module|REVISION\s*=\s*["']\d/, webgpu: /WebGPURenderer|navigator\.gpu/,
    r3f: /@react-three\/fiber|useFrame/, drei: /@react-three\/drei/, ogl: /from\s*["']ogl["']|new\s+Renderer\(\{[^}]*dpr/,
    framerMotion: /framer-motion|motion\/react/, glsl: /gl_FragColor|gl_Position|precision\s+(high|medium)p\s+float/,
    wgsl: /@fragment|@vertex|@compute/, gltf: /GLTFLoader/, draco: /DRACOLoader/, ktx2: /KTX2Loader/, meshopt: /MeshoptDecoder/,
    splats: /sparkjs|SplatMesh|gaussian[-_ ]?splat|\.(spz|ksplat)\b/i, rive: /@rive-app|rive\.wasm/, matter: /Matter\.Engine/, tsparticles: /tsparticles/,
    swiper: /swiper/i, barba: /@barba|barba\.init/, viewTransitions: /startViewTransition/, lucide: /lucide/,
    tailwind: /tailwindcss|--tw-/, react: /react-dom|__reactFiber|createRoot/, vue: /createApp\(|__vue_app__/, svelte: /svelte/,
  };
  const encontrados = {};
  const archivos = [];
  for (const s of srcs.filter((u) => u.startsWith(origen)).slice(0, 30)) {
    try {
      const t = await (await fetch(s)).text();
      if (t.length > 6e6) continue;
      archivos.push({ src: s.replace(origen, ''), kb: Math.round(t.length / 1024) });
      for (const [k, re] of Object.entries(firmas)) if (re.test(t)) encontrados[k] = (encontrados[k] || 0) + 1;
    } catch { /* recurso no accesible */ }
  }
  for (const s of scripts.filter((x) => !x.src)) {
    for (const [k, re] of Object.entries(firmas)) if (re.test(s.textContent)) encontrados[k] = (encontrados[k] || 0) + 1;
  }
  r.firmasEnCodigo = encontrados;
  r.archivosJS = archivos;

  // ── Comentarios y pistas de autoría ───────────────────────────────────
  const comentarios = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim()).filter((c) => c.length > 3 && !/^\/?\$|^\[if/.test(c));
  r.comentariosHTML = comentarios.slice(0, 15).map((c) => c.slice(0, 200));
  r.pistasDeAutoria = unico([
    /lovable/i.test(html) && 'menciona Lovable',
    /v0\.dev|v0\.app/i.test(html) && 'menciona v0',
    /bolt\.new/i.test(html) && 'menciona Bolt',
    /emil-design-eng/i.test(html) && 'cita la skill emil-design-eng (flujo con Claude Code)',
    comentarios.some((c) => c.length > 120) && 'comentarios HTML largos y explicativos (frecuentes en código generado con AI)',
  ]);

  // ── Tipografía ────────────────────────────────────────────────────────
  const familias = unico([...document.querySelectorAll('body *')].slice(0, 600).map((e) => getComputedStyle(e).fontFamily));
  const cargadas = [];
  try { document.fonts.forEach((f) => { if (f.status === 'loaded') cargadas.push(`${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`); }); } catch { /* sin FontFaceSet */ }
  r.tipografia = { familiasEnUso: familias.slice(0, 12), cargadas: unico(cargadas).slice(0, 20) };

  // ── Tokens CSS (:root) de hojas del mismo origen ──────────────────────
  const tokens = {};
  for (const hoja of [...document.styleSheets]) {
    let reglas;
    try { reglas = hoja.cssRules; } catch { continue; } // hoja de otro origen
    for (const regla of [...(reglas || [])]) {
      const lista = regla.cssRules ? [regla, ...regla.cssRules] : [regla];
      for (const rr of lista) {
        if (rr.selectorText && /(^|,)\s*:root\b/.test(rr.selectorText)) {
          for (const p of [...rr.style]) if (p.startsWith('--') && Object.keys(tokens).length < 120) tokens[p] = rr.style.getPropertyValue(p).trim().slice(0, 120);
        }
      }
    }
  }
  r.tokensCSS = tokens;

  // ── Clases (pistas de Tailwind, BEM, CSS modules) ─────────────────────
  const clases = unico([...document.querySelectorAll('[class]')].flatMap((e) => (typeof e.className === 'string' ? e.className.split(/\s+/) : [])));
  r.clases = {
    total: clases.length,
    muestra: clases.slice(0, 60),
    tailwind: clases.filter((c) => /^(sm|md|lg|xl):|\[.+\]|^(w|h|p|m|px|py|mt|mb|gap|text|bg)-/.test(c)).length > 15,
    cssModules: clases.some((c) => /_[a-zA-Z0-9]{5}$|__\w+_\w{5}/.test(c)),
  };

  // ── Media, canvas y assets cargados ───────────────────────────────────
  r.media = {
    canvas: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}${c.className ? ' .' + String(c.className).split(' ')[0] : ''}`),
    videosTotal: document.querySelectorAll('video').length,
    videos: [...document.querySelectorAll('video')].slice(0, 12).map((v) => ({ src: (v.currentSrc || v.src || v.querySelector('source')?.src || '').replace(origen, ''), muted: v.muted, autoplay: v.autoplay, loop: v.loop, poster: !!v.poster, playsinline: v.playsInline, preload: v.preload })),
    videosSinPoster: [...document.querySelectorAll('video')].filter((v) => !v.poster).length,
    imagenes: document.images.length,
    imagenesSinAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    svgInline: document.querySelectorAll('svg').length,
  };
  const recursos = performance.getEntriesByType('resource');
  const porTipo = {};
  for (const e of recursos) {
    const ext = (e.name.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || e.initiatorType || 'otro').toLowerCase();
    porTipo[ext] = porTipo[ext] || { n: 0, kb: 0 };
    porTipo[ext].n += 1;
    porTipo[ext].kb += Math.round((e.transferSize || e.encodedBodySize || 0) / 1024);
  }
  r.recursos = {
    porTipo,
    totalKB: Object.values(porTipo).reduce((a, b) => a + b.kb, 0),
    assets3D: recursos.map((e) => e.name).filter((n) => /\.(glb|gltf|hdr|exr|ktx2|basis|splat|spz|ksplat|ply|usdz|wasm)(\?|$)/i.test(n)).map((n) => n.replace(origen, '')),
    fuentes: recursos.map((e) => e.name).filter((n) => /\.(woff2?|ttf|otf)(\?|$)/i.test(n)).map((n) => n.replace(origen, '')),
  };

  // ── Métricas observables en esta sesión ───────────────────────────────
  const leer = (tipo) => new Promise((ok) => {
    try {
      const entradas = [];
      const po = new PerformanceObserver((l) => entradas.push(...l.getEntries()));
      po.observe({ type: tipo, buffered: true });
      setTimeout(() => { po.disconnect(); ok(entradas); }, 300);
    } catch { ok([]); }
  });
  const lcp = (await leer('largest-contentful-paint')).pop();
  const cls = (await leer('layout-shift')).filter((e) => !e.hadRecentInput).reduce((a, e) => a + e.value, 0);
  const nav = performance.getEntriesByType('navigation')[0];
  r.metricas = {
    lcpMs: lcp ? Math.round(lcp.startTime) : null,
    lcpElemento: lcp?.element ? lcp.element.tagName.toLowerCase() + (lcp.element.className ? '.' + String(lcp.element.className).split(' ')[0] : '') : null,
    cls: Math.round(cls * 1000) / 1000,
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadMs: nav ? Math.round(nav.loadEventEnd) : null,
    nota: 'Medido en esta visita y este equipo; para cifras comparables usa Lighthouse móvil.',
  };

  // ── Estructura y accesibilidad rápida ─────────────────────────────────
  r.estructura = {
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 80)),
    secciones: [...document.querySelectorAll('main > section, main > div, body > section, [id]')].filter((e) => e.offsetHeight > 200).slice(0, 25).map((e) => e.id || e.className?.toString().split(' ')[0] || e.tagName.toLowerCase()),
    altoPaginaPx: document.documentElement.scrollHeight,
    respetaReducedMotion: /prefers-reduced-motion/.test([...document.styleSheets].map((h) => { try { return [...h.cssRules].map((x) => x.cssText).join(''); } catch { return ''; } }).join('')),
    cursorCustom: getComputedStyle(document.body).cursor === 'none' || !!document.querySelector('[class*=cursor]'),
  };

  // ── Hallazgos rápidos (punto de partida para la revisión) ─────────────
  const og = r.metadata.og;
  const mbMedia = ((porTipo.mp4?.kb || 0) + (porTipo.webm?.kb || 0) + (porTipo.mov?.kb || 0)) / 1024;
  r.hallazgos = unico([
    ...r.metadata.alertas,
    !og['og:image'] && 'Falta og:image: el link se comparte sin imagen',
    !og['og:url'] && 'Falta og:url',
    !r.metadata.canonical && 'Falta canonical',
    !r.metadata.description && 'Falta meta description',
    og['twitter:card'] === 'summary' && 'twitter:card es "summary" (tarjeta chica); para portafolios conviene summary_large_image',
    !r.metadata.lang && 'Falta lang en <html>',
    r.estructura.h1.length === 0 && 'No hay <h1>',
    r.estructura.h1.length > 1 && `Hay ${r.estructura.h1.length} <h1>`,
    r.media.imagenesSinAlt > 0 && `${r.media.imagenesSinAlt} imágenes sin alt`,
    r.media.videosSinPoster > 0 && `${r.media.videosSinPoster} de ${r.media.videosTotal} videos sin poster`,
    mbMedia > 10 && `${mbMedia.toFixed(0)} MB de video descargados en esta visita`,
    r.recursos.totalKB > 5120 && `${(r.recursos.totalKB / 1024).toFixed(1)} MB transferidos en total en esta visita`,
    !r.estructura.respetaReducedMotion && 'No se encontró ninguna regla prefers-reduced-motion en el CSS accesible',
    r.metricas.lcpMs > 2500 && `LCP de ${r.metricas.lcpMs} ms en esta visita (confírmalo con Lighthouse: una pestaña en segundo plano o una intro que espera scroll lo distorsionan)`,
    r.metricas.cls > 0.1 && `CLS de ${r.metricas.cls}`,
    r.recursos.fuentes.some((f) => /\.(ttf|otf)/i.test(f)) && 'Fuentes en TTF/OTF en lugar de woff2',
    r.terceros.length > 5 && `${r.terceros.length} dominios de terceros cargando recursos`,
  ]);

  return r;
})();
