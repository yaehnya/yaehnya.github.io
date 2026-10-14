# YEYO — notas del proyecto

Sitio de artista de Yeyo (reggaetón, México) en Astro 7, estático. Contenido en `src/data/site.ts`.

## Dirección (aprobada 2026-10-14: «El iPhone de Yeyo», nivel evolucionar)

- Blanco, el logo YEYO estirado tipo Saint Laurent (Helvetica Neue negrita, `scale: 1.14 .84`,
  tracking -0.045em). No volver a fondos oscuros: el usuario lo rechazó.
- El hilo es la nostalgia del iPhone 4 / iPod (2010–2011): la intro con el iPhone de la foto, los
  EarPods con física, el Cover Flow, iOS 4 (barra de desbloqueo, Messages, alertas).
- **Momento firma:** deslizar «desliza para entrar» (o girar el teléfono) → el iPhone gira, su
  pantalla se vuelve Cover Flow y crece hasta ser la portada. La música sigue.
- Secundarios: voltear la portada como en iTunes; contacto como Messages de iOS 4; Música que se
  hojea; la portada que viaja a Música (View Transitions).
- Texto del Cover Flow: Helvetica negrita, la del iPod desde 2007.
- Cristal líquido: `liquid-glass-react` (lo pidió el usuario), solo logos de redes y la bolita; no
  debajo del título del Cover Flow (lo quitó el usuario).

## Motion

Tres duraciones y tres curvas en `global.css` (`--dur-*`, `--ease-*`). Todo gira y se asienta; nada
de «fade up» genérico. Respeta `prefers-reduced-motion`.

## Trampas conocidas

- El minificador de CSS mete `animation-timeline` dentro del atajo `animation` y los navegadores lo
  descartan: ponlo en una regla aparte, con otro selector. Verificar siempre en el build
  (`npm run build` + `astro preview`), no solo en dev.
- El último margen de un hijo de flex no cuenta como scroll: usar cajas espaciadoras (`::before/::after`).
- Los estilos con scope de Astro no llegan a elementos creados por script: `:global()`.
- No usar la clase `.label` para otra cosa (es un estilo global en mayúsculas).
- El panel del navegador de pruebas casi no avanza las animaciones si no se repinta: adelantar con
  `animation.currentTime` y tomar dos capturas.

## Pendiente (contenido)

Fotos reales, merch, correos, fechas con boletos, links directos de redes, dominio (`SITE_URL`).
