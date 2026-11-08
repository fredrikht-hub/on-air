import { ERAS } from '../game/eras';
import type { GameData } from '../game/state';

/** Everything the Radio scene shows — derived only from your progress. */
export interface Radio {
  djs: number;
  engineers: number;
  fieldReporters: number;
  bigMic: boolean;
  padded: boolean;
  doubleDeck: boolean;
  hotline: boolean;
  celebrity: boolean;
  reruns: boolean;
  mixer: boolean;
  bigAntenna: boolean;
  truck: boolean;
  megaTower: boolean;
  antennas: boolean;
  car: boolean;
  streetlights: boolean;
  billboard: boolean;
  zeppelin: boolean;
  skyscraper: boolean;
  neon: boolean;
  crowd: number;
  build: number;
  buildPct: number;
}

const GROWTH: { at: number; key: keyof Radio }[] = [
  { at: 30_000_000, key: 'antennas' },
  { at: 80_000_000, key: 'car' },
  { at: 200_000_000, key: 'streetlights' },
  { at: 500_000_000, key: 'billboard' },
  { at: 1_500_000_000, key: 'zeppelin' },
  { at: 5_000_000_000, key: 'skyscraper' },
  { at: 15_000_000_000, key: 'neon' },
];

export function radioFrom(s: GameData): Radio {
  const has = (u: string) => s.upgrades.includes(u);
  const r: Radio = {
    djs: Math.min(2, s.staff.dj ?? 0),
    engineers: Math.min(1, s.staff.engineer ?? 0),
    fieldReporters: Math.min(2, s.staff.field ?? 0),
    bigMic: has('mic'),
    padded: has('wavelength'),
    doubleDeck: has('turntables'),
    hotline: has('wire'),
    celebrity: has('golden'),
    reruns: has('reruns'),
    mixer: has('booth'),
    bigAntenna: has('syndication'),
    truck: has('truck'),
    megaTower: has('prime'),
    antennas: false, car: false, streetlights: false, billboard: false, zeppelin: false, skyscraper: false, neon: false,
    crowd: Math.min(24, 6 + Math.floor(Math.log10(1 + s.lifetimeCash) * 1.6)),
    build: 0,
    buildPct: 0,
  };
  for (const g of GROWTH) if (s.lifetimeCash >= g.at) (r as unknown as Record<string, unknown>)[g.key] = true;
  const cost = ERAS[s.era].evolveCost;
  if (cost) {
    const p = Math.min(1, s.cash / cost);
    r.buildPct = p;
    r.build = p >= 1 ? 5 : p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : p >= 0.1 ? 1 : 0;
  }
  return r;
}

export const RADIO_ANNOUNCE: { id: string; check: (r: Radio) => boolean; emoji: string; text: string }[] = [
  { id: 'r-dj', check: (r) => r.djs > 0, emoji: '🎧', text: 'A DJ is spinning records in your studio!' },
  { id: 'r-eng', check: (r) => r.engineers > 0, emoji: '🎛️', text: 'A sound engineer took over the control room!' },
  { id: 'r-field', check: (r) => r.fieldReporters > 0, emoji: '🎙️', text: 'Field reporters are broadcasting from the streets!' },
  { id: 'r-antennas', check: (r) => r.antennas, emoji: '📡', text: 'Every house now has a radio antenna!' },
  { id: 'r-car', check: (r) => r.car, emoji: '🚗', text: 'People drive by just to see your station!' },
  { id: 'r-lights', check: (r) => r.streetlights, emoji: '💡', text: 'Electric streetlights arrived!' },
  { id: 'r-billboard', check: (r) => r.billboard, emoji: '🪧', text: 'A giant TUNE IN billboard went up!' },
  { id: 'r-zeppelin', check: (r) => r.zeppelin, emoji: '🎈', text: 'A zeppelin floats over the country with your name on it!' },
  { id: 'r-sky', check: (r) => r.skyscraper, emoji: '🏙️', text: 'Art deco skyscrapers rise on the horizon!' },
  { id: 'r-neon', check: (r) => r.neon, emoji: '✨', text: 'Your station now has a glowing neon sign!' },
];
