// Global News era: a world map, cities, and a sunrise that sweeps around the planet.

export type Region = 'nam' | 'europe' | 'sam' | 'africa' | 'wasia' | 'easia' | 'oceania';

export interface City { id: string; name: string; lon: number; lat: number; region: Region }

export const CITIES: City[] = [
  { id: 'la', name: 'Los Angeles', lon: -118, lat: 34, region: 'nam' },
  { id: 'ny', name: 'New York', lon: -74, lat: 41, region: 'nam' },
  { id: 'mex', name: 'Mexico City', lon: -99, lat: 19, region: 'nam' },
  { id: 'lon', name: 'London', lon: 0, lat: 51, region: 'europe' },
  { id: 'par', name: 'Paris', lon: 2, lat: 49, region: 'europe' },
  { id: 'rom', name: 'Rome', lon: 12, lat: 42, region: 'europe' },
  { id: 'mos', name: 'Moscow', lon: 37, lat: 56, region: 'europe' },
  { id: 'rio', name: 'Rio', lon: -43, lat: -23, region: 'sam' },
  { id: 'bue', name: 'Buenos Aires', lon: -58, lat: -34, region: 'sam' },
  { id: 'cai', name: 'Cairo', lon: 31, lat: 30, region: 'africa' },
  { id: 'lag', name: 'Lagos', lon: 3, lat: 6, region: 'africa' },
  { id: 'nai', name: 'Nairobi', lon: 37, lat: -1, region: 'africa' },
  { id: 'dub', name: 'Dubai', lon: 55, lat: 25, region: 'wasia' },
  { id: 'mum', name: 'Mumbai', lon: 73, lat: 19, region: 'wasia' },
  { id: 'bei', name: 'Beijing', lon: 116, lat: 40, region: 'easia' },
  { id: 'tok', name: 'Tokyo', lon: 140, lat: 36, region: 'easia' },
  { id: 'sin', name: 'Singapore', lon: 104, lat: 1, region: 'easia' },
  { id: 'syd', name: 'Sydney', lon: 151, lat: -34, region: 'oceania' },
];
export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<string, City>;

/** regions your satellites reach, unlocked by how much this company has earned */
export const COVERAGE: { region: Region; at: number; name: string; emoji: string }[] = [
  { region: 'nam', at: 0, name: 'North America', emoji: '🗽' },
  { region: 'europe', at: 0, name: 'Europe', emoji: '🗼' },
  { region: 'sam', at: 2e14, name: 'South America', emoji: '🦜' },
  { region: 'africa', at: 8e14, name: 'Africa', emoji: '🦒' },
  { region: 'wasia', at: 3e15, name: 'the Middle East and India', emoji: '🐘' },
  { region: 'easia', at: 1e16, name: 'East Asia', emoji: '🏯' },
  { region: 'oceania', at: 4e16, name: 'Australia', emoji: '🦘' },
];

export function coveredRegions(lifetimeCash: number): Region[] {
  return COVERAGE.filter((c) => lifetimeCash >= c.at).map((c) => c.region);
}
export function coveredCities(lifetimeCash: number): City[] {
  const regs = coveredRegions(lifetimeCash);
  return CITIES.filter((c) => regs.includes(c.region));
}

// ---------- the sunrise ----------
/** seconds for one full day to sweep around the map */
export const DAY_SECONDS = 120;
/** the first part of the day (06:00–09:00) counts as "morning" */
const MORNING = 3 / 24;

export const cityX = (c: City) => (c.lon + 180) / 360;
export const cityY = (c: City) => (90 - c.lat) / 180;

/** map x (0–1) where the sun is rising right now; it moves west */
export function sunriseX(nowMs: number): number {
  const f = (nowMs / 1000 / DAY_SECONDS) % 1;
  return 1 - f;
}
/** 0–1: how far through its day a city is, counted from sunrise */
export function dayPhase(c: City, nowMs: number): number {
  return (((cityX(c) - sunriseX(nowMs)) % 1) + 1) % 1;
}
export function cityClock(c: City, nowMs: number): string {
  const h = (6 + dayPhase(c, nowMs) * 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60 / 15) * 15;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
export const isMorning = (c: City, nowMs: number) => dayPhase(c, nowMs) < MORNING;
export function secondsToSunrise(c: City, nowMs: number): number {
  const p = dayPhase(c, nowMs);
  return p < MORNING ? 0 : (1 - p) * DAY_SECONDS;
}

/** pick a city for a story: half the time one where the sun is about to rise */
export function pickCity(lifetimeCash: number, nowMs = Date.now()): City {
  const list = coveredCities(lifetimeCash);
  if (Math.random() < 0.5) {
    const soon = list.slice().sort((a, b) => secondsToSunrise(a, nowMs + 12000) - secondsToSunrise(b, nowMs + 12000))[0];
    if (soon) return soon;
  }
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- low-res world map: [row, fromCol, toCol] land spans on a 48×20 grid ----------
export const MAP_COLS = 48;
export const MAP_ROWS = 20;
export const LAND: [number, number, number][] = [
  [1, 6, 12], [1, 17, 21],
  [2, 2, 15], [2, 17, 21], [2, 25, 27], [2, 28, 46],
  [3, 2, 15], [3, 19, 20], [3, 23, 23], [3, 24, 44],
  [4, 5, 15], [4, 23, 42],
  [5, 6, 14], [5, 23, 27], [5, 28, 41], [5, 42, 42],
  [6, 7, 12], [6, 22, 34], [6, 35, 40], [6, 42, 42],
  [7, 8, 11], [7, 22, 31], [7, 33, 38],
  [8, 10, 11], [8, 22, 29], [8, 33, 34], [8, 37, 38], [8, 40, 40],
  [9, 12, 16], [9, 24, 30], [9, 38, 41],
  [10, 12, 18], [10, 25, 29], [10, 37, 43],
  [11, 13, 18], [11, 25, 29], [11, 30, 30], [11, 39, 43],
  [12, 14, 18], [12, 26, 29], [12, 38, 44],
  [13, 14, 17], [13, 26, 28], [13, 38, 44],
  [14, 14, 16], [14, 42, 43], [14, 46, 46],
  [15, 14, 15],
  [19, 3, 44],
];

export function regionOf(row: number, col: number): Region | null {
  if (row >= 18) return null; // Antarctica
  if (row >= 11 && col >= 36) return 'oceania';
  if (col <= 21 && row <= 8) return 'nam';
  if (col <= 21) return 'sam';
  if (col >= 35) return 'easia';
  if (row <= 5 && col <= 29) return 'europe';
  if (row >= 6 && col <= 29) return 'africa';
  return 'wasia';
}
