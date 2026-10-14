// One player for the page. The iPhone in the intro and the backs of the Cover Flow's covers play
// through it, so a song started in one goes on in the other, and the "now playing" line follows it.
export const player = new Audio();
player.preload = 'none';

export interface Track { src: string; title: string }
let track: Track | null = null;

export const nowPlaying = () => track;

// Put a song in the player (without playing it) and tell the page.
export function load(src: string, title: string) {
  if (track?.src !== src) player.src = src;
  track = { src, title };
  dispatchEvent(new CustomEvent<Track>('yeyo:track', { detail: track }));
}

export function playTrack(src: string, title: string) {
  load(src, title);
  return player.play().catch(() => { /* blocked until the visitor has touched the page */ });
}

export function toggle() {
  if (player.paused) player.play().catch(() => {}); else player.pause();
}
