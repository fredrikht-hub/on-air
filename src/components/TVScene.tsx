import { useEffect, useMemo, useRef } from 'react';
import { toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { money } from '../game/format';
import { confetti, liveFx } from '../game/fx';
import { useGame } from '../game/state';
import { TV_ANNOUNCE, tvFrom } from '../scene/tv';
import {
  SCENE_H as H, buildCrowd, drawClouds, drawMember, drawStarsMoon, drawSun, glow, reactionText, shadeLayer, stepParticles,
  useCoins, useCrowdReactions, useParallax, useSceneDims, type Member, type Particle,
} from '../scene/common';
import { drawSprite, localHour, mix, personSprite, rect, seeded, skyAt, sprite } from '../scene/draw';
import { characterSprite, moodFromValue } from './pixel';

const GROUND = 54;
const CROWD_CY = 67;

export function TVScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = useSceneDims(wrapRef);
  const parallax = useParallax();
  const coins = useCoins(52, 22);

  const s = useGame();
  const tv = useMemo(() => tvFrom(s), [s.lifetimeCash, s.cash, s.staff, s.upgrades, s.era]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodName = moodFromValue(s.mood);
  const { W, scale } = dims;
  const sw = Math.max(96, Math.round(W * 0.45)); // studio width
  const crowdX = Math.round(sw + (W - sw) * 0.45);

  const live = useRef({ tv, moodName, combo: s.combo, W, sw, crowdX });
  live.current = { tv, moodName, combo: s.combo, W, sw, crowdX };

  const crowd = useRef<Member[]>([]);
  useEffect(() => {
    crowd.current = buildCrowd(tv.crowd, crowdX, CROWD_CY, Math.min(44, (W - sw) * 0.36), 6, 5151);
  }, [tv.crowd, W, sw, crowdX]);

  const particles = useRef<Particle[]>([]);
  const flash = useRef(0);
  useCrowdReactions(crowd, particles, {
    onWord: (now) => (flash.current = Math.max(flash.current, now + 120)),
    onBig: (now) => (flash.current = now + 500),
  });

  // growth announcements
  const firstRun = useRef(true);
  useEffect(() => {
    const st = useGame.getState();
    const newly = TV_ANNOUNCE.filter((a) => a.check(tv) && !st.townSeen.includes(a.id));
    if (newly.length) {
      st.patch({ townSeen: [...st.townSeen, ...newly.map((a) => a.id)] });
      if (!firstRun.current) {
        const a = newly[newly.length - 1];
        toast({ emoji: a.emoji, title: 'Your TV station is growing!', lines: [a.text], big: true });
        confetti(0.4);
      }
    }
    firstRun.current = false;
  }, [tv]);

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

    const frame = (nowMs: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      acc += dt;
      if (acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      if (document.hidden) return;

      const { tv: t, moodName: mood, combo, W, sw, crowdX } = live.current;
      const time = nowMs / 1000;
      const hour = localHour();
      const sky = skyAt(hour);
      const night = sky.night;
      const par = (parallax.current.cur += (parallax.current.target - parallax.current.cur) * 0.05);
      const lights: (() => void)[] = [];
      const dark = (col: string, k = 0.45) => mix(col, '#2a2640', night * k);
      const typing = Date.now() - useGame.getState().lastKeyAt < 1500;
      const ratings = liveFx.ratings;
      const noSignal = liveFx.deadAir || ratings < 0.2;
      const flashing = nowMs < flash.current;
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

      // searchlights sweeping the night sky
      if (t.searchlights && night > 0.3) {
        for (const [bx, sp] of [[W * 0.62, 0.5], [W * 0.9, -0.37]] as const) {
          const ang = -Math.PI / 2 + Math.sin(time * sp) * 0.6;
          ctx.globalAlpha = 0.16 * night;
          for (let d = 0; d < 70; d += 1) {
            const w = 1 + d * 0.08;
            rect(ctx, bx + Math.cos(ang) * d - w / 2, GROUND - 4 + Math.sin(ang) * d, w, 1, '#fff6c8');
          }
          ctx.globalAlpha = 1;
        }
      }

      // news helicopter
      if (t.heli) {
        const hx = ((time * 9) % (W + 60)) - 30;
        const hy = 12 + Math.sin(time * 1.3) * 2;
        const body = dark('#e8e4d8', 0.4);
        rect(ctx, hx, hy, 9, 4, body);
        rect(ctx, hx - 8, hy + 1, 8, 1, body);
        rect(ctx, hx - 9, hy - 1, 1, 3, body);
        rect(ctx, hx + 6, hy + 1, 3, 2, '#8fd6ff');
        rect(ctx, hx + 2, hy + 1, 3, 1, '#ff5d73');
        rect(ctx, hx + 1, hy + 5, 8, 1, dark('#5a5a6a', 0.4));
        const blade = Math.floor(time * 20) % 2 ? 12 : 6;
        rect(ctx, hx + 4.5 - blade / 2, hy - 2, blade, 1, dark('#3a3a46', 0.4));
        rect(ctx, hx + 4, hy - 1, 1, 1, dark('#3a3a46', 0.4));
        if (Math.floor(time * 2) % 2) lights.push(() => rect(ctx, hx - 9, hy - 2, 1, 1, '#ff3344'));
      }

      // ---------- far: glass towers, drive-in, suburb ----------
      const fp = -par;
      if (t.skyline) {
        const rs = seeded(91);
        for (let i = 0; i < 6; i++) {
          const x = Math.round(sw + 14 + i * ((W - sw - 20) / 6) + fp);
          const h = 24 + Math.floor(rs() * 16);
          const col = dark('#6f8fb0', 0.6);
          rect(ctx, x, GROUND - h, 10, h, col);
          rect(ctx, x + 1, GROUND - h, 1, h, dark('#9fc0de', 0.6));
          for (let y = GROUND - h + 3; y < GROUND - 4; y += 3) {
            if (night > 0.3 && rs() < 0.55) lights.push(() => rect(ctx, x + 3, y, 5, 1, '#ffe7a0'));
          }
        }
      }
      const tree = dark('#4e7d3a', 0.6);
      for (let x = Math.round(sw); x < W; x += 5) {
        const h = 4 + ((x * 7) % 4);
        rect(ctx, x + fp * 0.5, GROUND - h, 5, h, tree);
      }

      if (t.driveIn) {
        const dx = Math.round(W * 0.8 + fp * 1.2);
        rect(ctx, dx + 2, GROUND - 12, 1, 12, dark('#4a4a52'));
        rect(ctx, dx + 21, GROUND - 12, 1, 12, dark('#4a4a52'));
        rect(ctx, dx, GROUND - 28, 24, 16, dark('#d8d8e0', 0.3));
        const scr = () => {
          rect(ctx, dx + 1, GROUND - 27, 22, 14, noSignal ? '#9a9aaa' : t.color ? '#6fb6e8' : '#c8ced4');
          if (!noSignal) {
            rect(ctx, dx + 9, GROUND - 25, 6, 2, '#3a2418');
            rect(ctx, dx + 9, GROUND - 23, 6, 5, t.color ? '#f2c29b' : '#e0e0e0');
            rect(ctx, dx + 7, GROUND - 18, 10, 5, t.color ? '#1f2a44' : '#4a4a52');
            if (typing && Math.floor(time * 8) % 2) rect(ctx, dx + 11, GROUND - 20, 2, 1, '#7a2f3f');
          } else for (let i = 0; i < 30; i++) rect(ctx, dx + 1 + Math.random() * 21, GROUND - 27 + Math.random() * 13, 1, 1, '#ffffff');
        };
        if (night > 0.3) lights.push(scr);
        else scr();
      }

      // ranch houses — everyone is watching you
      const hs = seeded(63);
      for (let i = 0; i < 5; i++) {
        const x = Math.round(sw + 10 + i * 19 + hs() * 5 + fp * 1.5);
        if (x > W - 30) break;
        const y = GROUND - 8;
        rect(ctx, x, y, 15, 8, dark(['#f2c4c4', '#c4e4f2', '#f2ecc4', '#c8f2c4'][i % 4], 0.55));
        rect(ctx, x - 1, y - 2, 17, 2, dark('#7a5a4a', 0.55));
        rect(ctx, x + 10, y + 3, 3, 5, dark('#6b4226', 0.55));
        const win = () => {
          const tvGlow = night > 0.3 || typing;
          rect(ctx, x + 2, y + 2, 5, 3, tvGlow ? (Math.floor(time * 3 + i) % 3 === 0 ? '#bfe6ff' : '#8fd6ff') : dark('#8fb6d0', 0.6));
        };
        if (night > 0.3) lights.push(win);
        else win();
        if (t.antennas) {
          rect(ctx, x + 4, y - 7, 1, 5, dark('#2a2433', 0.4));
          rect(ctx, x + 2, y - 7, 5, 1, dark('#2a2433', 0.4));
          rect(ctx, x + 2, y - 5, 5, 1, dark('#2a2433', 0.4));
        }
      }

      // ---------- satellite uplink construction (the next goal) ----------
      const mp = -par * 2;
      if (ERAS[useGame.getState().era].evolveCost != null) {
        const cx0 = W - 24 + mp;
        rect(ctx, cx0 - 2, GROUND - 1, 24, 2, dark('#7a6a5a'));
        if (t.build === 0) {
          rect(ctx, cx0 + 9, GROUND - 13, 1, 12, dark('#6b4226'));
          rect(ctx, cx0 + 3, GROUND - 17, 14, 6, dark('#f4efe0', 0.4));
        }
        if (t.build >= 1) rect(ctx, cx0 + 2, GROUND - 4, 16, 3, dark('#9a948a'));
        if (t.build >= 2) rect(ctx, cx0 + 9, GROUND - 12, 3, 8, dark('#8a90a8'));
        if (t.build >= 3) {
          // the dish
          const dish = dark('#e8e8f0');
          rect(ctx, cx0 + 2, GROUND - 22, 16, 2, dish);
          rect(ctx, cx0 + 3, GROUND - 20, 14, 2, dish);
          rect(ctx, cx0 + 5, GROUND - 18, 10, 2, dish);
          rect(ctx, cx0 + 7, GROUND - 16, 6, 4, dark('#c9c9d9'));
        }
        if (t.build >= 4) {
          rect(ctx, cx0 + 9, GROUND - 30, 2, 8, dark('#5a5a6a'));
          rect(ctx, cx0 + 8, GROUND - 31, 4, 2, dark('#c9c9d9'));
        }
        if (t.build >= 5) {
          lights.push(() => {
            const on = Math.floor(time * 2) % 2 === 0;
            rect(ctx, cx0 + 9, GROUND - 32, 2, 1, on ? '#4bd3ff' : '#2a6a8a');
            if (on) glow(ctx, cx0 + 10, GROUND - 32, 12, 0.3, '#4bd3ff');
            const k = (time * 30) % 30;
            ctx.globalAlpha = 1 - k / 30;
            rect(ctx, cx0 + 10 - k * 0.3, GROUND - 34 - k, 1 + k * 0.6, 1, '#4bd3ff');
            ctx.globalAlpha = 1;
          });
        }
      }

      // ---------- the studio (cut open) ----------
      const sx = 2 + mp;
      const top = 10;
      const wallOut = dark('#d9d2c3');
      rect(ctx, sx, top, sw, GROUND - top, wallOut);
      rect(ctx, sx, top, sw, 1, dark('#b8b0a0'));
      rect(ctx, sx + sw - 18, top - 8, 1, 8, dark('#5a5a6a'));
      rect(ctx, sx + sw - 20, top - 8, 5, 1, dark('#5a5a6a'));
      if (t.satellite) {
        const dish = dark('#e8e8f0');
        rect(ctx, sx + 10, top - 6, 10, 1, dish);
        rect(ctx, sx + 11, top - 5, 8, 2, dish);
        rect(ctx, sx + 13, top - 3, 4, 3, dark('#c9c9d9'));
        rect(ctx, sx + 15, top - 9, 1, 3, dark('#5a5a6a'));
      }
      rect(ctx, sx + 4, top + 1, sw - 8, 7, '#1a1020'); // sign band (text overlay)
      if (t.allNight && night > 0.3) lights.push(() => rect(ctx, sx + sw - 9, top + 3, 4, 3, '#ff5d73'));

      const iy = top + 10;
      const ih = GROUND - 2 - iy;
      const floorY = iy + ih - 3;
      const litRoom = night > 0.3 || typing;
      const drawInterior = () => {
        rect(ctx, sx + 3, iy, sw - 6, ih, '#1d2340');
        rect(ctx, sx + 3, floorY, sw - 6, 3, '#14182c');
        for (let x = sx + 4; x < sx + sw - 4; x += 4) rect(ctx, x, floorY, 2, 1, '#232a4a');

        // ceiling lights
        const n = 4;
        for (let i = 0; i < n; i++) {
          const lx = sx + 10 + i * ((sw - 20) / (n - 1));
          rect(ctx, lx - 1, iy, 3, 2, '#5a5a6a');
          if (typing) {
            ctx.globalAlpha = 0.08;
            for (let d = 0; d < 14; d++) rect(ctx, lx - d * 0.4, iy + 2 + d, 1 + d * 0.8, 1, '#fff6c8');
            ctx.globalAlpha = 1;
          }
        }

        // the backdrop behind the desk
        const bx = sx + 20;
        rect(ctx, bx, iy + 4, 28, 14, '#2c3e70');
        for (let i = 0; i < 7; i++) rect(ctx, bx + 1 + i * 4, iy + 18 - 3 - ((i * 5) % 7), 3, 3 + ((i * 5) % 7), '#3d5490');
        rect(ctx, bx, iy + 17, 28, 1, t.color ? '#ff5d73' : '#8a8a9a');
        if (t.famous) {
          rect(ctx, bx + 13, iy + 6, 2, 4, '#ffd84d');
          rect(ctx, bx + 12, iy + 7, 4, 2, '#ffd84d');
        }
        if (t.prime) {
          // wall clock at 8 o'clock
          rect(ctx, bx + 23, iy + 5, 4, 4, '#e8e4d8');
          rect(ctx, bx + 25, iy + 6, 1, 2, '#1a1020');
          rect(ctx, bx + 24, iy + 7, 1, 1, '#1a1020');
        }

        // weather wall + forecaster
        const wx = sx + 5;
        rect(ctx, wx, iy + 5, 13, 11, t.radar ? '#1f5a3a' : '#3a6aa8');
        rect(ctx, wx + 2, iy + 8, 5, 3, '#5f9446');
        rect(ctx, wx + 7, iy + 10, 4, 4, '#5f9446');
        rect(ctx, wx + 3, iy + 6, 2, 2, '#ffd84d');
        rect(ctx, wx + 8, iy + 6, 4, 2, '#f4f4f4');
        if (t.radar) {
          const a = time * 3;
          for (let d = 0; d < 5; d++) rect(ctx, wx + 6 + Math.cos(a) * d, iy + 10 + Math.sin(a) * d * 0.8, 1, 1, '#5dff9b');
        }
        if (t.forecaster) {
          const point = Math.sin(time * 0.8) > 0.3;
          drawSprite(ctx, personSprite({ skin: 2, hair: 3, shirt: 4, pants: 1, hat: null }, point ? 'cheer' : 'stand', false), wx + 6, floorY - 16 + 2);
        }

        // you at the anchor desk
        const you = characterSprite('anchor', mood);
        const img = sprite(`anchor-${mood}`, you.rows, you.palette);
        const bob = typing ? Math.floor(time * 8) % 2 : 0;
        drawSprite(ctx, img, sx + 26, floorY - 19 - bob);
        const desk = '#c9c4b8';
        rect(ctx, sx + 22, floorY - 8, 26, 1, '#e8e4d8');
        rect(ctx, sx + 22, floorY - 7, 26, 7, desk);
        if (t.color) ['#ff5d73', '#ffd84d', '#5dff9b', '#5aa9ff'].forEach((c, i) => rect(ctx, sx + 24 + i * 6, floorY - 4, 5, 1, c));
        else rect(ctx, sx + 24, floorY - 4, 22, 1, '#8a8a9a');
        rect(ctx, sx + 25, floorY - 9, 4, 1, '#f4f4f4'); // papers
        rect(ctx, sx + 40, floorY - 11, 1, 3, '#5a5a6a'); // desk mic
        rect(ctx, sx + 39, floorY - 12, 3, 2, '#c9c9d9');

        // makeup artist pops in between stories
        if (t.makeup && !typing) {
          drawSprite(ctx, personSprite({ skin: 0, hair: 2, shirt: 6, pants: 1, hat: null }, 'stand', false), sx + 44, floorY - 16 + 2, true);
          if (Math.floor(time * 4) % 2) rect(ctx, sx + 42, floorY - 13, 2, 2, '#f7b6d2');
        }

        // camera (+ operator, + teleprompter)
        const cx = sx + Math.round(sw * 0.62);
        rect(ctx, cx + 3, floorY - 9, 1, 9, '#5a5a6a');
        rect(ctx, cx, floorY - 1, 7, 1, '#5a5a6a');
        rect(ctx, cx, floorY - 15, 9, 6, t.color ? '#3a3f5a' : '#3a3a46');
        rect(ctx, cx - 3, floorY - 14, 3, 4, '#111');
        if (t.prompter) rect(ctx, cx - 4, floorY - 17, 4, 3, '#8fd6ff');
        rect(ctx, cx + 7, floorY - 16, 2, 1, typing ? '#ff3344' : '#5a1a22');
        if (t.cameras > 0) drawSprite(ctx, personSprite({ skin: 1, hair: 4, shirt: 7, pants: 0, hat: 2 }, 'stand', true), cx + 8, floorY - 16 + 2, false);
        if (t.hidden && Math.floor(time * 1.5) % 2) rect(ctx, sx + sw - 6, iy + 2, 1, 1, '#ff3344');

        // producer with headset + clipboard
        if (t.producer) {
          const px = sx + sw - 13;
          drawSprite(ctx, personSprite({ skin: 3, hair: 0, shirt: 2, pants: 0, hat: null }, combo >= 10 ? 'cheer' : 'stand', false), px, floorY - 16 + 2, true);
          rect(ctx, px + 1, floorY - 15, 1, 2, '#1a1020');
          rect(ctx, px - 1, floorY - 9, 2, 3, '#f4f4f4');
        }

        // camera flash on big moments
        if (flashing) {
          ctx.globalAlpha = 0.15;
          rect(ctx, sx + 3, iy, sw - 6, ih, '#ffffff');
          ctx.globalAlpha = 1;
        }
      };
      if (litRoom) lights.push(drawInterior);
      else drawInterior();

      // ---------- diner ----------
      if (t.diner) {
        const dx = Math.round(sw + 8 + mp);
        rect(ctx, dx, GROUND - 11, 22, 11, dark('#e8e4d8'));
        rect(ctx, dx, GROUND - 13, 22, 2, dark('#d6334a'));
        rect(ctx, dx, GROUND - 5, 22, 1, dark('#d6334a'));
        for (let i = 0; i < 4; i++) rect(ctx, dx + 2 + i * 5, GROUND - 10, 4, 4, dark('#8fd6ff', 0.6));
        lights.push(() => {
          if (night > 0.3) rect(ctx, dx + 4, GROUND - 16, 14, 2, Math.floor(time * 1.2) % 4 ? '#ff5dc8' : '#7a2a5a');
          rect(ctx, dx + 17, GROUND - 10, 3, 3, Math.floor(time * 3) % 2 ? '#bfe6ff' : '#8fd6ff');
        });
      }

      // ---------- ground: road + lawn ----------
      rect(ctx, 0, GROUND, W, 4, dark('#4a4a52', 0.5));
      for (let x = 2; x < W; x += 8) rect(ctx, x, GROUND + 2, 4, 1, dark('#e8e4b0', 0.5));
      rect(ctx, 0, GROUND + 4, W, H - GROUND - 4, dark('#62a04a', 0.55));
      const gr = seeded(23);
      for (let i = 0; i < W; i++) rect(ctx, gr() * W, GROUND + 5 + gr() * (H - GROUND - 5), 1, 1, dark('#4e8a3a', 0.55));

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

      // a shiny car with fins
      if (t.car) {
        const period = 20;
        const tt = time % period;
        const vx = W + 30 - tt * 18;
        if (vx > -30) {
          drawables.push({
            y: GROUND + 2,
            draw: () => {
              const y0 = GROUND + 3;
              rect(ctx, vx, y0 - 6, 20, 4, '#5ec8c8');
              rect(ctx, vx + 5, y0 - 9, 9, 3, '#5ec8c8');
              rect(ctx, vx + 6, y0 - 8, 3, 2, '#bfe6ff');
              rect(ctx, vx + 10, y0 - 8, 3, 2, '#bfe6ff');
              rect(ctx, vx + 18, y0 - 8, 2, 2, '#5ec8c8'); // fin
              rect(ctx, vx, y0 - 4, 20, 1, '#e8e8f0');
              rect(ctx, vx + 3, y0 - 2, 3, 2, '#1a1020');
              rect(ctx, vx + 14, y0 - 2, 3, 2, '#1a1020');
            },
          });
        }
      }

      // the TV wall everyone is watching
      drawables.push({
        y: CROWD_CY - 4,
        draw: () => {
          const x0 = crowdX - 10 + fp3;
          const y0 = CROWD_CY - 34; // above the heads of the front row
          rect(ctx, x0 - 1, y0 + 18, 22, 2, '#5a3a20');
          rect(ctx, x0 + 1, y0 + 20, 1, 12, '#5a3a20');
          rect(ctx, x0 + 18, y0 + 20, 1, 12, '#5a3a20');
          for (let r = 0; r < 2; r++)
            for (let c = 0; c < 2; c++) {
              const x = x0 + c * 11;
              const y = y0 + r * 9;
              rect(ctx, x, y, 10, 9, '#7a4a2a');
              rect(ctx, x + 1, y + 1, 8, 6, '#1a1020');
              if (r === 0) {
                rect(ctx, x + 3, y - 2, 1, 2, '#2a2433');
                rect(ctx, x + 6, y - 2, 1, 2, '#2a2433');
              }
              if (noSignal) {
                for (let i = 0; i < 12; i++) rect(ctx, x + 1 + Math.random() * 7, y + 1 + Math.random() * 5, 1, 1, Math.random() < 0.5 ? '#ffffff' : '#8a8a9a');
              } else {
                rect(ctx, x + 1, y + 1, 8, 6, t.color ? ['#6fb6e8', '#8fd6ff', '#7ec8a8', '#b8a8e8'][r * 2 + c] : '#b8c0c8');
                rect(ctx, x + 4, y + 2, 2, 1, '#3a2418');
                rect(ctx, x + 4, y + 3, 2, 2, t.color ? '#f2c29b' : '#e0e0e0');
                rect(ctx, x + 3, y + 5, 4, 2, t.color ? '#1f2a44' : '#4a4a52');
                if (typing && (Math.floor(time * 8) + c) % 2) rect(ctx, x + 4, y + 4, 2, 1, '#7a2f3f');
              }
              rect(ctx, x + 8, y + 7, 1, 1, typing ? '#ff3344' : '#5a1a22');
            }
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
  const next = ERAS[s.era + 1];
  const goalCost = era.evolveCost;
  const shout = s.shout;
  const shoutTail = shout.length > 40 ? '…' + shout.slice(-40) : shout;
  const visiting = s.boost && Date.now() < s.boost.until ? s.boost : null;
  const onAir = Date.now() - s.lastKeyAt < 1500;

  return (
    <div ref={wrapRef} className="town tv-scene" style={{ height: H * scale }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />

      <div className="station-sign tv" style={{ left: 6 * scale, top: 11 * scale, width: (sw - 8) * scale, height: 7 * scale }}>
        SHOUT TV
      </div>
      <div className={`onair-light live ${onAir ? 'on' : ''}`} style={{ left: (sw - 22) * scale, top: 21 * scale }}>● LIVE</div>

      {goalCost != null && (
        <div className={`goal ${s.cash >= goalCost ? 'ready' : ''}`}>
          <span className="goal-text">
            🎯 <b>Goal:</b> save {money(goalCost)} to launch <b>Global News</b> 🛰️ {!next?.playable && <small>(coming soon)</small>}
          </span>
          <span className="goal-bar"><span style={{ width: `${tv.buildPct * 100}%` }} /></span>
        </div>
      )}
      {goalCost != null && (
        <div className={`site-label ${tv.build >= 5 ? 'ready' : ''}`} style={{ left: (W - 27) * scale, top: (GROUND + 1) * scale, width: 26 * scale }}>
          {tv.build >= 5 ? (next?.playable ? '📡 Ready!' : '📡 Soon!') : `🏗️ ${Math.floor(tv.buildPct * 100)}%`}
        </div>
      )}

      <div className={`shout ${shout ? '' : 'empty'}`} style={{ left: (sw + 6) * scale, top: 29 * scale, bottom: 'auto' }}>
        <span className="shout-prefix">📺 LIVE:</span>
        {shout ? <span className="shout-text">{shoutTail}</span> : <span className="shout-text dim">type to go live…</span>}
      </div>

      {liveFx.deadAir && (
        <div className="dead-air" style={{ left: (crowdX - 16) * scale, top: (CROWD_CY - 43) * scale }}>📴 NO SIGNAL</div>
      )}

      <div className={`crowd-reaction town-reaction mood-${moodName}`} style={{ left: `${(crowdX / W) * 100}%` }}>
        {reactionText(moodName, 'viewers')}
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
