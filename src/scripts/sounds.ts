// The iPhone's little noises, made here with Web Audio (no recordings): the home button's click, the
// lock's, the keyboard's tick, the swoosh of a sent message and the chime of one arriving. Quiet, only
// after the visitor has touched something (browsers allow sound only then), and silenced from Ajustes in
// the springboard. On Android a tap can also buzz (navigator.vibrate); iPhones ignore it.

const KEY = 'yeyo-sonidos';
let ctx: AudioContext | null = null;

const stored = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
let on = stored(KEY) !== 'no';
let buzz = stored('yeyo-vibrar') !== 'no';

export const soundOn = () => on;
export const vibrationOn = () => buzz;
export function setSound(v: boolean) { on = v; try { localStorage.setItem(KEY, v ? 'si' : 'no'); } catch {} }
export function setVibration(v: boolean) { buzz = v; try { localStorage.setItem('yeyo-vibrar', v ? 'si' : 'no'); } catch {} }

function audio() {
  const touched = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
  if (!on || (!touched && !ctx)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// A burst of noise through a band-pass filter: the body of every click.
function noise(a: AudioContext, at: number, length: number, freq: number, q: number, gain: number) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(at);
  return { bp, g, src };
}

export function vibrate(ms = 12) { if (buzz) navigator.vibrate?.(ms); }

/** The home button: a soft, low click. */
export function click() {
  const a = audio(); if (!a) return;
  noise(a, a.currentTime, .03, 1800, 1.2, .35);
  noise(a, a.currentTime, .05, 220, 2, .25);
}

/** The lock: two clicks close together, as the iPhone 4 made when it unlocked. */
export function lock() {
  const a = audio(); if (!a) return;
  noise(a, a.currentTime, .025, 2600, 2, .3);
  noise(a, a.currentTime + .045, .035, 1400, 1.4, .3);
}

/** A key on the keyboard: a tiny, dry tick. */
export function tick() {
  const a = audio(); if (!a) return;
  noise(a, a.currentTime, .012, 4200, .9, .16);
}

/** A message going: air, sweeping up and away. */
export function swoosh() {
  const a = audio(); if (!a) return;
  const { bp, g } = noise(a, a.currentTime, .5, 400, 1.6, 0);
  const t = a.currentTime;
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(3800, t + .4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.5, t + .08);
  g.gain.exponentialRampToValueAtTime(.001, t + .48);
}

/** A message or a notification arriving: two soft, bright notes. */
export function ding() {
  const a = audio(); if (!a) return;
  [[1318.5, 0], [1760, .11]].forEach(([f, d]) => {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + d;
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.14, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + .45);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + .5);
  });
}
