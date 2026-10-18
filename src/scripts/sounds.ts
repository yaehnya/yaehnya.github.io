// The iPhone's own sounds, the original files (public/ios/sonidos/, from iOS's UISounds): unlocking,
// locking, a key on the keyboard, a message sent, a message received, and the Tri-tone of a
// notification. They play through Web Audio so they come in at once; only after the visitor has touched
// something (browsers allow sound only then), and not when Ajustes has them off. On Android a tap can
// also buzz (navigator.vibrate); iPhones ignore it.

const KEY = 'yeyo-sonidos';
const FILES = {
  unlock: 'unlock.wav', lock: 'lock.wav', tock: 'Tock.wav', sent: 'SentMessage.wav', received: 'ReceivedMessage.wav', tritone: 'sms-received1.wav',
} as const;
type Name = keyof typeof FILES;

let ctx: AudioContext | null = null;
const buffers = new Map<Name, Promise<AudioBuffer | null>>();

const stored = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
let on = stored(KEY) !== 'no';
let buzz = stored('yeyo-vibrar') !== 'no';

export const soundOn = () => on;
export const vibrationOn = () => buzz;
export function setSound(v: boolean) { on = v; try { localStorage.setItem(KEY, v ? 'si' : 'no'); } catch {} }
export function setVibration(v: boolean) { buzz = v; try { localStorage.setItem('yeyo-vibrar', v ? 'si' : 'no'); } catch {} }

const touched = () => (navigator.userActivation ? navigator.userActivation.hasBeenActive : true);

function load(a: AudioContext, name: Name) {
  if (!buffers.has(name)) {
    buffers.set(name, fetch(`/ios/sonidos/${FILES[name]}`).then(r => r.arrayBuffer()).then(b => a.decodeAudioData(b)).catch(() => null));
  }
  return buffers.get(name)!;
}

async function play(name: Name, gain = .35) {
  if (!on || (!touched() && !ctx)) return;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const buf = await load(ctx, name);
  if (!buf) return;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start();
}

/** Fetches the sounds ahead, once the visitor has touched something, so the first one is not late. */
export function warm() { if (!touched()) return; ctx ??= new AudioContext(); (Object.keys(FILES) as Name[]).forEach(n => load(ctx!, n)); }
addEventListener('pointerdown', warm, { once: true, capture: true });

export function vibrate(ms = 12) { if (buzz && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms); }

/** Sliding to unlock. */
export const unlock = () => play('unlock');
/** The sleep button. */
export const lock = () => play('lock');
/** A key on the keyboard. */
export const tick = () => play('tock', .25);
/** A message going. */
export const swoosh = () => play('sent');
/** A message arriving, in the conversation. */
export const received = () => play('received');
/** A notification: the Tri-tone. */
export const tritone = () => play('tritone');
