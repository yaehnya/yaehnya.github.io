# YEYO

Web de artista en Astro. Blanca y mínima, en la línea de Saint Laurent: «YEYO» en grotesca negrita
con las letras casi tocándose y un poco aplastado en altura. Hay una línea opcional debajo en
mayúsculas serif espaciadas (Cinzel), como «PARIS» (`site.tagline`, ahora vacía).

- **Intro:** se ve una vez por visita, sobre blanco. Pasos:
  1. «YEYO», más estirado y con grano, aparece desvaneciéndose y sube.
  2. Aparece el iPhone 4 blanco con funda beige de la foto de referencia (`public/fotos/iphone.webp`)
     con la app de Música de iOS encima de su pantalla. Sus canciones son las de `site.songs` que
     tienen `audio`, con portada y MP3 (`public/audio/`). Se tocan para reproducir. Sobre la pantalla
     va el cristal de un iPhone 4 real fotografiado con la pantalla apagada (`cristal.webp`: reflejos,
     manchas y polvo), con la sombra del borde del cristal y el tono de una pantalla fotografiada.
  3. Los EarPods, el control con + y −, la clavija y el conector de 30 pines del cargador son fotos
     reales recortadas (`earpod-a.webp`, `earpod-b.webp`, `control.webp`, `plug.webp`,
     `conector.webp`). El cable también es foto (`cable.webp`, un tramo recto que se repite) colocada
     a lo largo de cada curva. Los cables tienen física: se arrastran por el audífono o por el cable,
     y con la música los audífonos tiemblan apenas con los graves
     ([src/scripts/earphones.js](src/scripts/earphones.js)). Al caer, los audífonos quedan fuera de
     la pantalla para que se lean las canciones.
  4. **La entrada (momento firma):** se desliza la barra de iOS 4 «desliza para entrar» (o se
     presiona, o `Esc`; en un teléfono, basta girarlo de lado). El iPhone gira a horizontal y, a medio
     giro, la app de Música cede su lugar a un Cover Flow, como pasaba en el iPhone 4. Luego su
     pantalla crece hasta llenar la ventana y se vuelve la portada, que se asienta. La canción sigue
     sonando y queda arriba a la izquierda, con pausa (`NowPlaying.astro`, `scripts/player.ts`). Con
     movimiento reducido es un fundido.

  Las texturas se generan con dos scripts:
  - `python tools/photo_assets.py tools/referencia-iphone.webp public/fotos` hace el teléfono a partir
    de la foto de referencia: lo endereza, quita los cables que le pasan por encima, lo recorta y
    equilibra el blanco. Sus coordenadas son las de esa foto; con una foto nueva hay que volver a
    medirlas.
  - `python tools/internet_assets.py tools/fuentes public/fotos` hace el cristal, los EarPods, el
    control, la clavija y el conector a partir de fotos con licencia libre de Wikimedia Commons. Las
    fotos están en `tools/fuentes/`; los autores y las licencias, en
    [tools/fuentes/CREDITOS.md](tools/fuentes/CREDITOS.md). La intro lleva abajo a la izquierda la
    línea de créditos que piden esas licencias.

  El video anterior sigue en `public/video/` pero ya no se usa.
- **Menú:** «Menú» arriba a la derecha abre un panel que baja de arriba con un pequeño rebote.
- **Música:** empieza con una portada de revista (las canciones como titulares) y sigue con cada
  canción como página.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # sitio estático en dist/
