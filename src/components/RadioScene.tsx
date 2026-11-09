import { useEffect, useMemo, useRef } from 'react';
import { toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { money } from '../game/format';
import { confetti, liveFx } from '../game/fx';
import { useGame } from '../game/state';
import { RADIO_ANNOUNCE, radioFrom } from '../scene/radio';
import {
  SCENE_H as H, buildCrowd, drawClouds, drawMember, drawStarsMoon, drawSun, glow, reactionText, shadeLayer, stepParticles,
  useCoins, useCrowdReactions, useParallax, useSceneDims, type Member, type Particle,
} from '../scene/common';
import { drawSprite, localHour, mix, personSprite, rect, seeded, skyAt, sprite } from '../scene/draw';
import { characterSprite, moodFromValue } from './pixel';

const GROUND = 54;
const CROWD_CY = 67;

export function RadioScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = useSceneDims(wrapRef);
  const parallax = useParallax();
  const coins = useCoins(52, 22);

  const s = useGame();
  const radio = useMemo(() => radioFrom(s), [s.lifetimeCash, s.cash, s.staff, s.upgrades, s.era]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodName = moodFromValue(s.mood);
  const { W, scale } = dims;
  const sw = Math.round(W * 0.42); // studio width
  const towerX = sw + 12;
  const crowdX = Math.round(W * 0.7);

  const live = useRef({ radio, moodName, combo: s.combo, W, sw, towerX, crowdX });
  live.current = { radio, moodName, combo: s.combo, W, sw, towerX, crowdX };

  const crowd = useRef<Member[]>([]);
  useEffect(() => {
    crowd.current = buildCrowd(radio.crowd, crowdX, CROWD_CY, Math.min(46, W * 0.2), 6, 4242);
  }, [radio.crowd, W, crowdX]);

  const particles = useRef<Particle[]>([]);
  const rings = useRef<number[]>([]);
  useCrowdReactions(crowd, particles, {
    onWord: (now) => {
      rings.current.push(now);
      if (rings.current.length > 8) rings.current.shift();
    },
    onBig: (now) => {
      rings.current.push(now, now + 120, now + 240);
    },
  });

  // growth announcements
  const firstRun = useRef(true);
  useEffect(() => {
    const st = useGame.getState();
    const newly = RADIO_ANNOUNCE.filter((a) => a.check(radio) && !st.townSeen.includes(a.id));
    if (newly.length) {
      st.patch({ townSeen: [...st.townSeen, ...newly.map((a) => a.id)] });
      if (!firstRun.current) {
        const a = newly[newly.length - 1];
        toast({ emoji: a.emoji, title: 'Your station is growing!', lines: [a.text], big: true });
        confetti(0.4);
      }
    }
    firstRun.current = false;
  }, [radio]);

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const main = canvas.getContext('2d')!;
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = canvas.width;
    fgCanvas.height = canvas.height;
    const fg = fgCanvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let discAngle = 0;

    const frame = (nowMs: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      acc += dt;
      if (acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      if (document.hidden) return;

      const { radio: r, moodName: mood, combo, W, sw, towerX, crowdX } = live.current;
      const time = nowMs / 1000;
      const hour = localHour();
      const sky = skyAt(hour);
      const night = sky.night;
      const par = (parallax.current.cur += (parallax.current.target - parallax.current.cur) * 0.05);
      const lights: (() => void)[] = [];
      const dark = (col: string, k = 0.45) => mix(col, '#2a2640', night * k);
      const typing = Date.now() - useGame.getState().lastKeyAt < 1500;
      const signal = liveFx.signal;
      let ctx = main;

      // ---------- sky ----------
      const g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, sky.top);
      g.addColorStop(1, sky.bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      drawStarsMoon(ctx, W, time, night, sky.top);
      drawSun(ctx, W, hour);
      drawClouds(ctx, W, time, night, par);

      // zeppelin
      if (r.zeppelin) {
        const zx = W + 30 - ((time * 3) % (W + 80));
        const zy = 9 + Math.sin(time * 0.5) * 1.5;
        rect(ctx, zx, zy, 22, 6, dark('#b8b8c8', 0.4));
        rect(ctx, zx + 2, zy - 1, 18, 1, dark('#b8b8c8', 0.4));
        rect(ctx, zx + 2, zy + 6, 18, 1, dark('#9a9aaa', 0.4));
        rect(ctx, zx + 20, zy - 2, 3, 3, dark('#9a9aaa', 0.4));
        rect(ctx, zx + 8, zy + 7, 6, 2, dark('#5a5a6a', 0.4));
        rect(ctx, zx + 4, zy + 2, 12, 2, '#b48cff');
      }

      // ---------- far: hills, houses, skyscrapers ----------
      const fp = -par;
      const hill = dark('#6a9a5a', 0.6);
      for (let x = 0; x < W; x++) {
        const h = 10 + Math.sin((x + fp) * 0.05) * 4 + Math.sin((x + fp) * 0.13) * 1.5;
        rect(ctx, x, GROUND - h, 1, h, hill);
      }
      if (r.skyscraper) {
        const rs = seeded(88);
        for (let i = 0; i < 5; i++) {
          const x = Math.round(W * 0.48 + i * 13 + fp);
          const h = 26 + Math.floor(rs() * 14);
          const col = dark('#7a7a96', 0.6);
          rect(ctx, x, GROUND - h, 9, h, col);
          rect(ctx, x + 2, GROUND - h - 4, 5, 4, col);
          rect(ctx, x + 4, GROUND - h - 8, 1, 4, col);
          for (let y = GROUND - h + 3; y < GROUND - 4; y += 3) {
            if (night > 0.3 && rs() < 0.6) lights.push(() => rect(ctx, x + 2, y, 5, 1, '#ffd36e'));
          }
        }
      }
      // little houses of the listeners
      const hs = seeded(55);
      for (let i = 0; i < 6; i++) {
        const x = Math.round(W * 0.5 + i * 17 + hs() * 6 + fp * 1.5);
        if (x > W - 4) break;
        const y = GROUND - 9 - Math.floor(hs() * 3);
        rect(ctx, x, y, 10, GROUND - y, dark('#e3d0b8', 0.55));
        for (let k = 0; k < 4; k++) rect(ctx, x - 1 + k, y - 4 + k, 12 - k * 2, 1, dark('#a0503a', 0.55));
        if (night > 0.3) lights.push(() => rect(ctx, x + 3, y + 3, 3, 2, '#ffd36e'));
        else rect(ctx, x + 3, y + 3, 3, 2, dark('#8fb6d0', 0.6));
        if (r.antennas) {
          rect(ctx, x + 7, y - 9, 1, 6, dark('#2a2433', 0.4));
          rect(ctx, x + 5, y - 9, 5, 1, dark('#2a2433', 0.4));
        }
      }

      // billboard
      if (r.billboard) {
        const bx = Math.round(W * 0.84 + fp * 1.5);
        rect(ctx, bx + 3, GROUND - 14, 1, 14, dark('#5a3a20'));
        rect(ctx, bx + 18, GROUND - 14, 1, 14, dark('#5a3a20'));
        rect(ctx, bx, GROUND - 26, 22, 12, dark('#f4efe0', 0.4));
        rect(ctx, bx + 1, GROUND - 25, 20, 10, dark('#3d2a66', 0.4));
        rect(ctx, bx + 3, GROUND - 22, 16, 2, '#ffd84d');
        rect(ctx, bx + 5, GROUND - 18, 12, 1, '#b48cff');
      }

      // ---------- the tower + radio waves ----------
      const mp = -par * 2;
      const tx = towerX + mp;
      const topY = r.megaTower ? 15 : 19; // below the goal banner so the waves are visible
      const steel = dark('#9a9fb0');
      for (let y = 0; y < GROUND - topY - 2; y++) {
        const k = y / (GROUND - topY);
        const half = Math.round(9 - k * 7);
        const yy = GROUND - 1 - y;
        rect(ctx, tx - half, yy, 1, 1, steel);
        rect(ctx, tx + half, yy, 1, 1, steel);
        if (y % 5 === 0) rect(ctx, tx - half, yy, half * 2 + 1, 1, steel);
        if (y % 5 === 2) rect(ctx, tx - half + ((y * 3) % (half * 2 + 1)), yy, 1, 1, steel);
      }
      rect(ctx, tx, topY - 4, 1, 6, steel);
      if (r.bigAntenna) {
        rect(ctx, tx - 5, topY + 6, 11, 1, steel);
        rect(ctx, tx - 4, topY + 12, 9, 1, steel);
        rect(ctx, tx + 3, topY + 2, 4, 3, dark('#c9c9d9'));
      }
      const beacon = Math.floor(time * 1.5) % 2 === 0;
      lights.push(() => {
        rect(ctx, tx - 1, topY - 6, 3, 2, beacon ? '#ff3344' : '#6a1a22');
        if (beacon) glow(ctx, tx + 0.5, topY - 5, r.megaTower ? 14 : 9, 0.35, '#ff3344');
      });
      // waves: clean when your rhythm is steady, jagged + static when it isn't
      const wavesFrom = { x: tx + 1, y: topY - 4 };
      const ringList = rings.current.filter((t0) => nowMs - t0 < 3200);
      rings.current = ringList;
      // word bursts + two calm 'carrier' rings that always pulse
      const allRings = [...ringList.map((t0) => (nowMs - t0) / 1000), time % 1.3, (time % 1.3) + 1.3];
      const jitter = (1 - signal) * 3;
      allRings.forEach((age, idx) => {
        const radius = age * 45 + 4;
        if (radius > W) return;
        const isBurst = idx < ringList.length;
        ctx.globalAlpha = Math.max(0, (isBurst ? 1 : 0.45) * (1 - radius / (W * 0.85)));
        const color = isBurst ? (signal > 0.75 ? '#f0e0ff' : '#c9a4ff') : '#b48cff';
        const stepDeg = Math.max(1.5, 90 / Math.max(10, radius));
        for (let a = -55; a <= 40; a += stepDeg) {
          if (signal < 0.4 && Math.random() < 0.35) continue;
          const rad = (a * Math.PI) / 180;
          const j = jitter ? (Math.random() - 0.5) * jitter * 2 : 0;
          const px = wavesFrom.x + Math.cos(rad) * (radius + j);
          const py = wavesFrom.y + Math.sin(rad) * (radius + j) * 0.8 + 2;
          if (py < GROUND - 2) rect(ctx, px, py, isBurst ? 2 : 1, 1, color);
        }
        ctx.globalAlpha = 1;
      });
      if (typing && signal < 0.4) {
        for (let i = 0; i < 14; i++) rect(ctx, wavesFrom.x + Math.random() * 70, Math.random() * (GROUND - 10), 1, 1, '#ffffff');
      }

      // ---------- the studio (cut open) ----------
      const sx = 2 + mp;
      const top = 10;
      const deco = dark(r.neon ? '#e8d8c8' : '#d8c8b0');
      // stepped art-deco roof
      rect(ctx, sx + sw / 2 - 10, top - 6, 20, 6, deco);
      rect(ctx, sx + sw / 2 - 5, top - 9, 10, 3, deco);
      rect(ctx, sx + sw / 2, top - 15, 1, 6, dark('#5a5a6a'));
      rect(ctx, sx, top, sw, GROUND - top, deco);
      rect(ctx, sx, top, sw, 1, dark('#b8a890'));
      // sign band (text overlay)
      rect(ctx, sx + 4, top + 1, sw - 8, 7, '#1a1020');
      // interior
      const iy = top + 10;
      const ih = GROUND - 2 - iy;
      const wall = r.padded ? '#5a3a8a' : '#3d2a66';
      const litRoom = night > 0.3 || typing;
      const drawInterior = () => {
        rect(ctx, sx + 3, iy, sw - 6, ih, wall);
        if (r.padded) {
          for (let y = iy + 1; y < iy + ih - 4; y += 3) for (let x = sx + 31 + ((y / 3) % 2) * 1.5; x < sx + 62; x += 3) rect(ctx, x, y, 1, 1, '#7a5aaa');
        }
        rect(ctx, sx + 3, iy + ih - 3, sw - 6, 3, '#2a1a40');
        // glass between control room and booth
        rect(ctx, sx + 29, iy, 1, ih - 3, '#8fd6ff');
        rect(ctx, sx + 63, iy, 1, ih - 3, '#8fd6ff');

        // control room: engineer + mixer
        const mixLights = r.mixer ? 6 : 3;
        rect(ctx, sx + 6, iy + ih - 9, 20, 6, '#2a2433');
        for (let i = 0; i < mixLights; i++) {
          const on = (Math.floor(time * 6) + i) % 3 === 0 || (typing && i % 2 === 0);
          rect(ctx, sx + 8 + i * 3, iy + ih - 8, 2, 1, on ? '#5dff9b' : '#2a6a3a');
        }
        for (let i = 0; i < 5; i++) rect(ctx, sx + 8 + i * 3, iy + ih - 6, 1, 2, '#c9c9d9');
        if (r.engineers > 0) drawSprite(ctx, personSprite({ skin: 1, hair: 4, shirt: 7, pants: 0, hat: null }, 'stand', false), sx + 12, iy + ih - 25 + (typing ? Math.floor(time * 4) % 2 : 0));

        // booth: you at the microphone
        const you = characterSprite('manager', mood);
        const img = sprite(`radio-${mood}`, you.rows, you.palette);
        const bob = typing ? Math.floor(time * 8) % 2 : 0;
        drawSprite(ctx, img, sx + 33, iy + ih - 19 - bob);
        rect(ctx, sx + 32, iy + ih - 6, 28, 3, '#6b4226');
        // microphone
        const mx = sx + 50;
        const my = iy + ih - (r.bigMic ? 16 : 13);
        rect(ctx, mx + 1, my + 5, 1, iy + ih - 6 - (my + 5), '#5a5a6a');
        rect(ctx, mx, my, r.bigMic ? 4 : 3, r.bigMic ? 6 : 5, '#c9c9d9');
        rect(ctx, mx, my + 1, r.bigMic ? 4 : 3, 1, '#8a8a9a');
        if (r.bigMic) rect(ctx, mx - 1, my + 2, 6, 1, '#e8e8f0');
        // celebrity guest
        if (r.celebrity) {
          drawSprite(ctx, personSprite({ skin: 0, hair: 2, shirt: 8, pants: 1, hat: 4 }, 'stand', true), sx + 53, iy + ih - 21);
          rect(ctx, sx + 55, iy + ih - 18, 5, 1, '#1a1020');
          if (Math.sin(time * 3) > 0) rect(ctx, sx + 57, iy + ih - 24, 1, 1, '#ffd84d');
        }
        // hotline phone
        if (r.hotline) {
          rect(ctx, sx + 33, iy + ih - 8, 4, 2, '#1a1020');
          if (Math.floor(time * 4) % 4 === 0) rect(ctx, sx + 36, iy + ih - 9, 1, 1, '#ff3344');
        }

        // DJ corner
        const ddx = sx + 66;
        rect(ctx, ddx, iy + ih - 7, sw - 71, 4, '#2a2433');
        const decks = r.doubleDeck ? 2 : 1;
        for (let i = 0; i < decks; i++) {
          const dxp = ddx + 2 + i * 9;
          rect(ctx, dxp, iy + ih - 8, 7, 2, '#111');
          const p = Math.round(Math.cos(discAngle + i) * 2);
          rect(ctx, dxp + 3 + p, iy + ih - 8, 1, 1, '#d6334a');
        }
        for (let i = 0; i < 4; i++) rect(ctx, ddx + 2 + i * 4, iy + 2, 3, 6, ['#d6334a', '#2e86c1', '#e8a812', '#27ae60'][i]);
        if (r.djs > 0) drawSprite(ctx, personSprite({ skin: 3, hair: 0, shirt: 3, pants: 0, hat: null }, typing ? 'cheer' : 'stand', false), ddx + 5, iy + ih - 23 + (Math.floor(time * 4) % 2));
      };
      discAngle += step * (typing ? 10 : 3);
      if (litRoom) lights.push(drawInterior);
      else drawInterior();
      // reruns sign at night
      if (r.reruns && night > 0.3) lights.push(() => rect(ctx, sx + 66, iy - 1, 12, 1, '#ff9d3d'));

      // ---------- TV studio construction (the next goal) ----------
      if (ERAS[useGame.getState().era].evolveCost != null) {
        const cx0 = W - 24 + mp;
        rect(ctx, cx0 - 2, GROUND - 1, 24, 2, dark('#7a6a5a'));
        if (r.build === 0) {
          rect(ctx, cx0 + 9, GROUND - 13, 1, 12, dark('#6b4226'));
          rect(ctx, cx0 + 3, GROUND - 17, 14, 6, dark('#f4efe0', 0.4));
        }
        if (r.build >= 1) rect(ctx, cx0 + 1, GROUND - 4, 18, 3, dark('#9a948a'));
        const hgt = [0, 0, 8, 16, 22, 22][r.build];
        if (hgt) {
          rect(ctx, cx0 + 1, GROUND - 1 - hgt, 18, hgt, dark('#8a90a8'));
          for (let y = GROUND - 1 - hgt; y < GROUND - 1; y += 3) rect(ctx, cx0 + 1, y, 18, 1, dark('#7a8098'));
        }
        if (r.build >= 4) {
          rect(ctx, cx0 + 12, GROUND - 1 - hgt - 6, 6, 4, dark('#c9c9d9'));
          rect(ctx, cx0 + 14, GROUND - 1 - hgt - 2, 1, 2, dark('#5a5a6a'));
        }
        if (r.build >= 5) {
          lights.push(() => {
            rect(ctx, cx0 + 4, GROUND - 14, 8, 6, Math.floor(time * 2) % 2 ? '#8fd6ff' : '#b48cff');
            glow(ctx, cx0 + 8, GROUND - 11, 12, 0.25, '#8fd6ff');
          });
        }
      }

      // ---------- ground: road + park ----------
      rect(ctx, 0, GROUND, W, 4, dark('#4a4a52', 0.5));
      for (let x = 2; x < W; x += 8) rect(ctx, x, GROUND + 2, 4, 1, dark('#c9c9a0', 0.5));
      rect(ctx, 0, GROUND + 4, W, H - GROUND - 4, dark('#5f9446', 0.55));
      const gr = seeded(17);
      for (let i = 0; i < W; i++) rect(ctx, gr() * W, GROUND + 5 + gr() * (H - GROUND - 5), 1, 1, dark('#4e7d3a', 0.55));

      // electric streetlights
      if (r.streetlights) {
        for (const lx of [W * 0.46, W * 0.62, W * 0.95]) {
          const x2 = Math.round(lx + mp);
          rect(ctx, x2, GROUND - 16, 1, 16, dark('#2a2433'));
          rect(ctx, x2, GROUND - 16, 3, 1, dark('#2a2433'));
          lights.push(() => {
            rect(ctx, x2 + 2, GROUND - 15, 2, 1, night > 0.3 ? '#f4fbff' : '#9a9aaa');
            if (night > 0.3) glow(ctx, x2 + 3, GROUND - 12, 12, 0.18 * night, '#e8f4ff');
          });
        }
      }

      if (night > 0.02) {
        ctx.globalAlpha = night * 0.45;
        rect(ctx, 0, 0, W, H, '#0a0e28');
        ctx.globalAlpha = 1;
      }
      lights.forEach((f) => f());

      // ---------- foreground ----------
      fg.clearRect(0, 0, W, H);
      ctx = fg;
      const fp3 = -par * 3;
      const drawables: { y: number; draw: () => void }[] = [];

      // passing car / remote truck
      if (r.car || r.truck) {
        const period = 22;
        const t = time % period;
        const useTruck = r.truck && Math.floor(time / period) % 2 === 0;
        const vx = -30 + t * (useTruck ? 12 : 20);
        if (vx < W + 30) {
          drawables.push({
            y: GROUND + 2,
            draw: () => {
              const y0 = GROUND + 3;
              if (useTruck) {
                rect(ctx, vx, y0 - 10, 20, 8, '#e8e4d8');
                rect(ctx, vx + 14, y0 - 8, 5, 3, '#8fd6ff');
                rect(ctx, vx + 3, y0 - 9, 8, 2, '#b48cff');
                rect(ctx, vx + 5, y0 - 15, 6, 4, '#c9c9d9');
                rect(ctx, vx + 7, y0 - 11, 1, 1, '#5a5a6a');
                rect(ctx, vx + 2, y0 - 2, 3, 2, '#1a1020');
                rect(ctx, vx + 14, y0 - 2, 3, 2, '#1a1020');
              } else {
                rect(ctx, vx, y0 - 6, 16, 4, '#7a2f3f');
                rect(ctx, vx + 4, y0 - 9, 8, 3, '#7a2f3f');
                rect(ctx, vx + 5, y0 - 8, 3, 2, '#8fd6ff');
                rect(ctx, vx + 2, y0 - 2, 3, 2, '#1a1020');
                rect(ctx, vx + 11, y0 - 2, 3, 2, '#1a1020');
              }
            },
          });
        }
      }

      // field reporters broadcasting outside
      for (let i = 0; i < r.fieldReporters; i++) {
        const rx = Math.round(W * (i === 0 ? 0.47 : 0.93));
        const y = GROUND + 9;
        drawables.push({
          y,
          draw: () => {
            drawSprite(ctx, personSprite({ skin: (i + 2) % 4, hair: 1, shirt: 1, pants: 0, hat: 1 }, 'stand', true), rx + fp3, y - 16, i === 1);
            rect(ctx, rx + fp3 + (i === 1 ? -1 : 8), y - 11, 2, 2, '#c9c9d9');
          },
        });
      }

      // the big radio cabinet everyone listens to
      drawables.push({
        y: CROWD_CY - 4,
        draw: () => {
          const rx = crowdX - 6 + fp3;
          const ry = CROWD_CY - 20;
          rect(ctx, rx, ry, 12, 14, '#7a4a2a');
          rect(ctx, rx + 1, ry - 2, 10, 2, '#8a5a30');
          rect(ctx, rx + 2, ry + 2, 8, 6, '#3a2418');
          for (let i = 0; i < 3; i++) rect(ctx, rx + 3, ry + 3 + i * 2, 6, 1, '#6b4226');
          rect(ctx, rx + 3, ry + 10, 3, 2, typing ? '#ffd36e' : '#c99a40');
          rect(ctx, rx + 8, ry + 10, 2, 2, '#c9a227');
          rect(ctx, rx + 2, ry + 14, 2, 3, '#5a3a20');
          rect(ctx, rx + 8, ry + 14, 2, 3, '#5a3a20');
          if (typing && Math.floor(time * 3) % 2 === 0) rect(ctx, rx + 12 + ((time * 6) % 4), ry - 3 - ((time * 5) % 5), 1, 2, '#ffd84d');
        },
      });

      const members = crowd.current;
      const dance = combo >= 10;
      members.forEach((m, i) =>
        drawables.push({
          y: m.y,
          draw: () => {
            if (dance && (Math.floor(time * 4) + i) % 2 === 0) m.cheerUntil = Math.max(m.cheerUntil, nowMs + 200);
            drawMember(ctx, m, nowMs, time, mood, fp3, dance && i % 4 === 1);
          },
        }),
      );
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
      particles.current = stepParticles(ctx, particles.current, step, night);

      shadeLayer(fg, W, H, night);
      main.drawImage(fgCanvas, 0, 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W, parallax]);

  const era = ERAS[s.era];
  const goalCost = era.evolveCost;
  const shout = s.shout;
  const shoutTail = shout.length > 40 ? '…' + shout.slice(-40) : shout;
  const visiting = s.boost && Date.now() < s.boost.until ? s.boost : null;
  const onAir = Date.now() - s.lastKeyAt < 1500;

  return (
    <div ref={wrapRef} className="town radio-scene" style={{ height: H * scale }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />

      <div className={`station-sign ${radio.neon ? 'neon' : ''}`} style={{ left: 6 * scale, top: 11 * scale, width: (sw - 8) * scale, height: 7 * scale }}>
        RADIO SHOUT
      </div>
      <div className={`onair-light ${onAir ? 'on' : ''}`} style={{ left: 36 * scale, top: 21 * scale }}>ON AIR</div>

      {goalCost != null && (
        <div className={`goal ${s.cash >= goalCost ? 'ready' : ''}`}>
          <span className="goal-text">
            🎯 <b>Goal:</b> save {money(goalCost)} to build a <b>TV studio</b> 📺
          </span>
          <span className="goal-bar"><span style={{ width: `${radio.buildPct * 100}%` }} /></span>
        </div>
      )}
      {goalCost != null && (
        <div className={`site-label ${radio.build >= 5 ? 'ready' : ''}`} style={{ left: (W - 27) * scale, top: (GROUND + 1) * scale, width: 26 * scale }}>
          {radio.build >= 5 ? '📺 Ready!' : `🏗️ ${Math.floor(radio.buildPct * 100)}%`}
        </div>
      )}

      <div className={`shout ${shout ? '' : 'empty'}`} style={{ left: (towerX + 14) * scale, top: 29 * scale, bottom: 'auto' }}>
        <span className="shout-prefix">🎙️ ON AIR:</span>
        {shout ? <span className="shout-text">{shoutTail}</span> : <span className="shout-text dim">type to broadcast…</span>}
      </div>

      <div className={`crowd-reaction town-reaction mood-${moodName}`} style={{ left: `${(crowdX / W) * 100}%` }}>
        {reactionText(moodName, 'listeners')}
      </div>
      {s.reveal.shop && <div className="backlog-chip">📜 {Math.floor(s.backlog)} news waiting</div>}

      {visiting && (
        <div className="visitor" key={visiting.until}>
          <span className="visitor-emoji">{visiting.emoji}</span>
          <span className="visitor-label">×{visiting.mult}!</span>
        </div>
      )}
      {coins.map((c) => (
        <div key={c.id} className="coin" style={{ left: `${c.x}%` }}>{c.text}</div>
      ))}
    </div>
  );
}
