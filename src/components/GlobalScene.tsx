import { useEffect, useMemo, useRef } from 'react';
import { toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { money } from '../game/format';
import { confetti } from '../game/fx';
import { useGame } from '../game/state';
import {
  CITIES, CITY_BY_ID, COVERAGE, LAND, MAP_COLS, MAP_ROWS, cityClock, cityX, cityY, coveredCities, coveredRegions, dayPhase,
  isMorning, regionOf, secondsToSunrise, sunriseX,
} from '../game/world';
import { SCENE_H as H, drawMember, glow, reactionText, stepParticles, useCoins, useCrowdReactions, useSceneDims, type Member, type Particle } from '../scene/common';
import { HAIRS, PANTS, SHIRTS, SKINS, drawSprite, rect, seeded, sprite } from '../scene/draw';
import { characterSprite, moodFromValue } from './pixel';

const MAP_SCALE = 2;
const MAP_W = MAP_COLS * MAP_SCALE; // 96
const MAP_H = MAP_ROWS * MAP_SCALE; // 40
const MAP_Y = 13;
const DESK_Y = 67;
const TICKER_Y = 73;

/** what the newsroom shows — derived only from your progress */
function globalFrom(s: ReturnType<typeof useGame.getState>) {
  const has = (u: string) => s.upgrades.includes(u);
  return {
    regions: coveredRegions(s.lifetimeCash),
    satellites: 1 + (has('g-rocket') ? 1 : 0) + Math.min(3, Math.floor((s.staff.satengineer ?? 0) / 3)),
    correspondents: Math.min(6, s.staff.correspondent ?? 0),
    translators: (s.staff.translator ?? 0) > 0,
    engineers: (s.staff.satengineer ?? 0) > 0,
    nightDesk: (s.staff.nightdesk ?? 0) > 0,
    spy: has('g-spy'),
    moon: has('g-moon'),
    rival: has('g-rival'),
    coffee: has('g-coffee'),
    staffSeats: Math.min(12, 4 + Math.floor(Math.log10(1 + s.lifetimeCash) / 2)),
    buildPct: ERAS[s.era].evolveCost ? Math.min(1, s.cash / ERAS[s.era].evolveCost!) : 0,
  };
}

export function GlobalScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = useSceneDims(wrapRef);
  const coins = useCoins(36, 28);

  const s = useGame();
  const g = useMemo(() => globalFrom(s), [s.lifetimeCash, s.cash, s.staff, s.upgrades, s.era]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodName = moodFromValue(s.mood);
  const { W, scale } = dims;
  const mapX = Math.round((W - MAP_W) / 2);
  const cx = Math.round(W / 2);
  const storyCity = s.currentStory?.city ? CITY_BY_ID[s.currentStory.city] : null;

  const live = useRef({ g, moodName, combo: s.combo, W, mapX, cx, city: storyCity?.id });
  live.current = { g, moodName, combo: s.combo, W, mapX, cx, city: storyCity?.id };

  // newsroom staff sitting along the desk (they jump and cheer like the crowds of earlier eras)
  const crowd = useRef<Member[]>([]);
  useEffect(() => {
    const rnd = seeded(777);
    const seats: number[] = [];
    for (let x = 10; x < W - 10; x += 13) if (Math.abs(x - cx) > 16) seats.push(x);
    seats.sort((a, b) => Math.abs(a - cx) - Math.abs(b - cx));
    crowd.current = seats.slice(0, g.staffSeats).map((x) => ({
      x, y: DESK_Y + 2, flip: x > cx, phase: rnd() * 10, sign: Math.floor(rnd() * 3),
      look: {
        skin: Math.floor(rnd() * SKINS.length), hair: Math.floor(rnd() * HAIRS.length), shirt: Math.floor(rnd() * SHIRTS.length),
        pants: Math.floor(rnd() * PANTS.length), hat: null,
      },
      jumpUntil: 0, cheerUntil: 0, hatOffUntil: 0, oopsUntil: 0, lookUntil: 0,
    }));
  }, [g.staffSeats, W, cx]);

  const particles = useRef<Particle[]>([]);
  const pulse = useRef(0);
  useCrowdReactions(crowd, particles, {
    onWord: (now) => (pulse.current = Math.max(pulse.current, now + 250)),
    onBig: (now) => (pulse.current = now + 900),
    throwPapers: true,
  });

  // coverage announcements: "Your satellites now reach Africa!"
  const firstRun = useRef(true);
  useEffect(() => {
    const st = useGame.getState();
    const newly = COVERAGE.filter((c) => g.regions.includes(c.region) && !st.townSeen.includes('g-' + c.region));
    if (newly.length) {
      st.patch({ townSeen: [...st.townSeen, ...newly.map((c) => 'g-' + c.region)] });
      if (!firstRun.current) {
        const c = newly[newly.length - 1];
        toast({ emoji: c.emoji, title: `Your satellites now reach ${c.name}!`, lines: ['New cities send you news — chase their sunrise!'], big: true });
        confetti(0.5);
      }
    }
    firstRun.current = false;
  }, [g.regions]);

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
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

      const { g, moodName: mood, combo, W, mapX, cx, city } = live.current;
      const time = nowMs / 1000;
      const wall = Date.now();
      const typing = wall - useGame.getState().lastKeyAt < 1500;
      const pulsing = nowMs < pulse.current;

      // ---------- room ----------
      rect(ctx, 0, 0, W, H, '#0d1424');
      for (let x = 0; x < W; x += 12) rect(ctx, x, 0, 1, DESK_Y, '#111a2e');
      rect(ctx, 0, DESK_Y + 6, W, H - DESK_Y - 6, '#0a0f1c');

      // ---------- the big world map ----------
      rect(ctx, mapX - 3, MAP_Y - 3, MAP_W + 6, MAP_H + 6, '#2a3550');
      rect(ctx, mapX - 2, MAP_Y - 2, MAP_W + 4, MAP_H + 4, '#05080f');
      rect(ctx, mapX, MAP_Y, MAP_W, MAP_H, '#0f3a66');
      for (const [r, c0, c1] of LAND) {
        for (let c = c0; c <= c1; c++) {
          const reg = regionOf(r, c);
          const col = reg == null ? '#c8d8e8' : g.regions.includes(reg) ? '#3fae6a' : '#2f4f5f';
          rect(ctx, mapX + c * MAP_SCALE, MAP_Y + r * MAP_SCALE, MAP_SCALE, MAP_SCALE, col);
        }
      }
      // night side + the morning glow
      const sx = sunriseX(wall);
      for (let c = 0; c < MAP_COLS; c++) {
        const p = ((((c + 0.5) / MAP_COLS - sx) % 1) + 1) % 1; // 0 = sunrise
        const x = mapX + c * MAP_SCALE;
        if (p > 0.5) {
          ctx.globalAlpha = 0.5;
          rect(ctx, x, MAP_Y, MAP_SCALE, MAP_H, '#020614');
        } else if (p < 0.125) {
          ctx.globalAlpha = 0.22 * (1 - p / 0.125);
          rect(ctx, x, MAP_Y, MAP_SCALE, MAP_H, '#ffb347');
        }
        ctx.globalAlpha = 1;
      }
      const sunPx = mapX + sx * MAP_W;
      ctx.globalAlpha = 0.7;
      rect(ctx, sunPx, MAP_Y, 1, MAP_H, '#ffd36e');
      ctx.globalAlpha = 1;
      rect(ctx, sunPx - 1, MAP_Y - 3, 3, 3, '#ffd36e');
      // cities: lights at night, a dot by day; the city in your story blinks red
      for (const c of CITIES) {
        if (!g.regions.includes(c.region)) continue;
        const x = mapX + cityX(c) * MAP_W;
        const y = MAP_Y + cityY(c) * MAP_H;
        const p = dayPhase(c, wall);
        if (c.id === city) {
          const on = Math.floor(time * 4) % 2 === 0;
          rect(ctx, x - 1, y - 1, 3, 3, on ? '#ff3344' : '#ffffff');
          const ring = (time * 6) % 8;
          ctx.globalAlpha = 1 - ring / 8;
          rect(ctx, x - ring, y, ring * 2 + 1, 1, '#ff5d73');
          rect(ctx, x, y - ring, 1, ring * 2 + 1, '#ff5d73');
          ctx.globalAlpha = 1;
          if (isMorning(c, wall)) glow(ctx, x + 0.5, y + 0.5, 7, 0.4, '#ffd36e');
        } else rect(ctx, x, y, 1, 1, p > 0.5 ? '#ffe7a0' : '#ffffff');
      }
      // foreign correspondents: tiny flashing cameras around the world
      const cities = coveredCities(useGame.getState().lifetimeCash);
      for (let i = 0; i < g.correspondents && cities.length; i++) {
        const c = cities[(i * 5 + 2) % cities.length];
        if (Math.floor(time * 2 + i * 0.7) % 3 === 0) rect(ctx, mapX + cityX(c) * MAP_W + 2, MAP_Y + cityY(c) * MAP_H - 3, 2, 1, '#ffffff');
      }
      // screen shine
      ctx.globalAlpha = 0.06;
      rect(ctx, mapX, MAP_Y, MAP_W, 3, '#ffffff');
      ctx.globalAlpha = 1;

      // ---------- left screen: satellites around Earth ----------
      const lx = 4;
      const lw = mapX - 10;
      if (lw > 24) {
        rect(ctx, lx - 1, MAP_Y - 1, lw + 2, MAP_H + 2, '#2a3550');
        rect(ctx, lx, MAP_Y, lw, MAP_H, '#03060d');
        const st = seeded(5);
        for (let i = 0; i < 14; i++) rect(ctx, lx + st() * lw, MAP_Y + st() * MAP_H, 1, 1, '#8a9ab8');
        const ex = lx + lw / 2;
        const ey = MAP_Y + MAP_H / 2;
        for (let dy = -7; dy <= 7; dy++) {
          const half = Math.round(Math.sqrt(49 - dy * dy));
          rect(ctx, ex - half, ey + dy, half * 2, 1, '#1f5fa0');
        }
        rect(ctx, ex - 4, ey - 4, 4, 3, '#3fae6a');
        rect(ctx, ex + 1, ey - 1, 3, 5, '#3fae6a');
        rect(ctx, ex - 3, ey + 3, 2, 2, '#3fae6a');
        const rx = Math.min(lw / 2 - 3, 20);
        for (let i = 0; i < g.satellites + (g.spy ? 1 : 0); i++) {
          const spy = g.spy && i === g.satellites;
          const a = time * (0.6 + i * 0.17) + i * 2.1;
          const px = ex + Math.cos(a) * rx * (0.65 + (i % 3) * 0.15);
          const py = ey + Math.sin(a) * 12 * (0.7 + (i % 2) * 0.25);
          const behind = Math.sin(a) < 0 && Math.abs(px - ex) < 7;
          if (behind) continue;
          rect(ctx, px - 3, py, 2, 1, '#4bd3ff');
          rect(ctx, px + 2, py, 2, 1, '#4bd3ff');
          rect(ctx, px - 1, py - 1, 3, 3, spy ? '#ff3344' : '#e8e8f0');
          if (typing && Math.floor(time * 6 + i) % 3 === 0) rect(ctx, px, py + 2, 1, 1, '#ffd36e');
        }
        if (g.moon) {
          rect(ctx, lx + lw - 8, MAP_Y + 3, 5, 5, '#e8e4d8');
          rect(ctx, lx + lw - 7, MAP_Y + 4, 1, 1, '#b8b4a8');
          if (Math.floor(time * 2) % 2) rect(ctx, lx + lw - 6, MAP_Y + 2, 1, 1, '#ff3344');
        }
        if (pulsing) glow(ctx, ex, ey, 18, 0.18, '#4bd3ff');
      }

      // ---------- right screen: world clocks (text is an HTML overlay) ----------
      const rx0 = mapX + MAP_W + 6;
      const rw = W - rx0 - 4;
      if (rw > 24) {
        rect(ctx, rx0 - 1, MAP_Y - 1, rw + 2, MAP_H + 2, '#2a3550');
        rect(ctx, rx0, MAP_Y, rw, MAP_H, '#03060d');
      }

      // ticker band under the map (text is an HTML overlay)
      rect(ctx, 0, TICKER_Y, W, H - TICKER_Y, '#b3122e');

      // ---------- people at the desk ----------
      const members = crowd.current;
      const dance = combo >= 10;
      members.forEach((m, i) => {
        if (dance && (Math.floor(time * 4) + i) % 2 === 0) m.cheerUntil = Math.max(m.cheerUntil, nowMs + 200);
        drawMember(ctx, m, nowMs, time, mood, 0, false);
      });
      // you in the middle
      const you = characterSprite('world', mood);
      const bob = typing ? Math.floor(time * 8) % 2 : 0;
      drawSprite(ctx, sprite(`world-${mood}`, you.rows, you.palette), cx - 8, DESK_Y - 14 - bob);

      // the long desk with monitors
      rect(ctx, 0, DESK_Y, W, 1, '#4a5a7a');
      rect(ctx, 0, DESK_Y + 1, W, 5, '#26303f');
      for (const m of members) {
        const glowOn = typing && (Math.floor(time * 5) + m.x) % 4 !== 0;
        rect(ctx, m.x - 3, DESK_Y - 4, 6, 4, '#1a1a22');
        rect(ctx, m.x - 2, DESK_Y - 3, 4, 2, glowOn ? '#5dff9b' : '#2a6a4a');
      }
      rect(ctx, cx - 6, DESK_Y - 1, 12, 1, '#4bd3ff'); // your keyboard
      if (g.coffee || g.nightDesk) {
        const mx = cx + 10;
        rect(ctx, mx, DESK_Y - 3, 3, 3, '#e8e4d8');
        if (Math.floor(time * 3) % 2) rect(ctx, mx + 1, DESK_Y - 6, 1, 2, '#c8c8d0');
      }
      if (g.translators) {
        const m = members[0];
        if (m && Math.floor(time / 2) % 2 === 0) {
          rect(ctx, m.x - 4, m.y - 24, 9, 5, '#ffffff');
          rect(ctx, m.x - 2, m.y - 22, 5, 1, '#5aa9ff');
        }
      }
      if (g.rival) {
        rect(ctx, W - 14, DESK_Y + 2, 10, 3, '#ffd84d');
        rect(ctx, W - 12, DESK_Y + 3, 6, 1, '#8a6a00');
      }
      particles.current = stepParticles(ctx, particles.current, step, 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W]);

  // world clocks: the cities closest to their sunrise
  const now = Date.now();
  const clocks = coveredCities(s.lifetimeCash)
    .slice()
    .sort((a, b) => secondsToSunrise(a, now) - secondsToSunrise(b, now))
    .slice(0, 4);
  const era = ERAS[s.era];
  const next = ERAS[s.era + 1];
  const goalCost = era.evolveCost;
  const visiting = s.boost && Date.now() < s.boost.until ? s.boost : null;
  const ticker = [...s.recentHeadlines, 'SHOUT WORLD NEWS — ALWAYS MORNING SOMEWHERE'].join('   ✦   ');
  const rx0 = Math.round((W + MAP_W) / 2) + 6;

  return (
    <div ref={wrapRef} className="town global-scene" style={{ height: H * scale }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />

      <div className="world-clocks" style={{ left: rx0 * scale, top: (MAP_Y + 1) * scale, width: (W - rx0 - 4) * scale }}>
        {clocks.map((c) => (
          <div key={c.id} className={`clock-row ${isMorning(c, now) ? 'morning' : ''} ${storyCity?.id === c.id ? 'current' : ''}`}>
            <span>{isMorning(c, now) ? '🌅' : dayPhase(c, now) > 0.5 ? '🌙' : '☀️'} {c.name}</span>
            <b>{cityClock(c, now)}</b>
          </div>
        ))}
      </div>

      <div className="world-ticker" style={{ top: TICKER_Y * scale, height: (H - TICKER_Y) * scale }}>
        <span className="ticker-label">WORLD</span>
        <span className="ticker-track"><span key={ticker}>{ticker}   ✦   {ticker}</span></span>
      </div>

      {goalCost != null && (
        <div className={`goal ${s.cash >= goalCost ? 'ready' : ''}`}>
          <span className="goal-text">
            🎯 <b>Goal:</b> save {money(goalCost)} for a <b>Streaming app</b> 📱 {!next?.playable && <small>(soon)</small>}
          </span>
          <span className="goal-bar"><span style={{ width: `${g.buildPct * 100}%` }} /></span>
        </div>
      )}

      <div className={`crowd-reaction town-reaction mood-${moodName}`} style={{ bottom: (H - TICKER_Y + 1) * scale, left: '22%' }}>{reactionText(moodName, 'viewers')}</div>
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
