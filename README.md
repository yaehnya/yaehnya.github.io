# YEYO

Web de artista en Astro. Blanca, con «YEYO» en grotesca negrita como el logo de Saint Laurent, y
toda ella es un iPhone 4 con iOS 4: la barra de estado arriba, el botón de inicio abajo y, detrás,
el springboard con las secciones como apps. Las páginas cambian sin recargar, así que la canción
sigue sonando de una a otra.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # sitio estático en dist/
```

**Netlify:** `netlify.toml` ya dice cómo compilarlo (`npm run build`, publica `dist/`). Para subir lo
compilado a tu cuenta: `npx netlify-cli login` y luego `npx netlify-cli deploy --dir=dist --prod --no-build`.

## El iPhone (en todas las páginas)

- **Barra de estado** ([StatusBar.astro](src/components/StatusBar.astro)): señal y Telcel, la hora
  real, la batería real donde el navegador la da (Chrome, Edge, Opera) y ▶ mientras suena algo. Tocarla
  sube al principio. Cada página elige su estilo con `bar` en `<Base>`: `gris` (el de iOS 4),
  `negro` (el iPod) o `translucido` (sobre una imagen).
- **Botón de inicio** ([HomeButton.astro](src/components/HomeButton.astro)): abre el springboard y,
  presionado otra vez, regresa a la página.
- **Springboard** ([Springboard.astro](src/components/Springboard.astro)): la pantalla de inicio de
  iOS 4. Las secciones son apps con íconos brillantes (el calendario marca el día de hoy) y el dock de
  cristal lleva Spotify, YouTube, Instagram y Apple Music. El fondo es la portada de la canción que
  suena, o `site.wallpaper`. Al abrirlo, la página se encoge hasta su ícono y los demás llegan volando;
  una app se abre desde su ícono. Si mantienes presionado un ícono, todos tiemblan; el botón de inicio
  lo detiene. **Ajustes** es una app de adentro: sonidos y vibración con los interruptores SÍ/NO de
  iOS 4, y «Ver la intro otra vez».
- **Lo que suena** ([NowPlaying.astro](src/components/NowPlaying.astro)): arriba a la izquierda, con
  pausa y el título, que abre el iPod. Se queda fijo de página en página.
- **Aviso** ([Notice.astro](src/components/Notice.astro)): una vez por visita, una notificación push
  de iOS 4 anuncia el sencillo; «Escuchar» lo pone.
- **Sonidos** ([sounds.ts](src/scripts/sounds.ts)): el clic del botón y del desbloqueo, las teclas, el
  envío de un mensaje, el ding de uno que llega y el tic del Cover Flow. Están hechos con Web Audio (no
  son grabaciones), suenan bajito y solo después de que el visitante tocó algo. En Android también vibra.

## Novedades del iPhone (2026-10-18)

- **Todo dentro del iPhone:** el sitio vive en la pantalla del iPhone de la foto (de lado en ventanas
  anchas, de pie en ventanas altas y siempre de pie en teléfonos). La pantalla mide 480 × 320 puntos
  como la del iPhone 4 y se escala; el botón de inicio y el interruptor de silencio son los de la foto.
- **Originales de Apple:** íconos, gráficos de UIKit y sonidos de iOS (`public/ios/`), la Helvetica
  Neue (`public/fonts/`), y los íconos de la época de Spotify (2010), YouTube (iOS) e Instagram
  (2011–2016). Fuentes en `tools/fuentes/ios/`.
- **Intro:** la pantalla de bloqueo de iOS 4 (hora, fecha, controles de la música, «desliza para
  desbloquear»). Al desbloquear, el iPhone gira, queda en el marco y abre el springboard.
- **El iPhone vivo:** se inclina hacia el puntero (o con el giroscopio), cristal y brillo sobre la
  pantalla, gira al cambiar la ventana de forma (`src/scripts/device.ts`).
- **Botón de inicio:** un toque, el springboard; dos, la barra de multitarea con los controles del
  iPod (`Switcher.astro`). Tecla H. La primera visita, un globo lo señala.
- **Interruptor de silencio** (`SideSwitch.astro`): silencia todo y muestra la campana de iOS. Tecla M.
- **Juego:** la sección de 2026 de la Wikipedia sale tachada en negro salvo el párrafo del regreso
  (`src/data/wikipedia.ts`).
- **Imágenes por tamaño** (`src/data/images.ts`): cada foto grande tiene copias chicas para teléfonos.
- **Lighthouse** (versión compilada): computadora 97–100 en todo; teléfono: rendimiento 82–99,
  accesibilidad, buenas prácticas y SEO 100.

## Páginas

| Ruta        | Qué es |
|-------------|--------|
| `/`         | La intro (una vez por visita) y luego un Cover Flow blanco, como el del iPod: fotos sobre todo, y también canciones y noticias (`site.coverflow`). La portada del medio se voltea como en iTunes: atrás, una canción se escucha y enlaza a Apple Music, Spotify y YouTube; una noticia se cuenta; una foto da su crédito. «Ver en Música» lleva la portada volando al iPod. |
| `/musica`   | El iPod de iOS 4, «Ahora suena»: la barra negra, la portada grande con la barra de progreso, repetir y aleatorio, los controles brillantes, el volumen y dónde más escucharla. Tocar la portada la voltea a la lista de canciones; deslizarla cambia de canción. `/musica#cancion-2` abre en la segunda. |
| `/fechas`   | El cartel de Guts estilo nicebassbro. Cada fecha se abre como evento del Calendario de iOS 4: dónde y cuándo, la alerta, los boletos, cómo llegar y «Agregar a mi calendario», un `.ics` por fecha (`/fechas/<fecha>-<ciudad>.ics`) que el teléfono abre en su Calendario. |
| `/tienda`   | La App Store de iOS 4: banner de destacados, segmentos Todo · Ropa · Música y cada producto como app; el botón de precio se vuelve el «COMPRAR» verde y el segundo toque lleva a la tienda. |
| `/contacto` | Messages de iOS 4: Yeyo escribe «amor, cómo ESTÁS???», eliges a quién (management, booking o prensa) y contestas; al enviar, tu burbuja, la barra azul y «Entregado». |
| `/404`      | Una alerta de iOS 4: «No se puede reproducir». |
| `/juego`    | La Wikipedia de Yeyo dentro de Safari de iOS 4, con la bola de cristal. Solo arranca al pulsar «Jugar». |

