import { memo } from 'react';
import type { CharacterId } from '../game/eras';

export type Palette = Record<string, string>;

/** Renders a pixel sprite (array of strings, '.' = transparent) as crisp SVG. */
export const Sprite = memo(function Sprite({ rows, palette, scale = 6, className }: { rows: string[]; palette: Palette; scale?: number; className?: string }) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: JSX.Element[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let len = 1;
      while (x + len < row.length && row[x + len] === ch) len++;
      if (ch !== '.' && palette[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={len} height={1} fill={palette[ch]} />);
      x += len;
    }
  });
  return (
    <svg className={className} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
});

// ---------- characters ----------

export type Mood = 'ecstatic' | 'happy' | 'neutral' | 'worried' | 'angry';

export function moodFromValue(v: number): Mood {
  if (v >= 85) return 'ecstatic';
  if (v >= 62) return 'happy';
  if (v >= 40) return 'neutral';
  if (v >= 20) return 'worried';
  return 'angry';
}

const BASE = [
  '................',
  '................',
  '................',
  '....kkkkkkkk....',
  '...knnnnnnnnk...',
  '..knnssssssnnk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '...kssssssssk...',
  '....kkkkkkkk....',
  '..kccccttcccck..',
  '.kcccccttccccck.',
];

type Px = [number, number, string];
const span = (row: number, from: number, to: number, ch: string): Px[] =>
  Array.from({ length: to - from + 1 }, (_, i) => [row, from + i, ch] as Px);

const MOOD_PX: Record<Mood, Px[]> = {
  neutral: [[8, 5, 'k'], [8, 10, 'k'], ...span(11, 6, 9, 'k')],
  happy: [[8, 5, 'k'], [8, 10, 'k'], [10, 5, 'k'], [10, 10, 'k'], ...span(11, 6, 9, 'k'), [9, 4, 'q'], [9, 11, 'q']],
  ecstatic: [
    [8, 4, 'k'], [7, 5, 'k'], [8, 6, 'k'], [8, 9, 'k'], [7, 10, 'k'], [8, 11, 'k'],
    ...span(10, 5, 10, 'k'), [11, 5, 'k'], ...span(11, 6, 9, 'r'), [11, 10, 'k'], ...span(12, 6, 9, 'k'),
    [9, 3, 'q'], [9, 12, 'q'],
  ],
  worried: [[6, 5, 'k'], [7, 4, 'k'], [6, 10, 'k'], [7, 11, 'k'], [8, 5, 'k'], [8, 10, 'k'], [11, 6, 'k'], [10, 7, 'k'], [11, 8, 'k'], [10, 9, 'k'], [7, 12, 'u'], [8, 12, 'u']],
  angry: [[6, 4, 'k'], [7, 5, 'k'], [7, 10, 'k'], [6, 11, 'k'], [8, 5, 'r'], [8, 10, 'r'], ...span(10, 6, 9, 'k'), [11, 5, 'k'], [11, 10, 'k']],
};

const ACCESSORY: Record<CharacterId, Px[]> = {
  mayor: [
    ...span(0, 4, 11, 'h'), ...span(1, 4, 11, 'h'), ...span(2, 4, 11, 'b'), ...span(3, 2, 13, 'h'),
    ...span(10, 5, 10, 'm'), [9, 6, 'm'], [9, 9, 'm'],
  ],
  editor: [
    ...span(3, 2, 13, 'g'), ...span(4, 4, 11, 'G'),
    ...span(7, 4, 6, 'o'), ...span(9, 4, 6, 'o'), [8, 4, 'o'], [8, 6, 'o'],
    ...span(7, 9, 11, 'o'), ...span(9, 9, 11, 'o'), [8, 9, 'o'], [8, 11, 'o'], [8, 7, 'o'], [8, 8, 'o'],
  ],
  anchor: [
    // neat side-parted hair + white collar around the tie
    ...span(2, 5, 12, 'n'), ...span(3, 3, 13, 'n'), [4, 3, 'n'], [4, 12, 'n'], [5, 2, 'n'], [5, 13, 'n'],
    [14, 6, 'w'], [14, 9, 'w'],
  ],
  manager: [
    ...span(2, 4, 11, 'p'), [3, 3, 'p'], [3, 12, 'p'], [4, 2, 'p'], [4, 13, 'p'], [5, 1, 'p'], [5, 14, 'p'], [6, 1, 'p'], [6, 14, 'p'],
    ...span(7, 0, 2, 'P'), ...span(8, 0, 2, 'P'), ...span(9, 0, 2, 'P'), ...span(10, 0, 2, 'P'),
    ...span(7, 13, 15, 'P'), ...span(8, 13, 15, 'P'), ...span(9, 13, 15, 'P'), ...span(10, 13, 15, 'P'),
  ],
};

