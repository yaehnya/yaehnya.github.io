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
  4. «Entrar» desvanece la música y levanta la intro.

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
| `/`         | Un Cover Flow blanco, como el del iPod: fotos sobre todo, y también canciones y noticias (`site.coverflow`). La portada del medio mira de frente, las demás giran hacia ella, todas se reflejan en el suelo, y abajo van sus dos líneas en la Helvetica negrita del iPod. Se pasa con scroll, rueda, arrastrando, flechas o tocando una portada; la del medio abre su enlace. |
| `/musica`   | Cada canción como una página de revista: foto grande, crédito vertical en serif, folio. |
| `/fechas`   | Cartel estilo nicebassbro: imagen a sangre (`site.tour.image`), título con brillo y cada fecha en una banda oscura. |
| `/tienda`   | Productos que enlazan a la tienda externa.                                              |
| `/contacto` | Correos y formulario; la dirección del estudio con el estilo de la marca.               |
| `/juego`    | La bola sobre el artículo de Wikipedia de Yeyo («Yeyo (músico)», es.wikipedia). Solo arranca al pulsar «Jugar». |

El menú lleva a **música · fechas · tienda · contacto**, y una bolita de cristal lleva al juego. Abajo, en todas las páginas,
Spotify, YouTube e Instagram son gotas de cristal líquido con el logo dentro.

Las canciones son «lo mejor siempre SE DEMORA» (29.07.2026) y «amor, cómo ESTÁS???» (30.05.2026).
Las portadas y los enlaces de Apple Music salen del catálogo de Apple; las portadas se cargan desde
el CDN de Apple (mzstatic.com). Spotify y YouTube son búsquedas; pon los enlaces directos en
`site.songs` cuando los tengas. Para ver otra vez la intro, borra `yeyo-intro` del sessionStorage o
abre una pestaña nueva.

## Qué editar

- **Todo el contenido:** [src/data/site.ts](src/data/site.ts) (canciones, fechas, productos, redes, correos).
- **Cover Flow:** en `site.coverflow`, cada portada con `kind` (`foto`, `cancion` o `noticia`), `image`,
  `title`, `subtitle` y, si lleva a algún sitio, `href`. La que tenga `start: true` sale de frente al abrir.
- **Imágenes:** se sustituyen los `.svg` de `public/fotos/` y se actualizan las rutas y medidas en `site.ts`.
- **Formulario de contacto:** sin servicio configurado abre el correo del visitante; para recibirlo
  de verdad, pon la URL de Formspree o similar en `site.form.action`.
- **Fechas:** se filtran al compilar; vuelve a compilar cuando pase una.
- **Tipografía:** Helvetica Neue donde existe (Mac, iPhone) e Inter Tight, incluida en el proyecto, en
  el resto (Windows, Android). Está en [src/styles/global.css](src/styles/global.css).

## Cristal líquido

Es [liquid-glass-react](https://github.com/rdev/liquid-glass-react), en
[src/components/Glass.tsx](src/components/Glass.tsx): los logos de redes (`SocialGlass`) y la bolita
del menú y del botón «Jugar» (`GlassOrb`). Como en blanco hay poco que refractar, el cristal lleva
además su propia luz (`.sheen` en global.css): el borde brillante arriba, el brillo que cae y el borde
de abajo más oscuro, como el cristal de iOS sobre blanco. Se dibuja en el navegador (islas de React con
`client:only`); sin JavaScript se ven los logos y la bolita normales. La refracción solo la pintan
Chrome y Edge; Safari y Firefox muestran el cristal esmerilado. La librería usa unas clases de
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