## La intro

Una vez por visita, sobre blanco: «YEYO» con grano aparece y sube, llega el iPhone 4 blanco con funda
beige de la foto de referencia con el iPod de iOS 4 abierto en las canciones (se tocan para
reproducir), y los EarPods y el cable del cargador, con física, se pueden arrastrar
([earphones.js](src/scripts/earphones.js)). Para entrar se desliza «desliza para entrar» (o se
presiona, o `Esc`; en un teléfono basta girarlo): el iPhone gira, su pantalla se vuelve Cover Flow y
crece hasta ser la portada. La canción sigue.

Las texturas salen de dos scripts. `python tools/photo_assets.py tools/referencia-iphone.webp public/fotos`
hace el teléfono a partir de la foto de referencia. `python tools/internet_assets.py tools/fuentes public/fotos`
hace el cristal, los EarPods, el control, la clavija y el conector a partir de fotos con licencia libre
de Wikimedia Commons; los autores y las licencias están en
[tools/fuentes/CREDITOS.md](tools/fuentes/CREDITOS.md), y la intro lleva la línea de créditos que piden.

## Movimiento

- **Entre páginas** ([transitions.ts](src/scripts/transitions.ts), [global.css](src/styles/global.css)):
  Astro ClientRouter con View Transitions. La página nueva entra desde la derecha como en iOS 4 y, al
  regresar, al revés; desde el springboard, la app crece desde su ícono. La barra de estado, el botón
  de inicio y lo que suena no se mueven.
- **Scripts:** como el sitio no recarga, cada script corre una sola vez y se engancha a cada página con
  `onPage()` ([page.ts](src/scripts/page.ts)), que además quita sus listeners cuando la página se va.
- **Scroll:** Lenis lo suaviza con la rueda; en pantallas táctiles queda el nativo. Lo que se desplaza
  por su cuenta (el Cover Flow, la hoja de un evento) lleva `data-lenis-prevent`.
- Tres duraciones y tres curvas en `global.css` (`--dur-*`, `--ease-*`). Con movimiento reducido no
  hay giros, acercamientos ni Lenis.
- Las animaciones ligadas al scroll (Cover Flow) van con `animation-timeline` en una regla aparte: si
  van en la misma, el minificador las mete en el atajo `animation` y los navegadores la descartan.

## Qué editar

- **Todo el contenido:** [src/data/site.ts](src/data/site.ts) (canciones, fechas, productos, redes,
  correos, fondo del springboard).
- **Canciones:** `site.songs`, con `audio` (MP3 en `public/audio/`) para que suenen en el iPod.
- **Fechas:** `site.shows`; con `time: '21:00'` el evento del calendario tiene hora, sin ella dura todo
  el día. Se filtran al compilar: vuelve a compilar cuando pase una.
- **Tienda:** `site.products`, cada uno con `kind` (`ropa` o `musica`) y una línea de `detail`.
- **Cover Flow:** `site.coverflow`, cada portada con `kind` (`foto`, `cancion` o `noticia`), `image`,
  `title`, `subtitle` y, si lleva a algún sitio, `href`. La que tenga `start: true` sale de frente.
- **Redes (el dock):** `site.social` (Spotify, YouTube, Instagram, Apple Music).
- **Formulario de contacto:** sin servicio configurado abre el correo del visitante, dirigido a quien
  eligió; para recibirlo de verdad, pon la URL de Formspree o similar en `site.form.action`.
- **Dominio:** al compilar, `SITE_URL=https://dominio` hace absolutos los enlaces de la vista previa
  (WhatsApp, Instagram), el canónico y el sitemap. La imagen para compartir es `public/og/yeyo.jpg`
  (`python tools/og_image.py public/og/yeyo.jpg`).
- **Tipografía:** Helvetica Neue donde existe (Mac, iPhone) e Inter Tight, incluida en el proyecto, en
  el resto (Windows, Android).

Para ver otra vez la intro: Ajustes → «Ver la intro otra vez», o abre una pestaña nueva.

## El juego

El nivel es la página de Wikipedia indicada en `site.wikipedia`, tal cual la sirve Wikipedia, sin sus
scripts, dentro del marco de Safari de iOS 4 ([SafariFrame.astro](src/components/SafariFrame.astro))
y con un único botón flotante «Jugar». Se descarga al compilar (`src/data/wikipedia.ts`). El pie de
Wikipedia, con la licencia CC BY-SA del texto, se conserva.

Un monigote empuja una bola de cristal que rueda hacia el puntero (o con flechas/WASD) y se come la
página letra a letra; las fotos grandes, por teselas. `Esc` sale y todo vuelve a su sitio; `M` silencia.
Código en `src/components/Bolaweb.astro` y `src/scripts/bolaweb/` (`pusher.js` es el monigote). La
bola tiene su propio cristal ([liquid-glass.js](src/scripts/liquid-glass.js)), que dobla lo que hay
detrás solo en Chromium.
