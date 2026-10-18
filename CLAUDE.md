# YEYO — notas del proyecto

Sitio de artista de Yeyo (reggaetón, México) en Astro 7, estático. Contenido en `src/data/site.ts`.

## Dirección

- Blanco, el logo YEYO estirado tipo Saint Laurent (Helvetica Neue negrita, `scale: 1.14 .84`,
  tracking -0.045em). No volver a fondos oscuros en general: el usuario lo rechazó (el iPod de Música
  es negro porque así era la app).
- **Todo es iPhone 4 / iOS 4** (aprobado 2026-10-17: «pon todo del iphone 4»): barra de estado gris de
  iOS 4, botón de inicio, springboard con íconos brillantes y dock de cristal, nav bars azul grisáceo,
  tablas agrupadas sobre rayas, interruptores SÍ/NO, alertas azul marino. Nada de estilo iOS 7+.
- Cada sección es una app: Música = iPod «Ahora suena»; Fechas = cartel de Guts + eventos del
  Calendario (.ics) (opción a, elegida por el usuario); Tienda = App Store; Contacto = Messages;
  Juego = Wikipedia en Safari; 404 = alerta.
- **Momento firma:** la intro (deslizar «desliza para entrar» o girar el teléfono → el iPhone gira, su
  pantalla se vuelve Cover Flow y crece hasta ser la portada; la música sigue).
- El cristal líquido (liquid-glass-react) se quitó al pasar todo a iOS 4; solo la bola del juego
  conserva su cristal (`liquid-glass.js`).
- Texto del Cover Flow: Helvetica negrita, la del iPod desde 2007. Nada de cristal bajo su título.

## Arquitectura

- Astro **ClientRouter**: el sitio no recarga entre páginas, para que la música siga. `/juego` es la
  excepción (página propia de Wikipedia, `data-astro-reload`).
- Cada script corre una sola vez: usar `onPage(signal => …)` de `src/scripts/page.ts` y pasar `signal`
  a los listeners de `window`, `document` y `player`.
- `transition:persist` en la barra de estado, el botón de inicio y lo que suena; cada uno con su
  `view-transition-name` para no deslizarse con la página. Ningún otro elemento debe tener
  `view-transition-name` fijo (se separaría del deslizamiento); ponerlo solo durante la transición.
- El intercambio de páginas reemplaza los atributos de `<html>`: lo que haga falta durante la
  transición se vuelve a poner en `astro:after-swap` (ver `transitions.ts`).
- Un solo reproductor (`src/scripts/player.ts`) con la lista, siguiente/anterior y Media Session.

## Motion

Tres duraciones y tres curvas en `global.css` (`--dur-*`, `--ease-*`). Todo gira y se asienta; nada
de «fade up» genérico. Respeta `prefers-reduced-motion` (sin Lenis, sin giros).

## Trampas conocidas

- El minificador de CSS mete `animation-timeline` dentro del atajo `animation` y los navegadores lo
  descartan: ponlo en una regla aparte, con otro selector. Verificar siempre en el build
  (`npm run build` + `astro preview`), no solo en dev.
- El servidor de dev a veces sirve el CSS viejo de un componente reescrito: reiniciarlo.
- El último margen de un hijo de flex no cuenta como scroll: usar cajas espaciadoras (`::before/::after`).
- Los estilos con scope de Astro no llegan a elementos creados por script: `:global()`.
- No usar la clase `.label` para otra cosa (es un estilo global en mayúsculas).
- Para probar animaciones, el panel del navegador de la app suele estar oculto y no repinta: usar
  Chrome sin interfaz con puppeteer-core y `Animation.setPlaybackRate` para verlas en cámara lenta.
- Editar con Python en Windows mete CRLF: `.gitattributes` lo normaliza a LF al hacer commit.

## Pendiente (contenido)

Fotos reales, merch, correos, fechas con horas y boletos, links directos de redes, dominio
(`SITE_URL`). Todo marcado `[PENDIENTE]` en `site.ts`.
