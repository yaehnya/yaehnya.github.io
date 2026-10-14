/* Configuración de Playwright para el QA del estándar web ab*se.
   Va en qa/ dentro del proyecto. Ejecuta desde la raíz:
     npx playwright test --config=qa/playwright.config.ts

   Variables de entorno opcionales:
     QA_BASE_URL  Revisa un sitio ya publicado en lugar de levantar uno local.
     QA_SERVER    Comando del servidor local (por defecto "npm run preview", el de Astro).
                  En Next: QA_SERVER="npm run start" QA_PORT=3000
     QA_PORT      Puerto del servidor local (por defecto 4321, el de Astro).
     QA_RUTAS     Rutas a revisar separadas por coma (por defecto "/").           */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.QA_PORT ?? 4321);
const BASE = process.env.QA_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'qa.spec.ts',
  outputDir: './resultados',
  timeout: 90_000,
  reporter: [['list'], ['html', { outputFolder: './reporte', open: 'never' }]],
  use: { baseURL: BASE },
  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: process.env.QA_SERVER ?? 'npm run preview',
        cwd: '..',
        url: BASE,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    // Escritorio: recorre los cuatro anchos de revisión.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // iPhone con WebKit: táctil, sin hover, el motor de Safari.
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
});
