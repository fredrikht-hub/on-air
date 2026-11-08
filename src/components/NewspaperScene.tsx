import { useEffect, useMemo, useRef } from 'react';
import { toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { money } from '../game/format';
import { confetti } from '../game/fx';
import { useGame } from '../game/state';
import { CITY_ANNOUNCE, cityFrom } from '../scene/city';
import {
  SCENE_H as H, buildCrowd, drawClouds, drawMember, drawStarsMoon, drawSun, glow, reactionText, shadeLayer, stepParticles,
  useCoins, useCrowdReactions, useParallax, useSceneDims, type Member, type Particle,
} from '../scene/common';
import { drawSprite, localHour, mix, personSprite, rect, seeded, skyAt, sprite } from '../scene/draw';
import { characterSprite, moodFromValue } from './pixel';

const GROUND = 52; // sidewalk line
const CROWD_CY = 66;

export function NewspaperScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = useSceneDims(wrapRef);
  const parallax = useParallax();
  const coins = useCoins(70, 18);

  const s = useGame();
  const city = useMemo(() => cityFrom(s), [s.lifetimeCash, s.cash, s.staff, s.upgrades, s.era]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodName = moodFromValue(s.mood);
  const { W, scale } = dims;
  const cx = Math.round(W * 0.42);
  const hx = cx - 34; // HQ left edge
  const hw = 68;

  const live = useRef({ city, moodName, combo: s.combo, cx, W });
  live.current = { city, moodName, combo: s.combo, cx, W };

  const crowd = useRef<Member[]>([]);
  useEffect(() => {
    crowd.current = buildCrowd(city.crowd, cx, CROWD_CY, Math.min(82, W * 0.42), 6, 777);
  }, [city.crowd, W, cx]);

  const particles = useRef<Particle[]>([]);
  const pressBoost = useRef(0);
  const flashUntil = useRef(0);
  const paperLines = useRef(0);
  useCrowdReactions(crowd, particles, {
    throwPapers: true,
    onWord: (now) => {
      pressBoost.current = now + 900;
      paperLines.current = (paperLines.current + 1) % 4;
      const { cx: c } = live.current;
      particles.current.push({ x: c + 57, y: 40, vx: 14 + Math.random() * 10, vy: -24 - Math.random() * 10, life: 0, max: 1.4, kind: 'paper', color: 0 });
    },
    onBig: (now) => {
      pressBoost.current = now + 1500;
      flashUntil.current = now + 180;
    },
  });

  // growth announcements
  const firstRun = useRef(true);
  useEffect(() => {
    const st = useGame.getState();
    const newly = CITY_ANNOUNCE.filter((a) => a.check(city) && !st.townSeen.includes(a.id));
    if (newly.length) {
      st.patch({ townSeen: [...st.townSeen, ...newly.map((a) => a.id)] });
      if (!firstRun.current) {
        const a = newly[newly.length - 1];
        toast({ emoji: a.emoji, title: 'Printing Row is growing!', lines: [a.text], big: true });
        confetti(0.4);
      }
    }
    firstRun.current = false;
  }, [city]);

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
    let smokeTimer = 0;
    let pressAngle = 0;

    const frame = (nowMs: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      acc += dt;
      if (acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      if (document.hidden) return;

      const { city: c, moodName: mood, combo, cx, W } = live.current;
      const hx = cx - 34;
      const hw = 68;
      const time = nowMs / 1000;
      const hour = localHour();
      const sky = skyAt(hour);
      const night = sky.night;
      const par = (parallax.current.cur += (parallax.current.target - parallax.current.cur) * 0.05);
      const lights: (() => void)[] = [];
      const fgLights: (() => void)[] = [];
      const dark = (col: string, k = 0.45) => mix(col, '#2a2640', night * k);
      let ctx = main;

      // ---------- sky ----------
      const g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, sky.top);
      g.addColorStop(1, mix(sky.bottom, '#c9b8a0', 0.25));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      drawStarsMoon(ctx, W, time, night, sky.top);
      drawSun(ctx, W, hour);
      drawClouds(ctx, W, time, night, par, '#f0ece4');

      // hot-air balloon advertising your paper
      if (c.balloon) {
        const bx = ((time * 2) % (W + 40)) - 20;
        const by = 8 + Math.sin(time * 0.8) * 2;
        rect(ctx, bx, by, 8, 7, dark('#d6334a', 0.3));
        rect(ctx, bx + 1, by - 1, 6, 1, dark('#d6334a', 0.3));
        rect(ctx, bx + 3, by, 2, 7, dark('#ffd84d', 0.3));
        rect(ctx, bx + 2, by + 9, 4, 3, dark('#8a5a30', 0.3));
        rect(ctx, bx - 14, by + 3, 12, 4, dark('#f4efe0', 0.3));
        rect(ctx, bx - 13, by + 4, 10, 1, '#1a1020');
        rect(ctx, bx - 2, by + 5, 2, 1, '#6b4226');
      }

      // ---------- far skyline ----------
      const fp = -par;
      const rs = seeded(314);
      let x = -4;
      while (x < W + 4) {
        const w = 10 + Math.floor(rs() * 9);
        const h = 14 + Math.floor(rs() * 14) + (c.tall && rs() < 0.4 ? 14 : 0);
        const col = dark(rs() < 0.5 ? '#8a6a5a' : '#7a7480', 0.55);
        rect(ctx, x + fp, GROUND - h, w, h, col);
        for (let wy = GROUND - h + 3; wy < GROUND - 3; wy += 4) {
          for (let wx = x + 2; wx < x + w - 2; wx += 3) {
            const on = night > 0.3 && rs() < 0.45;
            const px = wx + fp;
            if (on) lights.push(() => rect(ctx, px, wy, 1, 2, '#ffd36e'));
            else rect(ctx, px, wy, 1, 2, dark('#5a5060', 0.6));
          }
        }
        x += w + 1;
      }
      // clock tower with the real time on its face
      if (c.clocktower) {
        const tx = Math.round(W * 0.16) + fp;
        const stone = dark('#a49a8e', 0.55);
        rect(ctx, tx, 4, 11, GROUND - 4, stone);
        rect(ctx, tx - 1, 2, 13, 3, dark('#5a4a5a', 0.5));
        rect(ctx, tx + 3, 0, 5, 2, dark('#5a4a5a', 0.5));
        rect(ctx, tx + 2, 7, 7, 7, '#f4f1de');
        const d = new Date();
        const ha = ((d.getHours() % 12) / 12) * Math.PI * 2;
        const ma = (d.getMinutes() / 60) * Math.PI * 2;
        const ccx = tx + 5;
        const ccy = 10;
        rect(ctx, ccx + Math.round(Math.sin(ha) * 1.5), ccy - Math.round(Math.cos(ha) * 1.5), 1, 1, '#1a1020');
        rect(ctx, ccx + Math.round(Math.sin(ma) * 2.5), ccy - Math.round(Math.cos(ma) * 2.5), 1, 1, '#1a1020');
        rect(ctx, ccx, ccy, 1, 1, '#1a1020');
        if (night > 0.3) lights.push(() => glow(ctx, ccx + 0.5, ccy + 0.5, 9, 0.25 * night, '#fff3c4'));
      }
      // factory chimneys with smoke
      if (c.factory) {
        const fx = Math.round(W * 0.62) + fp;
        rect(ctx, fx, GROUND - 18, 22, 18, dark('#6a4a3a', 0.55));
        for (const ox of [3, 10, 17]) {
          rect(ctx, fx + ox, GROUND - 30, 3, 12, dark('#5a3a2a', 0.55));
          for (let k = 0; k < 5; k++) {
            const t = (time * 3 + k * 4 + ox) % 20;
            ctx.globalAlpha = 0.45 * (1 - t / 20);
            rect(ctx, fx + ox + Math.sin(t * 0.5) * 2, GROUND - 31 - t, 2 + (t > 10 ? 1 : 0), 2, dark('#c8c8c8', 0.7));
            ctx.globalAlpha = 1;
          }
        }
      }
      // tram wire
      if (c.tram) rect(ctx, 0, GROUND - 24, W, 1, dark('#3a3440', 0.4));

      // ---------- telegraph pole ----------
      const mp = -par * 2;
      if (c.telegraph) {
        const tx = hx - 8 + mp;
        rect(ctx, tx, GROUND - 38, 2, 38, dark('#6b4226'));
        rect(ctx, tx - 4, GROUND - 36, 10, 1, dark('#6b4226'));
        for (let wx = 0; wx < tx; wx += 1) {
          const sag = Math.round(Math.sin((wx / Math.max(1, tx)) * Math.PI) * 2);
          rect(ctx, wx, GROUND - 36 + sag, 1, 1, dark('#2a2433'));
        }
      }

      // ---------- the Daily Shout HQ ----------
      const top = 14;
      const bx = hx + mp;
      const brick = dark(c.colorInk ? '#a8473a' : '#9a5a44');
      rect(ctx, bx, top, hw, GROUND - top, brick);
      for (let y = top + 2; y < GROUND; y += 3) rect(ctx, bx, y, hw, 1, mix(brick, '#000000', 0.12));
      rect(ctx, bx - 2, top - 2, hw + 4, 3, dark('#5a3a2a'));
      // sign band (text is an HTML overlay)
      rect(ctx, bx + 4, top + 1, hw - 8, 7, '#1a1020');
      rect(ctx, bx + 3, top, hw - 6, 1, dark(c.colorInk ? '#ffd84d' : '#c9a227', 0.2));
      // upper windows: typesetters & copywriters at work
      for (let i = 0; i < 4; i++) {
        const wx = bx + 5 + i * 16;
        const wy = top + 10;
        rect(ctx, wx - 1, wy - 1, 10, 8, dark('#4a3028'));
        const occupied = i < 2 ? i < c.typesetters : i - 2 < c.copywriters;
        const lit = night > 0.3 && (occupied || c.nightPress || i === 0);
        if (lit) lights.push(() => rect(ctx, wx, wy, 8, 6, '#f2c27a'));
        else rect(ctx, wx, wy, 8, 6, dark('#8fb6d0', 0.9));
        if (occupied) {
          const bob = Math.floor(time * (i < 2 ? 3 : 1.5) + i) % 2;
          const draw = () => {
            rect(ctx, wx + 2, wy + 1 + bob, 4, 4, '#e0a77f');
            rect(ctx, wx + 2, wy + bob, 4, 1, i < 2 ? '#3fae6a' : '#2a1d14');
            rect(ctx, wx + 1, wy + 5, 6, 1, i < 2 ? '#6a6a6a' : '#f4efe0');
            if (i >= 2) rect(ctx, wx + 6, wy + 2 + bob, 1, 3, '#f4efe0');
          };
          if (lit) lights.push(draw);
          else draw();
        }
      }
      // headline banner (Bigger Headlines)
      if (c.banner) {
        rect(ctx, bx + 2, top + 17, hw - 4, 3, dark('#d6334a', 0.3));
        for (let i = 0; i < hw - 8; i += 3) rect(ctx, bx + 4 + i, top + 18, 2, 1, '#f4efe0');
      }
      // big front window — your office (lit warmly at night)
      const wx0 = bx + 4;
      const wy0 = top + 21;
      const ww = 34;
      const wh = GROUND - 2 - wy0;
      rect(ctx, wx0 - 1, wy0 - 1, ww + 2, wh + 2, dark('#3a2418'));
      const drawOffice = (lit: boolean) => {
        rect(ctx, wx0, wy0, ww, wh, lit ? '#e8bf7a' : dark('#8a6a50', 0.6));
        rect(ctx, wx0, wy0 + wh - 5, ww, 1, lit ? '#c99a5a' : dark('#6a4a38', 0.6));
        // lamp
        rect(ctx, wx0 + 26, wy0 + 1, 1, 3, '#2a2433');
        rect(ctx, wx0 + 24, wy0 + 4, 5, 2, '#3fae6a');
        if (lit) glow(ctx, wx0 + 26, wy0 + 8, 10, 0.25);
        // you
        const you = characterSprite('editor', mood);
        const img = sprite(`ed-${mood}`, you.rows, you.palette);
        const typing = Date.now() - useGame.getState().lastKeyAt < 600;
        const bob = typing ? Math.floor(time * 10) % 2 : 0;
        drawSprite(ctx, img, wx0 + 6, wy0 + wh - 16 - bob);
        // desk + typewriter + paper
        rect(ctx, wx0 + 2, wy0 + wh - 5, 24, 5, '#6b4226');
        rect(ctx, wx0 + 2, wy0 + wh - 5, 24, 1, '#8a5a30');
        rect(ctx, wx0 + 16, wy0 + wh - 8, 8, 3, '#2a2433');
        rect(ctx, wx0 + 17, wy0 + wh - 7, 6, 1, typing && Math.floor(time * 12) % 2 ? '#9a9ab0' : '#5a5a70');
        rect(ctx, wx0 + 18, wy0 + wh - 12, 4, 4, '#f4efe0');
        for (let i = 0; i < paperLines.current + 1; i++) rect(ctx, wx0 + 18, wy0 + wh - 11 + i, 3, 1 / 1, '#8a7a6a');
      };
      if (night > 0.3) lights.push(() => drawOffice(true));
      else drawOffice(false);
      // window frame bars
      rect(ctx, wx0 + 16, wy0, 1, 2, dark('#3a2418'));
      // door
      const dx = bx + 46;
      rect(ctx, dx, top + 26, 12, GROUND - top - 26, dark('#3a2418'));
      rect(ctx, dx + 1, top + 27, 10, GROUND - top - 27, dark('#6b4226'));
      rect(ctx, dx + 9, top + 36, 1, 1, '#c9a227');
      rect(ctx, dx - 2, GROUND - 1, 16, 1, dark('#8a7a6a'));

      // ---------- press room annex ----------
      const px0 = bx + hw + 1;
      const pw = 26;
      const ptop = 24;
      const pbrick = dark('#7a4a3a');
      for (let i = 0; i < 4; i++) rect(ctx, px0 + i, ptop - 3 + i, pw - i, 1, dark('#5a3a2a'));
      rect(ctx, px0, ptop, pw, GROUND - ptop, pbrick);
      rect(ctx, px0 + 18, ptop - 10, 4, 8, dark('#5a3a2a'));
      const pressSpeed = (nowMs < pressBoost.current ? 3 : 0.6) * (c.fastPress ? 2 : 1);
      pressAngle += step * pressSpeed * 4;
      const pwx = px0 + 3;
      const pwy = ptop + 5;
      const drawPress = (lit: boolean) => {
        rect(ctx, pwx, pwy, 20, 15, lit ? '#d8a868' : dark('#4a3a3a', 0.6));
        // drum
        rect(ctx, pwx + 3, pwy + 3, 8, 8, '#3a3a48');
        const a = pressAngle;
        rect(ctx, pwx + 7 + Math.round(Math.cos(a) * 3), pwy + 7 + Math.round(Math.sin(a) * 3), 1, 1, '#c9c9d9');
        rect(ctx, pwx + 7 - Math.round(Math.cos(a) * 3), pwy + 7 - Math.round(Math.sin(a) * 3), 1, 1, '#c9c9d9');
        // conveyor with papers
        rect(ctx, pwx + 10, pwy + 12, 10, 1, '#2a2433');
        for (let k = 0; k < 3; k++) {
          const off = (a * 2 + k * 3.3) % 10;
          rect(ctx, pwx + 10 + off, pwy + 10, 2, 2, '#f4efe0');
        }
      };
      if (night > 0.3 && c.nightPress) lights.push(() => drawPress(true));
      else drawPress(false);
      smokeTimer += step;
      if (smokeTimer > (c.fastPress ? 0.25 : 0.55)) {
        smokeTimer = 0;
        particles.current.push({ x: px0 + 19, y: ptop - 11, vx: 1, vy: -4, life: 0, max: 2.5, kind: c.fastPress ? 'steam' : 'smoke', color: 0 });
      }

      // ---------- radio tower construction ----------
      const era = ERAS[useGame.getState().era];
      if (era.evolveCost != null) {
        const tx = W - 26 + mp;
        const steel = dark('#8a8f9a');
        rect(ctx, tx - 2, GROUND - 1, 24, 2, dark('#7a6a5a'));
        if (c.build === 0) {
          rect(ctx, tx + 9, GROUND - 13, 1, 12, dark('#6b4226'));
          rect(ctx, tx + 3, GROUND - 17, 14, 6, dark('#f4efe0', 0.4));
          rect(ctx, tx + 5, GROUND - 15, 10, 1, '#7a6a5a');
        }
        if (c.build >= 1) {
          rect(ctx, tx + 2, GROUND - 4, 16, 3, dark('#9a948a'));
          rect(ctx, tx - 1, GROUND - 5, 4, 4, dark('#a0703a'));
        }
        const heights = [0, 0, 16, 30, 42, 42];
        const th = heights[c.build];
        for (let y = 0; y < th; y++) {
          const k = y / 46;
          const half = Math.round(8 - k * 6);
          const yy = GROUND - 4 - y;
          rect(ctx, tx + 10 - half, yy, 1, 1, steel);
          rect(ctx, tx + 10 + half, yy, 1, 1, steel);
          if (y % 5 === 0) rect(ctx, tx + 10 - half, yy, half * 2 + 1, 1, steel);
          if (y % 5 === 2) rect(ctx, tx + 10 - half + ((y * 2) % (half * 2 + 1)), yy, 1, 1, steel);
        }
        if (c.build >= 4) rect(ctx, tx + 10, GROUND - 4 - th - 6, 1, 6, steel);
        if (c.build >= 5) {
          const on = Math.floor(time * 1.5) % 2 === 0;
          lights.push(() => {
            rect(ctx, tx + 9, GROUND - 4 - th - 8, 3, 2, on ? '#ff3344' : '#6a1a22');
            if (on) glow(ctx, tx + 10.5, GROUND - 4 - th - 7, 9, 0.35, '#ff3344');
          });
        }
      }

      // ---------- street ----------
      rect(ctx, 0, GROUND, W, 4, dark('#a89c8a', 0.5));
      rect(ctx, 0, GROUND + 4, W, H - GROUND - 4, dark('#6e665c', 0.5));
      rect(ctx, 0, GROUND + 4, W, 1, dark('#4e4840', 0.5));
      const rc = seeded(42);
      for (let i = 0; i < W * 1.2; i++) rect(ctx, rc() * W, GROUND + 6 + rc() * (H - GROUND - 6), 2, 1, dark('#5e574e', 0.5));

      // newsstand kiosk
      if (c.newsstand) {
        const kx = 4 + mp;
        rect(ctx, kx, GROUND - 14, 20, 15, dark('#2f6b4a'));
        for (let i = 0; i < 10; i++) rect(ctx, kx - 1 + i * 2, GROUND - 17, 2, 3, i % 2 ? dark('#f4efe0') : dark('#2f6b4a'));
        rect(ctx, kx + 3, GROUND - 10, 14, 6, dark('#1f4a32'));
        for (let i = 0; i < 4; i++) rect(ctx, kx + 4 + i * 3, GROUND - 9, 2, 3, dark('#f4efe0'));
        rect(ctx, kx + 8, GROUND - 13, 3, 3, '#e0a77f');
      }
      // gas lamps
      if (c.gaslamps) {
        for (const lx of [hx - 14, cx + 66, W * 0.86]) {
          const x2 = Math.round(lx + mp);
          rect(ctx, x2, GROUND - 14, 1, 14, dark('#2a2433'));
          rect(ctx, x2 - 1, GROUND - 17, 3, 3, dark('#2a2433'));
          lights.push(() => {
            rect(ctx, x2, GROUND - 16, 1, 1, night > 0.3 ? '#ffe9a0' : '#8a8a7a');
            if (night > 0.3) glow(ctx, x2 + 0.5, GROUND - 15, 11, 0.2 * night);
          });
        }
      }
      // fan mail
      if (c.mailbox) {
        const mx = hx - 6 + mp;
        rect(ctx, mx, GROUND - 7, 5, 7, dark('#c0392b'));
        rect(ctx, mx, GROUND - 8, 5, 1, dark('#8a2a20'));
        rect(ctx, mx + 1, GROUND - 10, 2, 2, '#f4efe0');
        rect(ctx, mx + 3, GROUND - 9, 2, 1, '#ffd0d6');
      }

      // background lighting pass
      if (night > 0.02) {
        ctx.globalAlpha = night * 0.45;
        rect(ctx, 0, 0, W, H, '#0a0e28');
        ctx.globalAlpha = 1;
      }
      lights.forEach((f) => f());

      // ---------- foreground: people & traffic ----------
      fg.clearRect(0, 0, W, H);
      ctx = fg;
      const fp3 = -par * 3;
      const drawables: { y: number; draw: () => void }[] = [];

      // horse carriage / tram passing by
      if (c.carriage || c.tram) {
        const useTram = c.tram && Math.floor(time / 30) % 2 === 1;
        const period = 30;
        const t = time % period;
        const speed = useTram ? 18 : 11;
        const vx = W + 40 - t * speed;
        if (vx > -40) {
          drawables.push({
            y: GROUND + 3,
            draw: () => {
              const y0 = GROUND + 3;
              if (useTram) {
                rect(ctx, vx, y0 - 13, 30, 11, '#2f6b4a');
                rect(ctx, vx, y0 - 13, 30, 2, '#c9a227');
                for (let i = 0; i < 5; i++) rect(ctx, vx + 2 + i * 6, y0 - 10, 4, 4, '#f2c27a');
                rect(ctx, vx + 14, y0 - 24, 1, 11, '#2a2433');
                rect(ctx, vx + 3, y0 - 2, 3, 2, '#1a1020');
                rect(ctx, vx + 24, y0 - 2, 3, 2, '#1a1020');
              } else {
                const leg = Math.floor(time * 6) % 2;
                rect(ctx, vx, y0 - 8, 8, 4, '#7a4a2a');
                rect(ctx, vx - 3, y0 - 11, 4, 4, '#7a4a2a');
                rect(ctx, vx + 1 + leg, y0 - 4, 1, 4, '#5a3a20');
                rect(ctx, vx + 6 - leg, y0 - 4, 1, 4, '#5a3a20');
                rect(ctx, vx + 10, y0 - 12, 12, 9, '#2a2433');
                rect(ctx, vx + 12, y0 - 10, 4, 3, '#8fb6d0');
                rect(ctx, vx + 11, y0 - 3, 4, 3, '#4a3020');
                rect(ctx, vx + 18, y0 - 3, 4, 3, '#4a3020');
              }
            },
          });
        }
      }

      // paperboys (on bicycles after the upgrade)
      for (let i = 0; i < c.paperboys; i++) {
        const span = W - 40;
        const speed = (c.bikes ? 26 : 14) + i * 3;
        const pos = (time * speed + i * 53) % (span * 2);
        const right = pos < span;
        const bxp = 4 + (right ? pos : span * 2 - pos);
        const y = GROUND + 6 + (i % 2);
        drawables.push({
          y,
          draw: () => {
            const hop = c.bikes ? 0 : Math.floor(time * 8 + i) % 2;
            const boy = personSprite({ skin: i % 4, hair: 1, shirt: 7, pants: 0, hat: 3 }, 'stand', true);
            const lift = c.bikes ? 4 : 0;
            drawSprite(ctx, boy, bxp + fp3, y - 16 - hop - lift, !right);
            rect(ctx, bxp + fp3 + (right ? 7 : -1), y - 9 - lift, 3, 3, '#f4efe0');
            if (c.bikes) {
              for (const ox of [-1, 7]) {
                rect(ctx, bxp + fp3 + ox, y - 4, 4, 1, '#1a1020');
                rect(ctx, bxp + fp3 + ox, y - 1, 4, 1, '#1a1020');
                rect(ctx, bxp + fp3 + ox, y - 3, 1, 2, '#1a1020');
                rect(ctx, bxp + fp3 + ox + 3, y - 3, 1, 2, '#1a1020');
              }
              rect(ctx, bxp + fp3 + 1, y - 4, 8, 1, '#c0392b');
            }
          },
        });
      }
      // reporters walking with notebooks
      for (let i = 0; i < c.reporters; i++) {
        const span = W - 50;
        const pos = (time * (5 + i) + i * 71) % (span * 2);
        const right = pos < span;
        const rx = 10 + (right ? pos : span * 2 - pos);
        const y = GROUND + 5;
        drawables.push({
          y,
          draw: () => {
            drawSprite(ctx, personSprite({ skin: (i + 1) % 4, hair: 0, shirt: 7, pants: 2, hat: 0 }, 'stand', true), rx + fp3, y - 16, !right);
            rect(ctx, rx + fp3 + (right ? 7 : 0), y - 8, 2, 3, '#f4efe0');
          },
        });
      }
      // the detective with an exclusive scoop
      if (c.detective) {
        const dxp = Math.round(W * 0.93);
        drawables.push({
          y: GROUND + 4,
          draw: () => {
            const peek = Math.sin(time * 0.7) > 0.5;
            drawSprite(ctx, personSprite({ skin: 0, hair: 0, shirt: 4, pants: 1, hat: 3 }, 'stand', true), dxp + fp3, GROUND + 4 - 16, !peek);
          },
        });
      }
      // photographer with flash
      if (c.photographer) {
        const phx = 30;
        drawables.push({
          y: GROUND + 7,
          draw: () => {
            drawSprite(ctx, personSprite({ skin: 2, hair: 4, shirt: 1, pants: 0, hat: 1 }, 'stand', true), phx + fp3, GROUND + 7 - 16);
            rect(ctx, phx + 9 + fp3, GROUND - 3, 4, 3, '#2a2433');
            rect(ctx, phx + 10 + fp3, GROUND, 1, 7, '#5a3a20');
            rect(ctx, phx + 12 + fp3, GROUND, 1, 7, '#5a3a20');
            if (nowMs < flashUntil.current) fgLights.push(() => glow(ctx, phx + 12 + fp3, GROUND - 3, 16, 0.8, '#ffffff'));
          },
        });
      }
      // readers
      const members = crowd.current;
      const showSigns = combo >= 10;
      members.forEach((m, i) => drawables.push({ y: m.y, draw: () => drawMember(ctx, m, nowMs, time, mood, fp3, showSigns && i % 4 === 1, 'read') }));

      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
      particles.current = stepParticles(ctx, particles.current, step, night);

      shadeLayer(fg, W, H, night);
      fgLights.forEach((f) => f());
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
  const bubbleRight = (W - hx + 2) * scale;

  return (
    <div ref={wrapRef} className="town paper-scene" style={{ height: H * scale }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />

      <div className={`hq-sign ${city.colorInk ? 'color' : ''}`} style={{ left: (hx + 4) * scale, top: 15 * scale, width: (hw - 8) * scale, height: 7 * scale }}>
        THE DAILY SHOUT
      </div>

      {goalCost != null && (
        <div className={`goal ${s.cash >= goalCost ? 'ready' : ''}`}>
          <span className="goal-text">
            🎯 <b>Goal:</b> save {money(goalCost)} to finish the <b>Radio Tower</b> 📻
          </span>
          <span className="goal-bar"><span style={{ width: `${city.buildPct * 100}%` }} /></span>
        </div>
      )}
      {goalCost != null && (
        <div className={`site-label ${city.build >= 5 ? 'ready' : ''}`} style={{ left: (W - 30) * scale, top: (GROUND + 1) * scale, width: 28 * scale }}>
          {city.build >= 5 ? '✨ READY!' : `🏗️ ${Math.floor(city.buildPct * 100)}%`}
        </div>
      )}

      <div className={`shout tail-right ${shout ? '' : 'empty'}`} style={{ right: bubbleRight, top: 26 * scale }}>
        <span className="shout-prefix">✍️ EXTRA!</span>
        {shout ? <span className="shout-text">{shoutTail}</span> : <span className="shout-text dim">type to write the news…</span>}
      </div>

      <div className={`crowd-reaction town-reaction mood-${moodName}`}>{reactionText(moodName, 'readers')}</div>
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
