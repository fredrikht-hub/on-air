import { ERAS } from '../game/eras';
import type { GameData } from '../game/state';

/** Everything the TV scene shows — derived only from your progress. */
export interface TV {
  cameras: number;
  forecaster: boolean;
  makeup: boolean;
  producer: boolean;
  color: boolean;
  prompter: boolean;
  heli: boolean;
  hidden: boolean;
  radar: boolean;
  prime: boolean;
  interview: boolean;
  allNight: boolean;
  satellite: boolean;
  famous: boolean;
  antennas: boolean;
  car: boolean;
  diner: boolean;
  driveIn: boolean;
  skyline: boolean;
  searchlights: boolean;
  crowd: number;
  build: number;
  buildPct: number;
}

const GROWTH: { at: number; key: keyof TV }[] = [
  { at: 80_000_000_000, key: 'antennas' },
  { at: 250_000_000_000, key: 'car' },
  { at: 700_000_000_000, key: 'diner' },
  { at: 2_000_000_000_000, key: 'driveIn' },
  { at: 6_000_000_000_000, key: 'skyline' },
  { at: 20_000_000_000_000, key: 'searchlights' },
];

export function tvFrom(s: GameData): TV {
  const has = (u: string) => s.upgrades.includes(u);
  const t: TV = {
    cameras: Math.min(2, s.staff.camera ?? 0),
    forecaster: (s.staff.weather ?? 0) > 0,
    makeup: (s.staff.makeup ?? 0) > 0,
    producer: (s.staff.producer ?? 0) > 0,
    color: has('tv-color'),
    prompter: has('tv-prompter'),
    heli: has('tv-heli'),
    hidden: has('tv-hidden'),
    radar: has('tv-radar'),
    prime: has('tv-prime'),
    interview: has('tv-interview'),
    allNight: has('tv-allnight'),
    satellite: has('tv-satellite'),
    famous: has('tv-famous'),
    antennas: false, car: false, diner: false, driveIn: false, skyline: false, searchlights: false,
    crowd: Math.min(24, 6 + Math.floor(Math.log10(1 + s.lifetimeCash) * 1.4)),
    build: 0,
    buildPct: 0,
  };
  for (const g of GROWTH) if (s.lifetimeCash >= g.at) (t as unknown as Record<string, unknown>)[g.key] = true;
  const cost = ERAS[s.era].evolveCost;
  if (cost) {
    const p = Math.min(1, s.cash / cost);
    t.buildPct = p;
    t.build = p >= 1 ? 5 : p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : p >= 0.1 ? 1 : 0;
  }
  return t;
}

export const TV_ANNOUNCE: { id: string; check: (t: TV) => boolean; emoji: string; text: string }[] = [
  { id: 't-cam', check: (t) => t.cameras > 0, emoji: '🎥', text: 'A camera operator is filming you!' },
  { id: 't-weather', check: (t) => t.forecaster, emoji: '🌦️', text: 'Your weather forecaster is pointing at clouds!' },
  { id: 't-makeup', check: (t) => t.makeup, emoji: '💄', text: 'A makeup artist powders your nose between stories!' },
  { id: 't-producer', check: (t) => t.producer, emoji: '📋', text: 'A producer now runs the show with a clipboard!' },
  { id: 't-antennas', check: (t) => t.antennas, emoji: '📺', text: 'Every house now has a TV antenna on the roof!' },
  { id: 't-car', check: (t) => t.car, emoji: '🚙', text: 'Shiny new cars cruise past your studio!' },
  { id: 't-diner', check: (t) => t.diner, emoji: '🍔', text: 'A diner opened — they keep your show on all day!' },
  { id: 't-drivein', check: (t) => t.driveIn, emoji: '🎬', text: 'The drive-in theater shows YOUR face on the big screen!' },
  { id: 't-skyline', check: (t) => t.skyline, emoji: '🏙️', text: 'Glass towers rise over the city!' },
  { id: 't-search', check: (t) => t.searchlights, emoji: '🔦', text: 'Searchlights sweep the sky every night — you are a star!' },
];
