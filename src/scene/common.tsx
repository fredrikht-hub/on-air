// Shared machinery for all era scenes: sizing, crowd, reactions, sky, night lighting, coins.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { money } from '../game/format';
import { onScene } from '../game/fx';
import { idleRate, useGame } from '../game/state';
import type { Mood } from '../components/pixel';
import {
  HAIRS, HATS, PANTS, SHIRTS, SKINS, drawSprite, hatSprite, mix, personSprite, rect, seeded, signSprite,
  type Look, type Pose,
} from './draw';

export const SCENE_H = 78;

// ---------- sizing ----------
export function useSceneDims(wrapRef: RefObject<HTMLDivElement>) {
  const [dims, setDims] = useState({ W: 215, scale: 4 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const scale = w >= 700 ? 4 : 3;
      setDims({ W: Math.floor(w / scale), scale });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrapRef]);
  return dims;
}

// ---------- crowd ----------
export interface Member {
  x: number; y: number; look: Look; phase: number; flip: boolean; sign: number;
  jumpUntil: number; cheerUntil: number; hatOffUntil: number; oopsUntil: number; lookUntil: number;
}

export function buildCrowd(n: number, cx: number, cy: number, rx: number, ry: number, seed = 1234): Member[] {
  const rnd = seeded(seed + n);
  const out: Member[] = [];
  for (let i = 0; i < n; i++) {
    const front = i % 3 !== 2;
    let theta: number;
    if (front) theta = Math.PI * (0.1 + rnd() * 0.8);
    else theta = Math.PI * (rnd() < 0.5 ? 1.08 + rnd() * 0.3 : 1.62 + rnd() * 0.3);
    const x = cx + Math.cos(theta) * rx * (0.75 + rnd() * 0.25);
    const y = cy + Math.sin(theta) * ry;
    out.push({
      x, y, flip: x > cx, phase: rnd() * 10, sign: Math.floor(rnd() * 3),
      look: {
        skin: Math.floor(rnd() * SKINS.length), hair: Math.floor(rnd() * HAIRS.length), shirt: Math.floor(rnd() * SHIRTS.length),
        pants: Math.floor(rnd() * PANTS.length), hat: rnd() < 0.55 ? Math.floor(rnd() * HATS.length) : null,
      },
      jumpUntil: 0, cheerUntil: 0, hatOffUntil: 0, oopsUntil: 0, lookUntil: 0,
    });
  }
  return out;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  kind: 'hat' | 'smoke' | 'paper' | 'steam'; color: number;
}

/** wire the crowd to typing events (shared by every era) */
export function useCrowdReactions(
  crowd: RefObject<Member[]>,
  particles: RefObject<Particle[]>,
  opts: { onWord?: (now: number) => void; onBig?: (now: number) => void; throwPapers?: boolean } = {},
) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  useEffect(
    () =>
      onScene((ev) => {
        const now = performance.now();
        const members = crowd.current ?? [];
        const parts = particles.current ?? [];
        const o = optsRef.current;
        if (ev === 'word') {
          o.onWord?.(now);
          for (const m of members) if (Math.random() < 0.35) { m.jumpUntil = now + 260; m.lookUntil = now + 1200; }
        } else if (ev === 'crit') {
          o.onBig?.(now);
          for (const m of members) { m.jumpUntil = now + 320; m.lookUntil = now + 1500; }
        } else if (ev === 'perfect') {
          for (const m of members) { m.cheerUntil = now + 900; m.lookUntil = now + 1500; }
        } else if (ev === 'golden') {
          o.onBig?.(now);
          for (const m of members) {
            m.cheerUntil = now + 1500;
            m.jumpUntil = now + 350;
            m.lookUntil = now + 2500;
            if (o.throwPapers) {
              if (Math.random() < 0.6) parts.push({ x: m.x, y: m.y - 14, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 25, life: 0, max: 2.4, kind: 'paper', color: 0 });
            } else if (m.look.hat != null && m.hatOffUntil < now) {
              m.hatOffUntil = now + 5000;
              parts.push({ x: m.x - 3, y: m.y - 16, vx: (Math.random() - 0.5) * 30, vy: -45 - Math.random() * 25, life: 0, max: 2.2, kind: 'hat', color: m.look.hat });
            }
          }
        } else if (ev === 'mistake') {
          for (const m of members.filter(() => Math.random() < 0.15).slice(0, 3)) m.oopsUntil = now + 900;
        }
      }),
    [crowd, particles],
  );
}

/** draw one crowd member. `idlePose` lets readers hold their newspaper when nothing is happening */
export function drawMember(
  ctx: CanvasRenderingContext2D, m: Member, nowMs: number, time: number, mood: Mood, offsetX: number,
  showSign: boolean, idlePose: Pose = 'stand',
) {
  const jumping = nowMs < m.jumpUntil;
  const cheering = nowMs < m.cheerUntil || mood === 'ecstatic';
  const idleHop = Math.sin(time * 2.2 + m.phase) > 0.97 ? 1 : 0;
  const dy = jumping ? 3 : idleHop;
  const hatOn = m.look.hat != null && nowMs > m.hatOffUntil;
  const oops = nowMs < m.oopsUntil;
  const attentive = nowMs < m.lookUntil;
  const pose: Pose = cheering ? 'cheer' : attentive ? 'stand' : idlePose;
  const img = personSprite(m.look, pose, hatOn, oops ? 'o' : 'smile');
  const px = m.x - 4 + offsetX;
  const py = m.y - 16 - dy;
  drawSprite(ctx, img, px, py, m.flip);
  if (showSign) drawSprite(ctx, signSprite(m.sign), px + 1, py - 9);
  if (oops) {
    rect(ctx, px + 4, py - 3, 1, 2, '#c77dff');
    rect(ctx, px + 4, py, 1, 1, '#c77dff');
  }
}

