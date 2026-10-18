// Everything the pages say lives here. Replace the images in public/fotos/ and edit the text.

export type Page = 'home' | 'musica' | 'fechas' | 'tienda' | 'contacto' | 'juego' | 'error';

export interface Song {
  title: string;         // as the artist writes it
  caption: string;       // set vertically beside the cover, like "8Belial & YYY991: YSL"
  date?: string;         // release date, ISO
  image: string;         // the cover
  width: number;
  height: number;
  audio?: string;        // played on the iPhone in the intro
  apple?: string;
  spotify?: string;
  youtube?: string;
}

export interface Show {
  date: string;          // ISO date, e.g. "2026-11-14"
  time?: string;         // doors or start, local, "21:00"; without it the calendar event lasts all day
  city: string;
  venue: string;
  tickets?: string;      // without it, and not sold out, the row just has no button
  soldOut?: boolean;
}

// One cover in the home's Cover Flow: mostly photos, but also songs and news. `title` and `subtitle`
// are the two lines under the cover in the middle, like album and artist on an iPod. A click on the
// middle cover turns it over, as in iTunes, and its back says more: a song's back plays it (`song`:
// its place in `songs`) and links to it, a news item's has its `text`, a photo's its credit; `href` is
// where the back's link goes.
export interface Cover {
  kind: 'foto' | 'cancion' | 'noticia';
  image: string;
  alt: string;
  title: string;
  subtitle?: string;
  href?: string;
  song?: number;
  text?: string;
  credit?: string;
}

export interface Product {
  name: string;
  price: string;
  image: string;
  href: string;          // the product in the external store
}

// Until there are direct links, "Spotify ↗" / "YouTube ↗" search for the song.
const spotify = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;
const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// The latest releases, newest first. Covers (copied into public/) and Apple Music links from Apple's catalogue.
const songs = [
  {
    title: 'lo mejor siempre SE DEMORA', caption: 'Yeyo: lo mejor siempre SE DEMORA', date: '2026-07-29',
    image: '/fotos/portadas/lo-mejor-siempre-se-demora.webp',
    width: 1000, height: 1000, audio: '/audio/lo-mejor-siempre-se-demora.mp3',
    apple: 'https://music.apple.com/us/album/lo-mejor-siempre-se-demora-single/6795342943',
    spotify: spotify('Yeyo lo mejor siempre se demora'), youtube: youtube('Yeyo lo mejor siempre se demora'),
  },
  {
    title: 'amor, cómo ESTÁS???', caption: 'Yeyo: amor, cómo ESTÁS???', date: '2026-05-30',
    image: '/fotos/portadas/amor-como-estas.webp',
    width: 1000, height: 1000, audio: '/audio/amor-como-estas.mp3',
    apple: 'https://music.apple.com/us/album/amor-c%C3%B3mo-est%C3%A1s-single/6771959739',
    spotify: spotify('Yeyo amor como estas'), youtube: youtube('Yeyo amor como estas'),
  },
] satisfies Song[];

export const site = {
  name: 'YEYO',
  tagline: '',                   // an optional small line under the wordmark, like "PARIS" in the Saint Laurent logo
  description: 'Yeyo: «lo mejor siempre SE DEMORA» y «amor, cómo ESTÁS???». Música, fechas, tienda y contacto.',

  // Home: a Cover Flow, white, as on the iPod. Mostly photos of Yeyo, with songs and news among them,
  // in this order; the one marked `start` faces front when the page opens.
  coverflow: [
    { kind: 'foto', image: '/fotos/collage-1.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
    { kind: 'foto', image: '/fotos/collage-2.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
    { kind: 'cancion', image: songs[1].image, alt: `Portada de ${songs[1].title}`, title: songs[1].title, subtitle: 'Yeyo', href: '/musica#cancion-2', song: 1 },
    { kind: 'foto', image: '/fotos/collage-3.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
    { kind: 'cancion', image: songs[0].image, alt: `Portada de ${songs[0].title}`, title: songs[0].title, subtitle: 'Yeyo', href: '/musica#cancion-1', song: 0, start: true },
    { kind: 'foto', image: '/fotos/collage-4.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
    { kind: 'noticia', image: '/fotos/fechas.webp', alt: 'Guts, de Berserk', title: 'Tour 2026', subtitle: 'Noticia · las fechas', href: '/fechas',
      text: 'Ciudad de México, Guadalajara y Monterrey. [PENDIENTE: fechas confirmadas]' },
    { kind: 'foto', image: '/fotos/collage-5.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
    { kind: 'foto', image: '/fotos/collage-6.svg', alt: 'Yeyo', title: 'Yeyo', subtitle: 'Foto' },
  ] satisfies (Cover & { start?: boolean })[],

  // The game's level: this Wikipedia article, fetched when the site is built.
  wikipedia: { lang: 'es', title: 'Yeyo (músico)' },

  // Fechas: a full-bleed picture with the dates over its right side.
  tour: { image: '/fotos/fechas.webp', alt: 'Guts sentado junto a su espada, viñeta de Berserk', width: 825, height: 413, subtitle: 'tour 2026' },

  // The springboard's wallpaper (the iPhone's home screen, opened with the home button). Until there is
  // a photo of Yeyo, the cover of the latest song; while a song plays, its cover.
  wallpaper: { src: songs[0].image, alt: '' },

  // In the springboard's dock. [PENDIENTE: los enlaces directos de Spotify, YouTube e Instagram]
  social: {
    spotify: 'https://open.spotify.com/',
    youtube: 'https://youtube.com/',
    instagram: 'https://instagram.com/',
    apple: 'https://music.apple.com/mx/artist/1589529091',
  },

  songs,

  // Each opens as an iOS Calendar event on Fechas, with its .ics. [PENDIENTE: fechas, horas y boletos reales]
  shows: [
    { date: '2026-11-14', city: 'Ciudad de México', venue: 'Sala de ejemplo', tickets: 'https://example.com/entradas' },
    { date: '2026-11-21', city: 'Guadalajara', venue: 'Foro de ejemplo', tickets: 'https://example.com/entradas' },
    { date: '2026-12-05', city: 'Monterrey', venue: 'Teatro de ejemplo', soldOut: true },
  ] satisfies Show[],

  shop: 'https://example.com/tienda',
  products: [
    { name: 'Playera negra', price: '$450 MXN', image: '/fotos/producto-1.svg', href: 'https://example.com/tienda' },
    { name: 'Playera blanca', price: '$450 MXN', image: '/fotos/producto-2.svg', href: 'https://example.com/tienda' },
    { name: 'Vinil', price: '$700 MXN', image: '/fotos/producto-3.svg', href: 'https://example.com/tienda' },
  ] satisfies Product[],

  contact: [
    { label: 'Management', email: 'management@example.com' },
    { label: 'Booking', email: 'booking@example.com' },
    { label: 'Prensa', email: 'prensa@example.com' },
  ],

  // Set like the "RUE DE SÈVRES / PARIS" wordmark, at the foot of the contact page.
  studio: { line: 'CALLE DEL ESTUDIO', city: 'CIUDAD' },

  // Where the contact form posts. Empty: it opens the visitor's mail app addressed to fallbackEmail.
  form: { action: '', fallbackEmail: 'management@example.com' },
};
