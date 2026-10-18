// One player for the whole site, like the iPod in the iPhone: the iPhone in the intro, the backs of the
// covers, the iPod (Música) and the now-playing chip all play through it, so there is only ever one song
// at a time, and it goes on from page to page (the site never reloads). When a song ends the next one
// starts (unless it repeats); shuffle picks the next at random. The phone's lock screen and headphones
// get the controls too (Media Session).
import { site } from '../data/site';
import { sized } from '../data/images';

export interface Track { src: string; title: string; cover?: string }

/** The songs that can be played, newest first. */
export const library: Track[] = site.songs.filter(s => s.audio).map(s => ({ src: s.audio!, title: s.title, cover: sized(s.image, 640) }));

export const player = new Audio();
player.preload = 'none';
player.volume = .3;                                  // the whole site well under full volume

let track: Track | null = null;
let shuffled = false;
export const nowPlaying = () => track;
export const position = () => library.findIndex(t => t.src === track?.src);
export const shuffle = (on?: boolean) => (on === undefined ? shuffled : (shuffled = on));

export function load(src: string, title: string) {
  if (track?.src !== src) player.src = src;
  track = library.find(t => t.src === src) ?? { src, title };
  dispatchEvent(new CustomEvent('yeyo:track', { detail: track }));
  mediaSession();
}

export function playTrack(src: string, title: string) {
  load(src, title);
  return player.play().catch(() => {});
}

export function toggle() {
  if (!track && library[0]) { playTrack(library[0].src, library[0].title); return; }
  if (player.paused) player.play().catch(() => {}); else player.pause();
}

/** The next (1) or previous (-1) song; it plays if something was playing. As on the iPod, "previous"
 *  past the first seconds of a song goes back to its start. */
export function step(dir: 1 | -1, play = !player.paused) {
  if (dir < 0 && player.currentTime > 3) { player.currentTime = 0; return; }
  const n = library.length, i = position();
  if (!n) return;
  let j = (Math.max(i, 0) + dir + n) % n;
  if (shuffled && n > 2) while (j === i) j = Math.floor(Math.random() * n);
  load(library[j].src, library[j].title);
  if (play) player.play().catch(() => {});
}

player.addEventListener('ended', () => { if (!player.loop) step(1, true); });

// The lock screen, the notification shade and the headphones' buttons.
function mediaSession() {
  if (!('mediaSession' in navigator) || !track) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title, artist: 'Yeyo', album: 'Sencillo',
    artwork: track.cover ? [{ src: track.cover, sizes: '640x640', type: 'image/webp' }] : [],
  });
}
if ('mediaSession' in navigator) {
  const on = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
  on('play', () => { player.play().catch(() => {}); });
  on('pause', () => player.pause());
  on('previoustrack', () => step(-1));
  on('nexttrack', () => step(1));
  on('seekto', d => { if (d.seekTime !== undefined) player.currentTime = d.seekTime; });
}
