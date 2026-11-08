import { ERAS } from '../game/eras';
import type { GameData } from '../game/state';

/** Everything the Newspaper scene ("Printing Row") shows — derived only from your progress. */
export interface City {
  typesetters: number;
  paperboys: number;
  copywriters: number;
  reporters: number;
  banner: boolean;
  fastPress: boolean;
  telegraph: boolean;
  bikes: boolean;
  colorInk: boolean;
  detective: boolean;
  photographer: boolean;
  nightPress: boolean;
  mailbox: boolean;
  newsstand: boolean;
  gaslamps: boolean;
  carriage: boolean;
  clocktower: boolean;
  tram: boolean;
  factory: boolean;
  tall: boolean;
  balloon: boolean;
  crowd: number;
  build: number;
  buildPct: number;
}

const GROWTH: { at: number; key: keyof City }[] = [
  { at: 60_000, key: 'newsstand' },
  { at: 150_000, key: 'gaslamps' },
  { at: 300_000, key: 'carriage' },
  { at: 700_000, key: 'clocktower' },
  { at: 1_500_000, key: 'tram' },
  { at: 3_000_000, key: 'factory' },
  { at: 6_000_000, key: 'tall' },
  { at: 11_000_000, key: 'balloon' },
];

export function cityFrom(s: GameData): City {
  const has = (u: string) => s.upgrades.includes(u);
  const c: City = {
    typesetters: Math.min(2, s.staff.typesetter ?? 0),
    paperboys: Math.min(4, s.staff.paperboy ?? 0),
    copywriters: Math.min(2, s.staff.copywriter ?? 0),
    reporters: Math.min(3, s.staff.reporter ?? 0),
    banner: has('bold'),
    fastPress: has('coffee'),
    telegraph: has('morning'),
    bikes: has('bikes'),
    colorInk: has('colorink'),
    detective: has('instinct'),
    photographer: has('ink'),
    nightPress: has('nightpress'),
    mailbox: has('approval'),
    newsstand: false, gaslamps: false, carriage: false, clocktower: false, tram: false, factory: false, tall: false, balloon: false,
    crowd: Math.min(30, 8 + Math.floor(Math.log10(1 + s.lifetimeCash) * 2.6)),
    build: 0,
    buildPct: 0,
  };
  for (const g of GROWTH) if (s.lifetimeCash >= g.at) (c as unknown as Record<string, unknown>)[g.key] = true;
  const cost = ERAS[s.era].evolveCost;
  if (cost) {
    const p = Math.min(1, s.cash / cost);
    c.buildPct = p;
    c.build = p >= 1 ? 5 : p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : p >= 0.1 ? 1 : 0;
  }
  return c;
}

export const CITY_ANNOUNCE: { id: string; check: (c: City) => boolean; emoji: string; text: string }[] = [
  { id: 'c-typesetters', check: (c) => c.typesetters > 0, emoji: '🔠', text: 'Typesetters are working in the upstairs windows!' },
  { id: 'c-paperboys', check: (c) => c.paperboys > 0, emoji: '📰', text: 'Paperboys are running the streets with your paper!' },
  { id: 'c-copywriters', check: (c) => c.copywriters > 0, emoji: '✍️', text: 'Copywriters moved into the office upstairs!' },
  { id: 'c-reporters', check: (c) => c.reporters > 0, emoji: '🕵️', text: 'Reporters are out hunting for stories!' },
  { id: 'c-newsstand', check: (c) => c.newsstand, emoji: '🏪', text: 'A newsstand opened on the corner!' },
  { id: 'c-gaslamps', check: (c) => c.gaslamps, emoji: '🏮', text: 'Gas lamps now light up Printing Row!' },
  { id: 'c-carriage', check: (c) => c.carriage, emoji: '🐴', text: 'Horse carriages come to buy your paper!' },
  { id: 'c-clocktower', check: (c) => c.clocktower, emoji: '🕰️', text: 'The city built a clock tower!' },
  { id: 'c-tram', check: (c) => c.tram, emoji: '🚋', text: 'A tram line now runs past your office!' },
  { id: 'c-factory', check: (c) => c.factory, emoji: '🏭', text: 'Factories are popping up — the city is booming!' },
  { id: 'c-tall', check: (c) => c.tall, emoji: '🏙️', text: 'The first tall buildings rise over the city!' },
  { id: 'c-balloon', check: (c) => c.balloon, emoji: '🎈', text: 'A hot-air balloon now advertises your paper!' },
];