```

**Netlify:** `netlify.toml` ya dice cómo compilarlo (`npm run build`, publica `dist/`). Para subir lo
compilado a tu cuenta: `npx netlify-cli login` y luego `npx netlify-cli deploy --dir=dist --prod --no-build`.

## Páginas

| Ruta        | Qué es                                                                                  |
|-------------|-----------------------------------------------------------------------------------------|
| `/`         | Un Cover Flow blanco, como el del iPod: fotos sobre todo, y también canciones y noticias (`site.coverflow`). La portada del medio mira de frente, las demás giran hacia ella, todas se reflejan en el suelo, y abajo van sus dos líneas en la Helvetica negrita del iPod. Se pasa con scroll, rueda, arrastrando, flechas o tocando una portada. La del medio se voltea como en iTunes: atrás, una canción se escucha y enlaza a Apple Music, Spotify y YouTube; una noticia se cuenta; una foto da su crédito. Desde el reverso de una canción, «Ver en Música» lleva su portada volando a su página. |
| `/musica`   | Cada canción como una página de revista: foto grande, crédito vertical en serif, folio. Se hojea: al bajar, cada página gira sobre su borde izquierdo. |
| `/fechas`   | Cartel estilo nicebassbro: imagen a sangre (`site.tour.image`), título que se enciende como letrero y cada fecha en una banda oscura, una tras otra. |
| `/tienda`   | Productos que enlazan a la tienda externa; giran hacia ti al aparecer, como en el Cover Flow. |
| `/contacto` | Un mensaje de iOS 4: Yeyo escribe «amor, cómo ESTÁS???», eliges a quién (management, booking o prensa) y contestas; al enviar, tu burbuja verde, la barra azul y «Entregado». Abajo, los correos directos y la dirección del estudio. |
| `/404`      | Una alerta de iOS 4: «No se puede reproducir». |
| `/juego`    | La bola sobre el artículo de Wikipedia de Yeyo («Yeyo (músico)», es.wikipedia). Solo arranca al pulsar «Jugar». |

El menú lleva a **música · fechas · tienda · contacto**, y una bolita de cristal lleva al juego. Abajo, en todas las páginas,
Spotify, YouTube e Instagram son gotas de cristal líquido con el logo dentro.

Las canciones son «lo mejor siempre SE DEMORA» (29.07.2026) y «amor, cómo ESTÁS???» (30.05.2026).
Las portadas y los enlaces de Apple Music salen del catálogo de Apple; las portadas se cargan desde
el CDN de Apple (mzstatic.com). Spotify y YouTube son búsquedas; pon los enlaces directos en
`site.songs` cuando los tengas. Para ver otra vez la intro, borra `yeyo-intro` del sessionStorage o
abre una pestaña nueva.

## Movimiento

Todo gira y se asienta, como en el iPhone: tres duraciones (`--dur-micro`, `--dur-media`,
`--dur-larga`) y tres curvas (`--ease-entrada`, `--ease-salida`, `--ease-enfasis`) en
[global.css](src/styles/global.css). Las animaciones ligadas al scroll (Cover Flow, Música, Tienda) van
dentro de `@supports (animation-timeline: view())` y con `animation-timeline` en una regla aparte:
si van en la misma, el minificador las mete en el atajo `animation` y los navegadores la descartan.
Con movimiento reducido no hay giros ni acercamientos.

## Qué editar

- **Todo el contenido:** [src/data/site.ts](src/data/site.ts) (canciones, fechas, productos, redes, correos).
- **Cover Flow:** en `site.coverflow`, cada portada con `kind` (`foto`, `cancion` o `noticia`), `image`,
  `title`, `subtitle` y, si lleva a algún sitio, `href`. La que tenga `start: true` sale de frente al abrir.
- **Imágenes:** se sustituyen los `.svg` de `public/fotos/` y se actualizan las rutas y medidas en `site.ts`.
- **Formulario de contacto:** sin servicio configurado abre el correo del visitante, dirigido a quien
  eligió; para recibirlo de verdad, pon la URL de Formspree o similar en `site.form.action`.
- **Dominio:** al compilar, `SITE_URL=https://dominio` hace absolutos los enlaces de la vista previa
  (WhatsApp, Instagram), el canónico y el sitemap. La imagen para compartir es `public/og/yeyo.jpg`
  (`python tools/og_image.py public/og/yeyo.jpg`).
- **Fechas:** se filtran al compilar; vuelve a compilar cuando pase una.
- **Tipografía:** Helvetica Neue donde existe (Mac, iPhone) e Inter Tight, incluida en el proyecto, en
  el resto (Windows, Android). Está en [src/styles/global.css](src/styles/global.css).

## Cristal líquido

Es [liquid-glass-react](https://github.com/rdev/liquid-glass-react), en
[src/components/Glass.tsx](src/components/Glass.tsx): los logos de redes (`SocialGlass`) y la bolita
del menú y del botón «Jugar» (`GlassOrb`). Como en blanco hay poco que refractar, el cristal lleva
además su propia luz (`.sheen` en global.css): el borde brillante arriba, el brillo que cae y el borde
de abajo más oscuro, como el cristal de iOS sobre blanco. La página los dibuja primero en CSS, con el
mismo tamaño y luz; React y la librería (unos 270 KB) se cargan solo en Chrome, Edge y Opera, que son
los que pintan la refracción, y cuando la página ya está en reposo ([src/scripts/glass.ts](src/scripts/glass.ts)).
En Safari y Firefox se queda el cristal en CSS, sin descargar nada. La librería usa unas clases de
Tailwind, definidas a mano al final de [global.css](src/styles/global.css), y ahí también se ajusta
para fondo blanco: la sombra va por encima del cristal porque si no, el cristal la refracta y se ve
gris. La bola del juego, que el juego redibuja cada fotograma, mantiene su propio cristal
([src/scripts/liquid-glass.js](src/scripts/liquid-glass.js)).

## El juego

El nivel es la página de Wikipedia indicada en `site.wikipedia`, tal cual la sirve Wikipedia (logo,
buscador, índice, pestañas, ficha y pie, con sus propias hojas de estilo), sin sus scripts y con un
único botón flotante «Jugar». Se descarga al compilar (`src/data/wikipedia.ts`), así que se
actualiza cada vez que vuelves a compilar. Esta página no usa la plantilla ni los estilos del sitio.
El pie de Wikipedia, con la licencia CC BY-SA del texto, se conserva.

Solo se carga en las páginas con `<Base game>` y solo arranca con un elemento `data-bolaweb`.
Un monigote empuja una bola de cristal que rueda hacia el puntero (o con flechas/WASD) y se come la
página letra a letra; las fotos grandes, por teselas. Se ve a través del cristal lo que hay detrás y
las piezas pegadas por el otro lado. `Esc` sale y todo vuelve a su sitio; `M` silencia.

Código en `src/components/Bolaweb.astro` y `src/scripts/bolaweb/` (`pusher.js` es el monigote).
