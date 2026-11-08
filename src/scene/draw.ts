// Low-level pixel drawing helpers for the canvas scenes.
// The canvas works in "logical pixels" and is scaled up with CSS (image-rendering: pixelated).

export type Pal = Record<string, string>;

const spriteCache = new Map<string, HTMLCanvasElement>();

/** turn a text sprite ('.' = transparent) into a cached canvas */
export function sprite(key: string, rows: string[], pal: Pal): HTMLCanvasElement {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length));
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  spriteCache.set(key, c);
  return c;
}

export function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, flip = false) {
  x = Math.round(x);
  y = Math.round(y);
  if (!flip) ctx.drawImage(img, x, y);
  else {
    ctx.save();
    ctx.translate(x + img.width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** deterministic pseudo-random (so the town looks the same every visit) */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------- colors ----------
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const r = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${r.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------- sky by real local time ----------
interface SkyKey { h: number; top: string; bottom: string; night: number }
const SKY: SkyKey[] = [
  { h: 0, top: '#0b1030', bottom: '#1c2350', night: 1 },
  { h: 5, top: '#141a44', bottom: '#33356a', night: 0.9 },
  { h: 6.5, top: '#6a7fc4', bottom: '#f6b38a', night: 0.35 },
  { h: 8, top: '#6ec3f4', bottom: '#c7ecff', night: 0 },
  { h: 17, top: '#6ec3f4', bottom: '#c7ecff', night: 0 },
  { h: 18.5, top: '#5a4a8a', bottom: '#f08a5d', night: 0.35 },
  { h: 20, top: '#1c2350', bottom: '#2e2a5a', night: 0.85 },
  { h: 24, top: '#0b1030', bottom: '#1c2350', night: 1 },
];

export function skyAt(hour: number) {
  let i = 0;
  while (i < SKY.length - 2 && hour >= SKY[i + 1].h) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
  return { top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t), night: a.night + (b.night - a.night) * t };
}

/** current hour as a decimal (dev override: window.__hour) */
export function localHour(): number {
  const o = (window as unknown as { __hour?: number }).__hour;
  if (typeof o === 'number') return o;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

// ---------- people ----------
export const SKINS = ['#f2c29b', '#e0a77f', '#b97c54', '#8a5636'];
export const HAIRS = ['#2a1d14', '#6b4226', '#c98b3c', '#d9d2c3', '#1a1020', '#8a3b1c'];
export const SHIRTS = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d68910', '#16a085', '#e67e22', '#5d6d7e', '#b03a6f'];
export const PANTS = ['#34495e', '#4a3b2a', '#2c3e50', '#5b4b3a'];
export const HATS = ['#2a2433', '#7a2f3f', '#3b5998', '#a0522d', '#c9a227'];

// 9 wide × 16 tall (rows 0–1 are hat space)
const PERSON = [
  '.........',
  '.........',
  '..kkkkk..',
  '.khhhhhk.',
  '.ksssssk.',
  '.ksesesk.',
  '.ksssssk.',
  '.kssmssk.',
  '..kkkkk..',
  '.kccccck.',
  'kccccccck',
  'kscccccsk',
  '.kccccck.',
  '.kppkppk.',
  '.kppkppk.',
  '.kkk.kkk.',
];

export interface Look { skin: number; hair: number; shirt: number; pants: number; hat: number | null }

export type Pose = 'stand' | 'cheer' | 'read';

export function personSprite(look: Look, pose: Pose, hat: boolean, mouth: 'smile' | 'o' = 'smile'): HTMLCanvasElement {
  const key = `p${look.skin}${look.hair}${look.shirt}${look.pants}${look.hat}${pose}${hat}${mouth}`;
  const rows = PERSON.map((r) => r.split(''));
  if (pose === 'cheer') {
    // arms up next to the head
    rows[10] = '.kccccck.'.split('');
    rows[11] = '.kccccck.'.split('');
    rows[4][0] = 's'; rows[5][0] = 'k'; rows[6][0] = 'k';
    rows[4][8] = 's'; rows[5][8] = 'k'; rows[6][8] = 'k';
    rows[7][4] = 'r';
  }
  if (pose === 'read') {
    // holding an open newspaper in front of the chest
    rows[7] = '.wwwwwww.'.split('');
    rows[8] = '.wgwgwgw.'.split('');
    rows[9] = 'swwwwwwws'.split('');
    rows[10] = '.wgggggw.'.split('');
    rows[11] = '.wwwwwww.'.split('');
  }
  if (mouth === 'o' && pose !== 'read') rows[7][4] = 'k';
  if (hat && look.hat != null) {
    rows[0] = '...ttt...'.split('');
    rows[1] = '...ttt...'.split('');
    rows[2] = '.ttttttt.'.split('');
  }
  return sprite(key, rows.map((r) => r.join('')), {
    k: '#1a1020', s: SKINS[look.skin], h: HAIRS[look.hair], c: SHIRTS[look.shirt], p: PANTS[look.pants],
    e: '#1a1020', m: '#7a2f3f', r: '#7a2f3f', t: HATS[look.hat ?? 0], w: '#f4efe0', g: '#8a7a6a',
  });
}

export function hatSprite(color: number): HTMLCanvasElement {
  return sprite(`hat${color}`, ['..ttt..', '..ttt..', 'ttttttt'], { t: HATS[color] });
}

/** small sign a fan holds up during big combos */
export function signSprite(kind: number): HTMLCanvasElement {
  const boards = [
    ['wwwwwww', 'wrwwwrw', 'wrrrrrw', 'wwrrrww', 'wwwrwww', 'wwwwwww'], // heart
    ['wwwwwww', 'wwwywww', 'wyyyyyw', 'wwyyyww', 'wywwwyw', 'wwwwwww'], // star
    ['wwwwwww', 'wrwwwrw', 'wrwwwrw', 'wwwwwww', 'wrwwwrw', 'wwwwwww'], // !!
  ];
  const rows = [...boards[kind % 3], '...b...', '...b...', '...b...'];
  return sprite(`sign${kind % 3}`, rows, { w: '#f4efe0', r: '#d6334a', y: '#e8a812', b: '#6b4226' });
}

export const CAT = ['k.....', 'kk...k', '.kkkkk', '.k..k.'];
export const BIRD = [
  ['k...k', '.k.k.'],
  ['.....', 'kk.kk'],
];
