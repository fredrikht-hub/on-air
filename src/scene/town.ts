import { ERAS } from '../game/eras';
import type { GameData } from '../game/state';

/** Everything the Town Square scene shows — derived only from your progress. */
export interface Town {
  houses: number;
  bellTower: boolean;
  ringers: number;
  kids: number;
  posters: number;
  tavern: boolean;
  watchman: boolean;
  nosy: boolean;
  bigBell: boolean;
  megaphone: boolean;
  well: boolean;
  laundry: boolean;
  cat: boolean;
  fountain: boolean;
  market: boolean;
  lamps: boolean;
  castle: boolean;
  crowd: number;
  /** construction of the next era's building: 0 empty lot … 5 finished */
  build: number;
  buildPct: number;
}

/** money-earned milestones that grow the town */
const GROWTH: { at: number; key: keyof Town; value?: number }[] = [
  { at: 400, key: 'houses', value: 4 },
  { at: 1_500, key: 'laundry' },
  { at: 3_000, key: 'cat' },
  { at: 5_000, key: 'fountain' },
  { at: 8_000, key: 'houses', value: 5 },
  { at: 12_000, key: 'market' },
  { at: 18_000, key: 'lamps' },
  { at: 25_000, key: 'houses', value: 6 },
  { at: 40_000, key: 'castle' },
];

export function townFrom(s: GameData): Town {
  const has = (u: string) => s.upgrades.includes(u);
  const t: Town = {
    houses: 3,
    bellTower: (s.staff.bell ?? 0) > 0,
    ringers: s.staff.bell ?? 0,
    kids: Math.min(5, s.staff.apprentice ?? 0),
    posters: Math.min(8, s.staff.scribe ?? 0),
    tavern: has('gossip'),
    watchman: has('watchman'),
    nosy: has('horseshoe'),
    bigBell: has('bell1'),
    megaphone: has('megaphone'),
    well: true,
    laundry: false,
    cat: false,
    fountain: false,
    market: false,
    lamps: false,
    castle: false,
    crowd: Math.min(28, 9 + Math.floor(Math.log10(1 + s.lifetimeCash) * 3.5)),
    build: 0,
    buildPct: 0,
  };
  for (const g of GROWTH) {
    if (s.lifetimeCash >= g.at) (t as unknown as Record<string, unknown>)[g.key] = g.value ?? true;
  }
  const cost = ERAS[s.era].evolveCost;
  if (cost) {
    const p = Math.min(1, s.cash / cost);
    t.buildPct = p;
    t.build = p >= 1 ? 5 : p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : p >= 0.1 ? 1 : 0;
  }
  return t;
}

/** things worth announcing when they first appear */
export const ANNOUNCE: { id: string; check: (t: Town) => boolean; emoji: string; text: string }[] = [
  { id: 'tower', check: (t) => t.bellTower, emoji: '🔔', text: 'Your Bell Ringers built a bell tower!' },
  { id: 'kids', check: (t) => t.kids > 0, emoji: '🧒', text: 'Kids are running around shouting your news!' },
  { id: 'posters', check: (t) => t.posters > 0, emoji: '📜', text: 'Your scribes put posters on the houses!' },
  { id: 'tavern', check: (t) => t.tavern, emoji: '🍺', text: 'A tavern opened — gossip everywhere!' },
  { id: 'house4', check: (t) => t.houses >= 4, emoji: '🏠', text: 'New people moved to town to hear your news!' },
  { id: 'laundry', check: (t) => t.laundry, emoji: '👕', text: 'The town feels like home — laundry is out!' },
  { id: 'cat', check: (t) => t.cat, emoji: '🐈', text: 'A cat moved onto the rooftops.' },
  { id: 'fountain', check: (t) => t.fountain, emoji: '⛲', text: 'The town built a fountain in your honor!' },
  { id: 'house5', check: (t) => t.houses >= 5, emoji: '🏘️', text: 'The town is growing!' },
  { id: 'market', check: (t) => t.market, emoji: '🍎', text: 'A market opened in the square!' },
  { id: 'lamps', check: (t) => t.lamps, emoji: '🏮', text: 'Street lamps now light up the night!' },
  { id: 'house6', check: (t) => t.houses >= 6, emoji: '🏘️', text: 'Your town is getting big!' },
  { id: 'castle', check: (t) => t.castle, emoji: '🏰', text: 'The castle on the hill now flies your flag!' },
];
