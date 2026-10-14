/* Pruebas de QA del estándar web ab*se.
   Requiere: @playwright/test y @axe-core/playwright (dependencias de desarrollo)
   y los navegadores: npx playwright install chromium webkit

   Qué revisa por cada ruta:
     1. Errores de consola, excepciones y fallas de red.
     2. Screenshots de página completa (4 anchos en escritorio + iPhone) y
        desbordamiento horizontal.
     3. Accesibilidad con axe (WCAG 2.1 A y AA).
     4. Movimiento reducido: el contenido queda visible sin animaciones.
     5. Teclado: el primer Tab enfoca algo con indicador visible.

   Los screenshots quedan en qa/screenshots/ para revisarlos a ojo.              */

import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RUTAS = (process.env.QA_RUTAS ?? '/').split(',').map((r) => r.trim()).filter(Boolean);
const ANCHOS = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
];

function nombreRuta(ruta: string) {
  return ruta === '/' ? 'inicio' : ruta.replace(/^\/|\/$/g, '').replace(/\//g, '_');
}

function carpetaScreens(info: TestInfo) {
  const dir = join(dirname(info.config.configFile ?? join(process.cwd(), 'qa', 'x')), 'screenshots');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function vigilar(page: Page) {
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`consola: ${m.text()}`); });
  page.on('pageerror', (e) => errores.push(`excepción: ${e.message}`));
  page.on('requestfailed', (r) => {
    const motivo = r.failure()?.errorText ?? '';
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(motivo)) errores.push(`red: ${r.url()} (${motivo})`);
  });
  page.on('response', (r) => { if (r.status() >= 400) errores.push(`HTTP ${r.status()}: ${r.url()}`); });
  return errores;
}

async function cargar(page: Page, ruta: string) {
  await page.goto(ruta, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

// Baja hasta el final para disparar la carga diferida y las animaciones de entrada.
async function recorrer(page: Page) {
  await page.evaluate(async () => {
    const paso = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

for (const ruta of RUTAS) {
  test.describe(`Ruta ${ruta}`, () => {
    test('sin errores de consola ni de red', async ({ page }) => {
      const errores = vigilar(page);
      await cargar(page, ruta);
      await recorrer(page);
      expect(errores, errores.join('\n')).toEqual([]);
    });

    test('screenshots y sin desbordamiento horizontal', async ({ page }, info) => {
      const dir = carpetaScreens(info);
      const anchos = info.project.name === 'chromium' ? ANCHOS : [null];
      for (const a of anchos) {
        if (a) await page.setViewportSize({ width: a.w, height: a.h });
        await cargar(page, ruta);
        await recorrer(page);
        const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect.soft(desborde, `Desbordamiento horizontal de ${desborde}px (${a ? a.w + 'px' : info.project.name})`).toBeLessThanOrEqual(0);
        const archivo = `${nombreRuta(ruta)}-${info.project.name}-${a ? a.w : 'nativo'}.png`;
        await page.screenshot({ path: join(dir, archivo), fullPage: true });
      }
    });

    test('accesibilidad (axe, WCAG 2.1 AA)', async ({ page }) => {
      await cargar(page, ruta);
      await recorrer(page);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const resumen = r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} elemento(s)`);
      expect(r.violations, resumen.join('\n')).toEqual([]);
    });

    test('movimiento reducido: el contenido queda visible', async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await cargar(page, ruta);
      const ocultos = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, p, li, a, button, img')]
          .filter((el) => {
            const caja = el.getBoundingClientRect();
            if (caja.width === 0 || caja.height === 0) return false; // no renderizado a propósito
            if (el.closest('[aria-hidden="true"], [hidden], dialog:not([open])')) return false;
            let nodo: Element | null = el;
            while (nodo) {
              const s = getComputedStyle(nodo);
              if (parseFloat(s.opacity) < 0.1 || s.visibility === 'hidden') return true;
              nodo = nodo.parentElement;
            }
            return false;
          })
          .slice(0, 10)
          .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`),
      );
      expect.soft(ocultos, `Elementos invisibles con movimiento reducido:\n${ocultos.join('\n')}`).toEqual([]);
      await page.screenshot({ path: join(carpetaScreens(info), `${nombreRuta(ruta)}-${info.project.name}-reducido.png`), fullPage: true });
    });

    test('teclado: el foco es visible', async ({ page }, info) => {
      test.skip(info.project.name === 'iphone', 'Sin teclado físico en este perfil');
      await cargar(page, ruta);
      await page.keyboard.press('Tab');
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
        const sombra = s.boxShadow !== 'none';
        return { elemento: el.tagName.toLowerCase(), visible: contorno || sombra };
      });
      expect(foco, 'El primer Tab no enfoca ningún elemento').not.toBeNull();
      expect.soft(foco?.visible, `El primer elemento enfocado (${foco?.elemento}) no muestra outline ni sombra de foco`).toBeTruthy();
    });
  });
}
