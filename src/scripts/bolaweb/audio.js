// Synthesized sound: pickup plinks that climb a scale while you keep chaining, and a soft rolling
// rumble. Nothing plays until unlock() runs inside a user gesture.

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // major pentatonic, in semitones
const CHAIN_WINDOW = 0.6;                                 // seconds between pickups that still chain

let ctx = null, master = null, rumbleGain = null, muted = false, chain = 0, lastAt = 0;

export function unlock() {
  if (ctx) { ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);

  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 220;
  rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0;
  noise.connect(low).connect(rumbleGain).connect(master);
  noise.start();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

// 0..1, how fast the ball is rolling.
export function rumble(level) {
  if (rumbleGain) rumbleGain.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.1);
}

// `size` is the item's size in mm: bigger things sound lower.
export function plink(size) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  chain = now - lastAt < CHAIN_WINDOW ? Math.min(chain + 1, SCALE.length - 1) : 0;
  lastAt = now;
  const freq = 440 / (1 + Math.log10(Math.max(1, size)) * 0.3) * 2 ** (SCALE[chain] / 12);
  const osc = ctx.createOscillator(), env = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.25, now + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.connect(env).connect(master);
  osc.start(now);
  osc.stop(now + 0.3);
}
