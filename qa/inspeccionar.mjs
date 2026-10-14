#!/usr/bin/env node
/* =========================================================================
   inspeccionar.mjs — análisis forense de un sitio publicado (estándar web ab*se)

   Abre la URL con Playwright, recorre la página, corre detectar.js y guarda:
     · reporte.json      stack, librerías, shaders, modelos, fuentes, tokens,
                         terceros, métricas y hallazgos rápidos
     · escritorio.png    página completa a 1440 px
     · movil.png         página completa en iPhone (emulado en Chromium)
     · primer-pantallazo-*.png   lo que se ve al entrar, sin scroll
     · recorrido.webm    (con --video) video del scroll para estudiar el motion

   Uso:
     node qa/inspeccionar.mjs https://sitio.com [https://otro.com …] [--video] [--out qa/referencias]

   Requiere @playwright/test (o playwright) y Chromium:
     npm i -D @playwright/test && npx playwright install chromium

   Sirve para referencias de inspiración y para revisar sitios publicados,
   propios o ajenos. Solo lee: no envía formularios ni hace clic en nada.
   ========================================================================= */

import { readFileSync, mkdirSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium, devices;
try {
  ({ chromium, devices } = await import('@playwright/test'));
} catch {
  try {
    ({ chromium, devices } = await import('playwright'));
  } catch {
    console.error('Falta Playwright. Instala: npm i -D @playwright/test && npx playwright install chromium');
    process.exit(2);
  }
}

const aqui = dirname(fileURLToPath(import.meta.url));
// detectar.js es una expresión (IIFE async). Se le quita el comentario de cabecera
// y el punto y coma final para evaluarla como expresión pura.
const DETECTAR = readFileSync(join(aqui, 'detectar.js'), 'utf8')
  .replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')
  .trim()
  .replace(/;\s*$/, '');

const args = process.argv.slice(2);
const conVideo = args.includes('--video');
const iOut = args.indexOf('--out');
const base = iOut >= 0 ? args[iOut + 1] : join(aqui, 'referencias');
const urls = args.filter((a, i) => /^https?:\/\//.test(a) && args[i - 1] !== '--out');

if (!urls.length) {
  console.log('Uso: node qa/inspeccionar.mjs https://sitio.com [--video] [--out carpeta]');
  process.exit(2);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function recorrer(page, lento = false) {
  await page.evaluate(async (lento) => {
    const paso = Math.max(150, Math.floor(window.innerHeight * (lento ? 0.25 : 0.7)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, lento ? 120 : 200));
    }
    window.scrollTo(0, 0);
  }, lento);
  await esperar(500);
}

let navegador;
try {
  navegador = await chromium.launch();
} catch (e) {
  console.error('No se pudo abrir Chromium. Instálalo con: npx playwright install chromium');
  console.error(String(e.message).split('\n')[0]);
  process.exit(2);
}

for (const url of urls) {
  const host = new URL(url).host.replace(/[^\w.-]/g, '_');
  const dir = join(base, host);
  mkdirSync(dir, { recursive: true });
  console.log(`\n▶ ${url}`);

  try {
    // ── Escritorio ─────────────────────────────────────────────────────
    const ctx = await navegador.newContext({
      viewport: { width: 1440, height: 900 },
      ...(conVideo ? { recordVideo: { dir, size: { width: 1440, height: 900 } } } : {}),
    });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await esperar(2500); // intros y preloaders
    await page.screenshot({ path: join(dir, 'primer-pantallazo-escritorio.png') });

    // Métricas y detección antes del recorrido, para no mezclar el LCP con el scroll
    const reporte = await page.evaluate(DETECTAR);
    await recorrer(page, conVideo);
    await page.screenshot({ path: join(dir, 'escritorio.png'), fullPage: true });
    reporte.erroresDeConsola = errores.slice(0, 20);
    await ctx.close();

    if (conVideo) {
      const webm = readdirSync(dir).filter((f) => f.endsWith('.webm') && f !== 'recorrido.webm');
      if (webm.length) renameSync(join(dir, webm[webm.length - 1]), join(dir, 'recorrido.webm'));
    }

    // ── Móvil (iPhone emulado en Chromium) ─────────────────────────────
    const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
    const ctxM = await navegador.newContext(iphone);
    const pageM = await ctxM.newPage();
    await pageM.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await esperar(2500);
    await pageM.screenshot({ path: join(dir, 'primer-pantallazo-movil.png') });
    await recorrer(pageM);
    await pageM.screenshot({ path: join(dir, 'movil.png'), fullPage: true });
    reporte.movil = await pageM.evaluate(() => ({
      desbordamientoHorizontalPx: document.documentElement.scrollWidth - window.innerWidth,
      altoPaginaPx: document.documentElement.scrollHeight,
    }));
    await ctxM.close();

    writeFileSync(join(dir, 'reporte.json'), JSON.stringify(reporte, null, 2));

    // ── Resumen en consola ─────────────────────────────────────────────
    console.log(`  Framework:   ${reporte.framework.join(', ')}`);
    const libs = [...Object.keys(reporte.libreriasGlobales), ...Object.keys(reporte.firmasEnCodigo)];
    console.log(`  Librerías:   ${[...new Set(libs)].join(', ') || '—'}`);
    console.log(`  Fuentes:     ${reporte.tipografia.cargadas.join(' · ') || '—'}`);
    console.log(`  3D:          ${reporte.recursos.assets3D.join(', ') || '—'}`);
    console.log(`  Terceros:    ${reporte.terceros.join(', ') || '—'}`);
    if (reporte.movil.desbordamientoHorizontalPx > 0) reporte.hallazgos.push(`Desbordamiento horizontal en móvil de ${reporte.movil.desbordamientoHorizontalPx}px`);
    if (reporte.erroresDeConsola.length) reporte.hallazgos.push(`${reporte.erroresDeConsola.length} errores de consola`);
    writeFileSync(join(dir, 'reporte.json'), JSON.stringify(reporte, null, 2));
    console.log(`  Hallazgos:\n${reporte.hallazgos.map((h) => '    · ' + h).join('\n') || '    · ninguno automático'}`);
    console.log(`  Guardado en ${dir}`);
  } catch (e) {
    console.error(`  ✖ No se pudo inspeccionar: ${e.message}`);
  }
}

await navegador.close();
