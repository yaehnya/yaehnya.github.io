// The glyphs on the springboard's icons, drawn on a 64 × 64 grid. The tiles under them (colour, gloss,
// rounded corners) are CSS, in Springboard.astro. They are drawn after the iPhone 4's icons, not copied.

export const glyphs: Record<string, string> = {
  // Three covers, the middle one facing you, the others turned toward it, all on a mirror floor.
  coverflow: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="cf-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="M7 21 18 18.5v19L7 35z" fill="#bfc3c9"/><path d="M57 21 46 18.5v19L57 35z" fill="#bfc3c9"/>
    <rect x="21" y="16" width="22" height="22" fill="#fff"/>
    <path d="M7 36 18 38.5v8L7 43z M57 36 46 38.5v8L57 43z" fill="url(#cf-fade)"/>
    <rect x="21" y="39" width="22" height="10" fill="url(#cf-fade)"/>
  </svg>`,
  // Two beamed notes.
  musica: `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#fff" d="M25 46.5a6.5 6.5 0 1 1-3.6-5.8V19.6L46 14v26.6a6.5 6.5 0 1 1-3.6-5.8V24.3l-17.4 4z"/></svg>`,
  // A shopping bag.
  tienda: `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" d="M25.5 27v-4.5a6.5 6.5 0 0 1 13 0V27"/><path fill="#fff" d="M17.5 25h29l-2.2 25.5H19.7z"/></svg>`,
  // A speech bubble.
  contacto: `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#fff" d="M32 13c-12.7 0-22 7.7-22 17.5 0 5.3 2.8 9.8 7.3 13-.4 3.2-2 6.2-4.6 8.4 4.6.2 8.8-1.3 11.9-4 2.3.6 4.8.9 7.4.9 12.7 0 22-7.7 22-17.8S44.7 13 32 13z"/></svg>`,
  // The game: the stick figure pushing the glass ball, letters already stuck to it.
  juego: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><radialGradient id="jg-b" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#fff" stop-opacity=".15"/><stop offset=".85" stop-color="#a9bbd0" stop-opacity=".6"/><stop offset="1" stop-color="#5b6f88" stop-opacity=".95"/></radialGradient>
    <radialGradient id="jg-s" cx="36%" cy="28%" r="24%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <path d="M5 51.5h54" stroke="#b5bfcb" stroke-width="2" stroke-linecap="round"/>
    <g fill="#3b4656"><rect x="33" y="27" width="5" height="3" rx=".6" transform="rotate(-20 35 28)"/><rect x="41" y="36" width="6" height="3" rx=".6" transform="rotate(25 44 37)"/><rect x="31" y="39" width="4" height="3" rx=".6"/><text x="42" y="30" font-family="Georgia,serif" font-size="7" font-weight="700">W</text></g>
    <circle cx="39" cy="35" r="16" fill="url(#jg-b)"/><circle cx="39" cy="35" r="16" fill="url(#jg-s)"/><circle cx="39" cy="35" r="15.6" fill="none" stroke="#fff" stroke-opacity=".85"/>
    <g fill="none" stroke="#1d1d1d" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12.5" cy="22" r="4"/><path d="M13.5 26 17 38.5M15.5 30l7.5 2M15 33.5l7.8 1.2M17 38.5l-5 12.5M17 38.5l4.5 12.5"/></g>
  </svg>`,
  // A gear, in brushed metal.
  ajustes: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="aj-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset="1" stop-color="#9da3ab"/></linearGradient></defs>
    <circle cx="32" cy="32" r="18.5" fill="none" stroke="url(#aj-m)" stroke-width="7" stroke-dasharray="4.85 4.85"/>
    <circle cx="32" cy="32" r="15" fill="none" stroke="url(#aj-m)" stroke-width="5"/>
    <circle cx="32" cy="32" r="6" fill="none" stroke="url(#aj-m)" stroke-width="3"/>
    <path d="M32 17.5v29M17.5 32h29M21.7 21.7l20.6 20.6M42.3 21.7 21.7 42.3" stroke="url(#aj-m)" stroke-width="2.4"/>
  </svg>`,
  spotify: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="19" fill="#1ed760"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="3.6" d="M20.5 26.5c7.5-2.3 16.7-1.7 23.5 2.1"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="3" d="M21.7 33c6.3-1.8 13.8-1.2 19.6 2"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="2.5" d="M22.8 39c5-1.3 10.6-.9 15 1.5"/></svg>`,
  youtube: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="17" width="46" height="31" rx="9" fill="#f00"/><path fill="#fff" d="M27.5 24.5v16l13.5-8z"/></svg>`,
  // Instagram's first icon (October 2010, on iOS 4): a little brown instant camera.
  instagram: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="0" y="0" width="64" height="25" fill="#efe6d4"/>
    <rect x="9" y="0" width="3" height="25" fill="#e8463d"/><rect x="12" y="0" width="3" height="25" fill="#f4c33a"/><rect x="15" y="0" width="3" height="25" fill="#6dbb4c"/><rect x="18" y="0" width="3" height="25" fill="#3a88d0"/>
    <rect x="42" y="8" width="12" height="9" rx="2" fill="#2b2b2b"/><rect x="44" y="10" width="8" height="5" rx="1" fill="#57708a"/>
    <circle cx="32" cy="34" r="14.5" fill="#d7d2c8"/><circle cx="32" cy="34" r="11.5" fill="#1c1c1c"/><circle cx="32" cy="34" r="7.5" fill="#22344a"/><circle cx="29" cy="31" r="2.4" fill="#9fc2e6"/>
  </svg>`,
  apple: `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#fff" d="M27 45a6.5 6.5 0 1 1-3.6-5.8V17.4L44 13v24.6a6.5 6.5 0 1 1-3.6-5.8V22.2L27 25.3z"/></svg>`,
};