const COMMON: Palette = {
  k: '#1a1020', s: '#f2c29b', S: '#f0907e', q: '#f28b9b', r: '#d6334a', u: '#59b7ff', w: '#ffffff',
  h: '#2a2433', b: '#c0392b', m: '#5c3a24', g: '#3fae6a', G: '#2d7a4b', o: '#4a4458', p: '#7a6cf0', P: '#3d3194',
};
const CHAR_PAL: Record<CharacterId, Palette> = {
  mayor: { n: '#a9aab4', c: '#7a2f3f', t: '#f2b84b' },
  editor: { n: '#6b4a2e', c: '#e8e4d8', t: '#c0392b' },
  manager: { n: '#26222e', c: '#3b3f6b', t: '#b48cff' },
  anchor: { n: '#3a2418', c: '#1f2a44', t: '#d6334a' },
};

export function characterSprite(id: CharacterId, mood: Mood): { rows: string[]; palette: Palette } {
  const grid = BASE.map((r) => r.split(''));
  if (mood === 'angry') for (const row of grid) for (let i = 0; i < row.length; i++) if (row[i] === 's') row[i] = 'S';
  for (const [r, c, ch] of [...MOOD_PX[mood], ...ACCESSORY[id]]) grid[r][c] = ch;
  return { rows: grid.map((r) => r.join('')), palette: { ...COMMON, ...CHAR_PAL[id] } };
}

// ---------- props ----------

export const PROPS: Record<string, { rows: string[]; palette: Palette }> = {
  person: {
    rows: ['..kk..', '.kssk.', '.kssk.', '..kk..', '.cccc.', 'cccccc', '.c..c.', '.k..k.'],
    palette: { k: '#1a1020', s: '#e6b48f', c: '#5a6b8c' },
  },
  paper: {
    rows: ['wwwwwwww', 'wkkkkkkw', 'wwwwwwww', 'wkkkwkkw', 'wwwwwwww', 'wkkwkkkw', 'wwwwwwww'],
    palette: { w: '#efe8d2', k: '#6a6252' },
  },
  radio: {
    rows: ['....k...', '.....k..', 'bbbbbbbb', 'bggbyyyb', 'bggbyyyb', 'bggbbbbb', 'bbbbbbbb', '.k....k.'],
    palette: { k: '#1a1020', b: '#8a5a3a', g: '#3a2a20', y: '#f2b84b' },
  },
  bell: {
    rows: ['...kk...', '..kyyk..', '.kyyyyk.', '.kyyyyk.', '.kyyyyk.', 'kyyyyyyk', 'kkkkkkkk', '...kk...'],
    palette: { k: '#5c3a10', y: '#f2c94c' },
  },
  press: {
    rows: ['kkkkkkkkkk', 'kooooooook', 'kowwwwwwok', 'kowkkkkwok', 'kowwwwwwok', 'kooooooook', 'kkkkkkkkkk', 'kk......kk'],
    palette: { k: '#1a1020', o: '#5a5a66', w: '#efe8d2' },
  },
  mic: {
    rows: ['.kkkk.', 'kggggk', 'kgwggk', 'kggggk', '.kkkk.', '..kk..', '..kk..', '.kkkk.'],
    palette: { k: '#1a1020', g: '#9aa0b8', w: '#ffffff' },
  },
  house: {
    rows: ['....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', '.wwwwwwww.', '.wbbwwbbw.', '.wbbwwbbw.', '.wwwddwww.', '.wwwddwww.'],
    palette: { r: '#b5523b', w: '#e9dcc2', b: '#6aa7d8', d: '#6b4226' },
  },
};
