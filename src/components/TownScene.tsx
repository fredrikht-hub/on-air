import { useEffect, useMemo, useRef } from 'react';
import { toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { money } from '../game/format';
import { confetti } from '../game/fx';
import { useGame } from '../game/state';
import {
  SCENE_H as H, buildCrowd, drawClouds, drawMember, drawStarsMoon, drawSun, reactionText, shadeLayer, stepParticles,
  useCoins, useCrowdReactions, useParallax, useSceneDims, type Member, type Particle,
} from '../scene/common';
import { BIRD, CAT, SKINS, drawSprite, localHour, mix, personSprite, rect, seeded, skyAt, sprite } from '../scene/draw';
import { ANNOUNCE, townFrom, type Town } from '../scene/town';
import { PROPS, characterSprite, moodFromValue } from './pixel';

const GROUND = 50; // where the square starts
const CROWD_CY = 61;

const WALLS = ['#e9dcc2', '#d8c8a8', '#efe3cf', '#cdb89a', '#e3d0b8', '#d6c3b0'];
const ROOFS = ['#b5523b', '#8a4a3a', '#6b5a8a', '#4a6b8a', '#a0633a', '#7a3b4a'];

export function TownScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = useSceneDims(wrapRef);
  const parallax = useParallax();
  const coins = useCoins();

  const s = useGame();
  const town = useMemo(() => townFrom(s), [s.lifetimeCash, s.cash, s.staff, s.upgrades, s.era]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodName = moodFromValue(s.mood);
  const cx = Math.round(dims.W * 0.45);

  // live values for the render loop
  const live = useRef({ town, moodName, combo: s.combo, cx, W: dims.W });
  live.current = { town, moodName, combo: s.combo, cx, W: dims.W };

  const crowd = useRef<Member[]>([]);
  useEffect(() => {
    crowd.current = buildCrowd(town.crowd, cx, CROWD_CY, Math.min(74, dims.W * 0.38), 10);
  }, [town.crowd, dims.W, cx]);

  const particles = useRef<Particle[]>([]);
  const bellSwing = useRef(0);
  useCrowdReactions(crowd, particles, {
    onWord: (now) => (bellSwing.current = now + 450),
    onBig: (now) => (bellSwing.current = now + 900),
  });

  // ---------- town growth announcements ----------
  const firstRun = useRef(true);
  useEffect(() => {
    const st = useGame.getState();
    const newly = ANNOUNCE.filter((a) => a.check(town) && !st.townSeen.includes(a.id));
    if (!newly.length) {
      firstRun.current = false;
      return;
    }
    st.patch({ townSeen: [...st.townSeen, ...newly.map((a) => a.id)] });
    if (!firstRun.current) {
      const a = newly[newly.length - 1];
      toast({ emoji: a.emoji, title: 'Your town is growing!', lines: [a.text], big: true });
      confetti(0.4);
    }
    firstRun.current = false;
  }, [town]);

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const main = canvas.getContext('2d')!;
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = canvas.width;
    fgCanvas.height = canvas.height;
    const fg = fgCanvas.getContext('2d')!;
    let ctx = main;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let smokeTimer = 0;
    let bird: { x: number; y: number; t: number } | null = null;
    let birdTimer = 8;

    const frame = (nowMs: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      acc += dt;
      if (acc < 1 / 30) return; // ~30 fps is plenty for pixel art
      const step = acc;
      acc = 0;
      if (document.hidden) return;

      const { town: t, moodName: mood, combo, cx, W } = live.current;
      const time = nowMs / 1000;
      const hour = localHour();
      const sky = skyAt(hour);
      const night = sky.night;
      const par = (parallax.current.cur += (parallax.current.target - parallax.current.cur) * 0.05);
      const emissive: (() => void)[] = [];
      const fgEmissive: (() => void)[] = [];
      ctx = main;

      // sky
      const g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, sky.top);
      g.addColorStop(1, sky.bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      drawStarsMoon(ctx, W, time, night, sky.top);
      drawSun(ctx, W, hour);
      drawClouds(ctx, W, time, night, par);

      // hills (far)
      const hillCol = mix('#7cae5a', '#2a3a3a', night * 0.6);
      const hillDark = mix('#5f9446', '#223030', night * 0.6);
      for (let x = 0; x < W; x++) {
        const xx = x + par * 1;
        const h1 = 12 + Math.sin(xx * 0.045) * 5 + Math.sin(xx * 0.11) * 2;
        rect(ctx, x, GROUND - h1, 1, h1, x % 7 === 0 ? hillDark : hillCol);
      }
      // castle on the hill
      if (t.castle) {
        const kx = Math.round(W * 0.66 - par);
        const col = mix('#a9a3b8', '#3c3a52', night * 0.5);
        rect(ctx, kx, GROUND - 26, 16, 12, col);
        rect(ctx, kx - 3, GROUND - 30, 5, 16, col);
        rect(ctx, kx + 14, GROUND - 30, 5, 16, col);
        for (let i = 0; i < 4; i++) rect(ctx, kx + i * 4, GROUND - 28, 2, 2, col);
        rect(ctx, kx + 6, GROUND - 20, 4, 6, '#3a2a2a');
        rect(ctx, kx + 7, GROUND - 38, 1, 10, '#5a4a3a');
        const wave = Math.sin(time * 4) > 0 ? 0 : 1;
        rect(ctx, kx + 8, GROUND - 38 + wave, 6, 3, '#d6334a');
        rect(ctx, kx + 9, GROUND - 37 + wave, 2, 1, '#ffd84d');
      }

      // ---------- middle layer: the town ----------
      const mp = -par * 2;
      const rightLimit = W - 54;
      const slots: number[] = [];
      // keep the spot behind the podium free so you stand out
      for (let x = 22; x + 21 <= rightLimit; x += 25) if (x + 24 < cx - 14 || x > cx + 14) slots.push(x);
      const order = [...slots.keys()].sort((a, b) => Math.abs(a - (slots.length - 1) / 2) - Math.abs(b - (slots.length - 1) / 2));
      const houseSlots = order.slice(0, Math.min(t.houses, slots.length));
      const tavernSlot = t.tavern ? order[houseSlots.length] : undefined;

      // bell tower
      if (t.bellTower) {
        const bx = 3 + mp;
        const stone = mix('#a49a8e', '#3c3a4c', night * 0.5);
        rect(ctx, bx, 12, 14, GROUND - 12, stone);
        rect(ctx, bx + 1, 13, 1, GROUND - 13, mix(stone, '#000000', 0.15));
        rect(ctx, bx + 3, 18, 8, 9, '#2a2030');
        for (let i = 0; i < 4; i++) rect(ctx, bx + i * 4, 10, 2, 2, stone);
        rect(ctx, bx - 1, 4, 16, 2, '#6b3a3a');
        rect(ctx, bx + 2, 2, 10, 2, '#6b3a3a');
        rect(ctx, bx + 5, 0, 4, 2, '#6b3a3a');
        const swing = nowMs < bellSwing.current ? Math.round(Math.sin(nowMs / 60) * 1.5) : 0;
        rect(ctx, bx + 5 + swing, 20, 4, 4, '#f2c94c');
        rect(ctx, bx + 4 + swing, 23, 6, 2, '#d4a017');
        rect(ctx, bx + 6 + swing, 25, 2, 1, '#8a6a10');
        rect(ctx, bx + 5, 32, 4, 6, mix(stone, '#000000', 0.3));
      }

      const chimneys: [number, number][] = [];
      const drawHouse = (slot: number, idx: number, tavern = false) => {
        const r = seeded(500 + idx * 31);
        const x = slots[slot] + mp;
        const w = tavern ? 24 : 21;
        const h = tavern ? 22 : 17 + Math.floor(r() * 3) * 3;
        const top = GROUND - h;
        const wall = mix(WALLS[idx % WALLS.length], '#3a3650', night * 0.45);
        const roof = mix(tavern ? '#5a3a24' : ROOFS[idx % ROOFS.length], '#2a2640', night * 0.45);
        const roofH = 7;
        for (let i = 0; i < roofH; i++) {
          const inset = roofH - 1 - i;
          rect(ctx, x - 1 + inset, top + i, w + 2 - inset * 2, 1, roof);
        }
        rect(ctx, x, top + roofH, w, h - roofH, wall);
        rect(ctx, x, GROUND - 1, w, 1, mix(wall, '#000000', 0.2));
        // chimney
        rect(ctx, x + w - 6, top + 1, 3, 5, mix('#6a5a50', '#2a2640', night * 0.4));
        chimneys.push([x + w - 5, top]);
        // door
        rect(ctx, x + Math.floor(w / 2) - 2, GROUND - 8, 5, 8, mix('#6b4226', '#2a2030', night * 0.4));
        // windows
        const wy = top + roofH + 2;
        const winXs = [x + 3, x + w - 7];
        for (const wx of winXs) {
          rect(ctx, wx - 1, wy - 1, 6, 6, mix('#4a3a30', '#1a1424', night * 0.4));
          const lit = night > 0.3 && r() < 0.85;
          if (lit) emissive.push(() => rect(ctx, wx, wy, 4, 4, '#ffd36e'));
          else rect(ctx, wx, wy, 4, 4, mix('#8fc6ec', '#2c3058', night));
        }
        // nosy neighbor peeking out of the first house
        if (t.nosy && idx === 0) {
          const nx = winXs[0];
          const peek = Math.sin(time * 0.8) > -0.2 ? 0 : 1;
          rect(ctx, nx + 1, wy + 1 + peek, 2, 3, SKINS[0]);
          rect(ctx, nx, wy + peek, 4, 1, '#d9d2c3');
          rect(ctx, nx + 1, wy + 2 + peek, 1, 1, '#1a1020');
        }
        // posters from your scribes
        if (!tavern && idx < t.posters) {
          rect(ctx, x + Math.floor(w / 2) - 7, top + roofH + 8, 3, 4, '#f4efe0');
          rect(ctx, x + Math.floor(w / 2) - 7, top + roofH + 9, 3, 1, '#7a6a5a');
        }
        if (tavern) {
          rect(ctx, x + 2, top + roofH + 9, 9, 4, '#3a2416');
          rect(ctx, x + 3, top + roofH + 10, 7, 2, '#c9a227');
          rect(ctx, x + w - 4, top + roofH + 9, 1, 5, '#3a2416');
          rect(ctx, x + w - 6, top + roofH + 14, 4, 3, '#d68910');
        }
        // cat on the roof
        if (t.cat && idx === 1) {
          const cat = sprite('cat', CAT, { k: '#2a2433' });
          drawSprite(ctx, cat, x + 4, top + 2);
          if (Math.sin(time * 2) > 0.6) rect(ctx, x + 3, top + 1, 1, 1, '#2a2433');
        }
      };
      houseSlots.forEach((slot, i) => drawHouse(slot, i));
      if (tavernSlot !== undefined) drawHouse(tavernSlot, 9, true);

      // laundry line between the first two houses
      if (t.laundry && houseSlots.length >= 2) {
        const a = Math.min(slots[houseSlots[0]], slots[houseSlots[1]]) + mp + 21;
        const b = Math.max(slots[houseSlots[0]], slots[houseSlots[1]]) + mp;
        if (b - a > 2) {
          const ly = GROUND - 20;
          rect(ctx, a, ly, b - a, 1, '#5a4a3a');
          const cols = ['#d6334a', '#f4efe0', '#2e86c1'];
          for (let i = 0; i < 3; i++) {
            const fl = Math.sin(time * 3 + i) > 0 ? 3 : 4;
            rect(ctx, a + 1 + i * Math.floor((b - a) / 3), ly + 1, 2, fl, cols[i]);
          }
        }
      }

      // street lamps
      if (t.lamps) {
        for (const slot of houseSlots) {
          const lx = slots[slot] + mp - 2;
          rect(ctx, lx, GROUND - 12, 1, 12, '#2a2433');
          rect(ctx, lx - 1, GROUND - 14, 3, 2, '#2a2433');
          emissive.push(() => {
            rect(ctx, lx - 1, GROUND - 13, 3, 1, night > 0.3 ? '#ffe9a0' : '#8a8a7a');
            if (night > 0.3) {
              ctx.globalAlpha = 0.18 * night;
              rect(ctx, lx - 4, GROUND - 16, 9, 9, '#ffd36e');
              ctx.globalAlpha = 1;
            }
          });
        }
      }

      // ---------- construction site: next era's building ----------
      const sx0 = W - 50 + mp;
      const sw = 44;
      if (ERAS[useGame.getState().era].evolveCost != null) {
        const brick = mix('#b86a4a', '#3a2a3a', night * 0.45);
        const wood = mix('#a0703a', '#3a2a24', night * 0.4);
        rect(ctx, sx0, GROUND - 2, sw, 2, mix('#7a5a3a', '#2a2030', night * 0.4));
        if (t.build === 0) {
          rect(ctx, sx0 + 18, GROUND - 14, 1, 12, wood);
          rect(ctx, sx0 + 12, GROUND - 18, 14, 6, mix('#f4efe0', '#4a4458', night * 0.4));
          rect(ctx, sx0 + 14, GROUND - 16, 10, 1, '#7a6a5a');
          rect(ctx, sx0 + 14, GROUND - 14, 7, 1, '#7a6a5a');
        }
        if (t.build >= 1) {
          rect(ctx, sx0 + 2, GROUND - 6, 6, 4, wood);
          rect(ctx, sx0 + 9, GROUND - 5, 5, 3, wood);
          rect(ctx, sx0 + 34, GROUND - 7, 8, 5, mix('#9a8f86', '#3a3850', night * 0.4));
        }
        const wallH = t.build >= 3 ? 24 : t.build >= 2 ? 6 : 0;
        if (wallH) {
          rect(ctx, sx0 + 4, GROUND - 2 - wallH, sw - 8, wallH, brick);
          for (let y = GROUND - 2 - wallH; y < GROUND - 2; y += 3) rect(ctx, sx0 + 4, y, sw - 8, 1, mix(brick, '#000000', 0.15));
        }
        if (t.build >= 2 && t.build < 5) {
          for (let i = 0; i <= 4; i++) rect(ctx, sx0 + 2 + i * 10, GROUND - 32, 1, 30, wood);
          for (let y = GROUND - 30; y < GROUND - 2; y += 9) rect(ctx, sx0 + 2, y, 41, 1, wood);
        }
        if (t.build >= 4) {
          const roof = mix('#3a4a6a', '#1a1a30', night * 0.4);
          for (let i = 0; i < 6; i++) rect(ctx, sx0 + 2 + (5 - i), GROUND - 32 + i, sw - 4 - (5 - i) * 2, 1, roof);
        }
        if (t.build >= 5) {
          rect(ctx, sx0 + 8, GROUND - 22, sw - 16, 6, '#1a1020');
          rect(ctx, sx0 + sw / 2 - 3, GROUND - 10, 6, 8, '#6b4226');
          rect(ctx, sx0 + sw / 2, GROUND - 42, 1, 10, '#5a4a3a');
          const wave = Math.sin(time * 5) > 0 ? 0 : 1;
          rect(ctx, sx0 + sw / 2 + 1, GROUND - 42 + wave, 6, 3, '#ffd84d');
          if (Math.sin(time * 6) > 0.3) emissive.push(() => rect(ctx, sx0 + 4 + ((time * 20) % (sw - 8)), GROUND - 34, 1, 1, '#ffffff'));
        }
      }

      // ---------- the square ----------
      rect(ctx, 0, GROUND, W, H - GROUND, mix('#9a8a76', '#2c2838', night * 0.5));
      const cob = mix('#857563', '#24202e', night * 0.5);
      const rc = seeded(42);
      for (let i = 0; i < W * 1.4; i++) rect(ctx, rc() * W, GROUND + 2 + rc() * (H - GROUND - 2), 2, 1, cob);
      rect(ctx, 0, GROUND, W, 1, mix('#6a5a4a', '#1a1626', night * 0.5));

      // well / fountain (right) and market (left), behind the crowd
      const fx = cx + 50 - par * 2.5;
      if (t.fountain) {
        const stone = mix('#b8b0a8', '#4a4860', night * 0.4);
        rect(ctx, fx - 9, GROUND + 1, 18, 5, stone);
        rect(ctx, fx - 7, GROUND + 2, 14, 2, mix('#5fb7e8', '#2a3a6a', night * 0.5));
        rect(ctx, fx - 1, GROUND - 6, 2, 8, stone);
        const jet = Math.floor(time * 6) % 2;
        rect(ctx, fx - 2 - jet, GROUND - 8, 1, 3, '#a8dcff');
        rect(ctx, fx + 1 + jet, GROUND - 8, 1, 3, '#a8dcff');
        rect(ctx, fx - 1, GROUND - 9, 2, 1, '#d8f0ff');
      } else if (t.well) {
        const stone = mix('#a49a8e', '#3c3a4c', night * 0.45);
        rect(ctx, fx - 5, GROUND - 1, 10, 5, stone);
        rect(ctx, fx - 5, GROUND - 9, 1, 8, '#6b4226');
        rect(ctx, fx + 4, GROUND - 9, 1, 8, '#6b4226');
        rect(ctx, fx - 6, GROUND - 10, 12, 2, mix('#8a4a3a', '#2a2030', night * 0.4));
      }
      // golden statues of you — one for every company you sold
      const statues = Math.min(3, useGame.getState().sales);
      for (let i = 0; i < statues; i++) {
        const sx2 = 2 + i * 12 - par * 2.5;
        const stone = mix('#b8b0a8', '#4a4860', night * 0.4);
        rect(ctx, sx2 + 2, GROUND - 2, 12, 6, stone);
        rect(ctx, sx2 + 1, GROUND - 3, 14, 1, stone);
        const gold = characterSprite('mayor', 'happy');
        const pal = Object.fromEntries(Object.keys(gold.palette).map((k) => [k, k === 'k' ? '#8a6a10' : k === 's' || k === 'c' ? '#e8b828' : '#f2cf5a']));
        drawSprite(ctx, sprite('statue', gold.rows, pal), sx2, GROUND - 18);
        if (Math.sin(time * 2 + i) > 0.92) rect(ctx, sx2 + 4 + i, GROUND - 14, 1, 1, '#ffffff');
      }
      if (t.market) {
        const mx = cx - 66 - par * 2.5;
        rect(ctx, mx, GROUND - 6, 1, 9, '#5a3a24');
        rect(ctx, mx + 15, GROUND - 6, 1, 9, '#5a3a24');
        for (let i = 0; i < 8; i++) rect(ctx, mx - 1 + i * 2, GROUND - 9, 2, 3, i % 2 ? '#f4efe0' : '#d6334a');
        rect(ctx, mx + 1, GROUND - 1, 14, 3, '#8a5a30');
        for (let i = 0; i < 6; i++) rect(ctx, mx + 2 + i * 2, GROUND - 2, 1, 1, i % 2 ? '#e8a812' : '#c0392b');
      }

      // background done: night shading, then lit windows / lamps on top
      if (night > 0.02) {
        ctx.globalAlpha = night * 0.45;
        rect(ctx, 0, 0, W, H, '#0a0e28');
        ctx.globalAlpha = 1;
      }
      emissive.forEach((f) => f());
      emissive.length = 0;

      // ---------- foreground (people) on its own layer ----------
      fg.clearRect(0, 0, W, H);
      ctx = fg;

      // kids running around (Shouting Kids)
      for (let i = 0; i < t.kids; i++) {
        const span = W - 70;
        const speed = 12 + i * 3;
        const pos = (time * speed + i * 37) % (span * 2);
        const goingRight = pos < span;
        const kx = 8 + (goingRight ? pos : span * 2 - pos);
        const hop = Math.floor(time * 8 + i) % 2;
        const kid = personSprite({ skin: i % 4, hair: (i + 2) % 6, shirt: (i * 3) % 9, pants: i % 4, hat: null }, i % 2 ? 'cheer' : 'stand', false);
        drawSprite(ctx, kid, kx, GROUND - 14 - hop + 2, !goingRight);
      }

      // the night watchman with his lantern
      if (t.watchman && night > 0.4) {
        const span = W - 60;
        const pos = (time * 5) % (span * 2);
        const right = pos < span;
        const wx = 10 + (right ? pos : span * 2 - pos);
        const man = personSprite({ skin: 1, hair: 3, shirt: 7, pants: 0, hat: 0 }, 'stand', true);
        drawSprite(ctx, man, wx, GROUND - 14, !right);
        const lx = wx + (right ? 9 : -2);
        fgEmissive.push(() => {
          rect(ctx, lx, GROUND - 6, 2, 2, '#ffd36e');
          ctx.globalAlpha = 0.2;
          rect(ctx, lx - 4, GROUND - 10, 10, 10, '#ffd36e');
          ctx.globalAlpha = 1;
        });
      }

      // ---------- crowd + podium (sorted by depth) ----------
      const fp = -par * 3;
      const members = crowd.current;
      const drawables: { y: number; draw: () => void }[] = [];
      const showSigns = combo >= 10;
      members.forEach((m, i) => drawables.push({ y: m.y, draw: () => drawMember(ctx, m, nowMs, time, mood, fp, showSigns && i % 4 === 1) }));
      // podium + you
      drawables.push({
        y: CROWD_CY - 1,
        draw: () => {
          const px = cx - 13 + fp;
          rect(ctx, px, GROUND + 2, 26, 9, mix('#8a5a30', '#2a2030', night * 0.4));
          rect(ctx, px, GROUND + 2, 26, 1, mix('#b07a40', '#3a2a30', night * 0.4));
          rect(ctx, px + 2, GROUND + 5, 22, 1, mix('#6b4226', '#20182a', night * 0.4));
          rect(ctx, px + 2, GROUND + 8, 22, 1, mix('#6b4226', '#20182a', night * 0.4));
          const you = characterSprite('mayor', mood);
          const img = sprite(`you-${mood}`, you.rows, you.palette);
          const bob = mood === 'ecstatic' ? Math.floor(time * 6) % 2 : 0;
          drawSprite(ctx, img, cx - 8 + fp, GROUND + 2 - 16 - bob);
          if (t.megaphone) {
            const mx = cx + 6 + fp;
            const my = GROUND - 7 - bob;
            rect(ctx, mx, my + 1, 2, 2, '#e8e4d8');
            rect(ctx, mx + 2, my, 2, 4, '#d6334a');
            rect(ctx, mx + 4, my - 1, 2, 6, '#d6334a');
          }
          if (t.bigBell) {
            const bell = sprite('bigbell', PROPS.bell.rows, PROPS.bell.palette);
            drawSprite(ctx, bell, cx + 14 + fp, GROUND + 3);
          }
        },
      });
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

      // ---------- particles ----------
      smokeTimer += step;
      if (smokeTimer > 0.5) {
        smokeTimer = 0;
        for (const [x, y] of chimneys) if (Math.random() < 0.6) particles.current.push({ x, y, vx: 0.8, vy: -3, life: 0, max: 3, kind: 'smoke', color: 0 });
      }
      particles.current = stepParticles(ctx, particles.current, step, night);

      // birds
      birdTimer -= step;
      if (!bird && birdTimer <= 0 && night < 0.5) bird = { x: -10, y: 8 + Math.random() * 12, t: 0 };
      if (bird) {
        bird.x += 14 * step;
        bird.t += step;
        const frame = Math.floor(bird.t * 4) % 2;
        for (let i = 0; i < 3; i++) drawSprite(ctx, sprite(`bird${frame}`, BIRD[frame], { k: '#2a2433' }), bird.x - i * 7, bird.y + (i % 2) * 3);
        if (bird.x > W + 20) {
          bird = null;
          birdTimer = 15 + Math.random() * 20;
        }
      }

      // shade only the people that were drawn, then add their lights, then composite
      shadeLayer(fg, W, H, night);
      fgEmissive.forEach((f) => f());
      emissive.forEach((f) => f());
      main.drawImage(fgCanvas, 0, 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [dims.W, parallax]);

  const { W, scale } = dims;
  const era = ERAS[s.era];
  const goalCost = era.evolveCost;
  const shout = s.shout;
  const shoutTail = shout.length > 42 ? '…' + shout.slice(-42) : shout;
  const visiting = s.boost && Date.now() < s.boost.until ? s.boost : null;

  return (
    <div ref={wrapRef} className="town" style={{ height: H * scale }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />

      {goalCost != null && (
        <div className={`goal ${s.cash >= goalCost ? 'ready' : ''}`}>
          <span className="goal-text">
            🎯 <b>Goal:</b> save {money(goalCost)} to finish the <b>Daily Shout</b> newspaper 📰
          </span>
          <span className="goal-bar"><span style={{ width: `${town.buildPct * 100}%` }} /></span>
        </div>
      )}

      {goalCost != null && (
        <div className={`site-label ${town.build >= 5 ? 'ready' : ''}`} style={{ left: (W - 50) * scale, top: (GROUND + 1) * scale, width: 44 * scale }}>
          {town.build >= 5 ? '✨ READY! Press Enter' : `🏗️ ${Math.floor(town.buildPct * 100)}% built`}
        </div>
      )}
      {goalCost != null && town.build >= 5 && (
        <div className="site-sign" style={{ left: (W - 42) * scale, top: (GROUND - 22) * scale, width: 28 * scale, height: 6 * scale }}>DAILY SHOUT</div>
      )}

      <div className={`shout ${shout ? '' : 'empty'}`} style={{ left: (cx + 10) * scale, bottom: (H - GROUND + 18) * scale }}>
        <span className="shout-prefix">📢 HEAR YE!</span>
        {shout ? <span className="shout-text">{shoutTail}</span> : <span className="shout-text dim">type to shout the news…</span>}
      </div>

      <div className={`crowd-reaction town-reaction mood-${moodName}`}>{reactionText(moodName, 'crowd')}</div>

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

export type { Town };
