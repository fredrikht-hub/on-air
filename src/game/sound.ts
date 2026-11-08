import { useGame } from './state';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (!useGame.getState().settings.sound) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0, slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function click(vol = 0.25) {
  const c = ac();
  if (!c || !noise || !master) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800 + Math.random() * 1600;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.05);
}

export const sfx = {
  key: () => click(),
  error: () => tone(140, 0.12, 'square', 0.08, 0, 90),
  word: (combo: number) => tone(520 + Math.min(combo, 40) * 14, 0.07, 'triangle', 0.07),
  crit: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.18, 'square', 0.06, i * 0.06)),
  story: () => [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.07)),
  buy: () => { tone(988, 0.08, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, 0.07); },
  evolve: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.11)),
  deny: () => tone(200, 0.1, 'sawtooth', 0.05),
  golden: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.05)),
  siren: () => [0, 1, 2, 3].forEach((i) => tone(i % 2 ? 660 : 880, 0.22, 'square', 0.05, i * 0.22)),
  jackpot: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, 'square', 0.06, i * 0.07)),
  fail: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.15)),
  fanfare: () => [523, 523, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.06, i * 0.12)),
  record: () => [659, 784, 988, 1319, 1568, 1976].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.08)),
};