// ---------- sky ----------
export function drawStarsMoon(ctx: CanvasRenderingContext2D, W: number, time: number, night: number, skyTop: string) {
  if (night <= 0.05) return;
  const rs = seeded(9);
  for (let i = 0; i < 30; i++) {
    const x = rs() * W;
    const y = rs() * 30;
    ctx.globalAlpha = night * (Math.sin(time * 2 + i) > 0.3 ? 1 : 0.45);
    rect(ctx, x, y, 1, 1, '#ffffff');
  }
  ctx.globalAlpha = night;
  const mx = W * 0.8;
  rect(ctx, mx, 6, 5, 5, '#f4f1de');
  rect(ctx, mx + 3, 5, 3, 4, skyTop);
  ctx.globalAlpha = 1;
}

export function drawSun(ctx: CanvasRenderingContext2D, W: number, hour: number) {
  if (hour <= 6 || hour >= 19) return;
  const p = (hour - 6) / 13;
  const sx = 8 + p * (W - 16);
  const sy = 30 - Math.sin(p * Math.PI) * 24;
  rect(ctx, sx - 2, sy - 3, 5, 7, '#ffe48a');
  rect(ctx, sx - 3, sy - 2, 7, 5, '#ffe48a');
  rect(ctx, sx - 1, sy - 2, 3, 5, '#fff3c4');
}

export function drawClouds(ctx: CanvasRenderingContext2D, W: number, time: number, night: number, par: number, tint = '#ffffff') {
  const cloudCol = mix(tint, '#6a6a8a', night);
  for (let i = 0; i < 4; i++) {
    const r = seeded(77 + i);
    const speed = 0.6 + r() * 0.8;
    const span = W + 40;
    const x = ((r() * span + time * speed) % span) - 20 - par;
    const y = 5 + r() * 16;
    rect(ctx, x, y, 14, 3, cloudCol);
    rect(ctx, x + 3, y - 2, 7, 2, cloudCol);
    rect(ctx, x + 8, y - 1, 5, 1, cloudCol);
  }
}

/** update + draw particles (hats, smoke, flying newspapers, steam) */
export function stepParticles(ctx: CanvasRenderingContext2D, list: Particle[], step: number, night: number): Particle[] {
  const alive = list.filter((p) => (p.life += step) < p.max);
  for (const p of alive) {
    if (p.kind === 'hat' || p.kind === 'paper') p.vy += 60 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.kind === 'smoke' || p.kind === 'steam') {
      ctx.globalAlpha = (p.kind === 'steam' ? 0.7 : 0.5) * (1 - p.life / p.max);
      const big = p.life > 1.5 ? 2 : 1;
      rect(ctx, p.x + Math.sin(p.life * 3), p.y, big, big, p.kind === 'steam' ? '#f4f4f4' : mix('#d8d8d8', '#5a5a70', night));
      ctx.globalAlpha = 1;
    } else if (p.kind === 'paper') {
      const flip = Math.floor(p.life * 8) % 2;
      rect(ctx, p.x, p.y, flip ? 3 : 2, flip ? 2 : 3, '#f4efe0');
      rect(ctx, p.x, p.y, 1, 1, '#7a6a5a');
    } else drawSprite(ctx, hatSprite(p.color), p.x, p.y);
  }
  return alive;
}

/** darken only what was drawn on the foreground layer (people), keeping lights bright */
export function shadeLayer(ctx: CanvasRenderingContext2D, W: number, H: number, night: number) {
  if (night <= 0.02) return;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = night * 0.45;
  ctx.fillStyle = '#0a0e28';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color = '#ffd36e') {
  ctx.globalAlpha = alpha;
  rect(ctx, x - size / 2, y - size / 2, size, size, color);
  ctx.globalAlpha = 1;
}

// ---------- mouse parallax ----------
export function useParallax() {
  const p = useRef({ cur: 0, target: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => (p.current.target = (e.clientX / window.innerWidth - 0.5) * 2);
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return p;
}

// ---------- helper income coins ----------
/** helper income coins; xFrom/xSpan in % of the scene width */
export function useCoins(xFrom = 4, xSpan = 20) {
  const [coins, setCoins] = useState<{ id: number; x: number; text: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      const rate = idleRate(useGame.getState());
      if (rate <= 0 || document.hidden) return;
      const cid = ++n;
      setCoins((c) => [...c.slice(-6), { id: cid, x: xFrom + Math.random() * xSpan, text: '+' + money(rate) }]);
      window.setTimeout(() => setCoins((c) => c.filter((q) => q.id !== cid)), 1400);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return coins;
}

export function reactionText(mood: Mood, who: 'crowd' | 'readers' | 'listeners' | 'viewers'): string {
  const one = who === 'crowd';
  switch (mood) {
    case 'ecstatic': return `🤩 The ${who} ${one ? 'LOVES' : 'LOVE'} you!`;
    case 'happy': return `😄 The ${who} ${one ? 'is' : 'are'} cheering`;
    case 'neutral': return `🙂 The ${who} ${one ? 'is' : 'are'} ${who === 'readers' ? 'reading' : who === 'viewers' ? 'watching' : 'listening'}`;
    case 'worried': return `😕 The ${who} ${one ? 'is' : 'are'} getting bored…`;
    case 'angry': return '😠 Booo! Fix your typos!';
  }
}
