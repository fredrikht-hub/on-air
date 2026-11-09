import { create } from 'zustand';
import { ERAS } from './eras';
import { STAFF, STAFF_BY_ID, staffCost } from './staff';
import { LEGEND_BY_ID, UPGRADES, UPGRADE_BY_ID, computeMods, type Mods } from './upgrades';
import { advanceArcs, freshArcState, type ArcState } from './stories';

export interface StoryRecord {
  t: number;
  wpm: number;
  acc: number;
  era: number;
}

export interface GameData {
  version: 1;
  cash: number;
  lifetimeCash: number;
  era: number;
  staff: Record<string, number>;
  upgrades: string[];
  backlog: number;
  mood: number;
  combo: number;
  bestCombo: number;
  history: StoryRecord[];
  keyStats: Record<string, { hit: number; miss: number }>;
  totals: { words: number; stories: number; keys: number; correctKeys: number; crits: number; playSeconds: number; bestWpm: number };
  lastSeen: number;
  createdAt: number;
  settings: { sound: boolean };
  /** story on screen — saved so reloading doesn't burn backlog */
  currentStory: { text: string; fresh: boolean; era: number; arc?: ArcRef; ad?: boolean } | null;
  /** UI parts unlocked step by step so new players aren't overwhelmed */
  reveal: { shop: boolean; upgrades: boolean; evolve: boolean };
  introSeen: boolean;
  /** continuing storylines progress */
  arcs: ArcState;
  /** date (YYYY-MM-DD) the weekly progress note was last shown */
  lastWeeklyNote: string;
  /** highest "average WPM" milestone celebrated (multiples of 10) */
  wpmMilestone: number;
  /** last headlines you typed — shown on the town notice board */
  recentHeadlines: string[];
  /** town features the player has already been told about */
  townSeen: string[];
  // ---------- prestige ----------
  /** highest era ever reached (selling the company unlocks after reaching TV) */
  maxEra: number;
  /** ⭐ Fame you can spend on Legend perks */
  fame: number;
  /** every ⭐ ever earned — each one boosts all money forever */
  fameTotal: number;
  /** Legend perks owned (kept forever) */
  legend: string[];
  /** how many times you sold the company (= statues in the Town Square) */
  sales: number;
  /** money earned by companies you already sold */
  pastCash: number;
}

export interface ArcRef { id: string; part: number }
export interface StoryPlan { text: string; arc?: ArcRef; ad?: boolean }
export interface Boost { mult: number; until: number; label: string; emoji: string }

export interface OfflineReport {
  seconds: number;
  cash: number;
  stories: number;
}

export interface WordResult {
  amount: number;
  crit: boolean;
}

interface Actions {
  tick(dt: number): void;
  registerKey(correct: boolean, expected: string): void;
  completeWord(p: { perfect: boolean; liveWpm: number | null; /** the era meter (radio signal / TV ratings), 0–1 */ signal: number; fresh: boolean; extra?: number }): WordResult;
  completeStory(p: { wpm: number; acc: number; perfect: boolean; earned: number; arc?: ArcRef; text?: string }): number;
  takeStory(generate: () => StoryPlan): { text: string; fresh: boolean; arc?: ArcRef; ad?: boolean };
  addCash(amount: number): void;
  setBoost(b: Boost | null): void;
  patch(p: Partial<GameData>): void;
  buyStaff(id: string, qty: number): boolean;
  buyUpgrade(id: string): boolean;
  evolve(): boolean;
  setSound(on: boolean): void;
  dismissOffline(): void;
  hardReset(): void;
  setShout(text: string): void;
  finishIntro(): void;
  addFame(n: number): void;
  buyLegend(id: string): boolean;
  sellCompany(): number;
}

type Store = GameData & Actions & { offline: OfflineReport | null; lastKeyAt: number; shout: string; boost: Boost | null };

const SAVE_KEY = 'onair-save-v1';

export function freshData(): GameData {
  const now = Date.now();
  return {
    version: 1,
    cash: 0,
    lifetimeCash: 0,
    era: 0,
    staff: {},
    upgrades: [],
    backlog: 5,
    mood: 60,
    combo: 0,
    bestCombo: 0,
    history: [],
    keyStats: {},
    totals: { words: 0, stories: 0, keys: 0, correctKeys: 0, crits: 0, playSeconds: 0, bestWpm: 0 },
    lastSeen: now,
    createdAt: now,
    settings: { sound: true },
    currentStory: null,
    reveal: { shop: false, upgrades: false, evolve: false },
    introSeen: false,
    arcs: freshArcState(),
    lastWeeklyNote: '',
    wpmMilestone: 0,
    recentHeadlines: [],
    townSeen: [],
    maxEra: 0,
    fame: 0,
    fameTotal: 0,
    legend: [],
    sales: 0,
    pastCash: 0,
  };
}

function loadData(): GameData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshData();
    const parsed = JSON.parse(raw) as Partial<GameData>;
    const base = freshData();
    const merged = { ...base, ...parsed };
    merged.maxEra = Math.max(merged.maxEra, merged.era);
    return { ...merged, totals: { ...base.totals, ...parsed.totals }, settings: { ...base.settings, ...parsed.settings }, reveal: { ...base.reveal, ...parsed.reveal }, arcs: { ...base.arcs, ...parsed.arcs } };
  } catch {
    return freshData();
  }
}

export function saveData(d: GameData) {
  try {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(freshData()) as (keyof GameData)[]) out[k] = d[k];
    out.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch {
    /* storage unavailable — play continues unsaved */
  }
}

// ---------- derived values (pure) ----------

let modsCache: { key: string; mods: Mods } | null = null;
export function mods(d: Pick<GameData, 'upgrades' | 'legend' | 'fameTotal'>): Mods {
  const key = d.upgrades.join(',') + '|' + d.legend.join(',') + '|' + d.fameTotal;
  if (modsCache?.key !== key) modsCache = { key, mods: computeMods(d.upgrades, d.legend, d.fameTotal) };
  return modsCache.mods;
}

/** ⭐ Fame you get for selling a company that earned this much */
export const fameFor = (lifetimeCash: number) => Math.floor(Math.sqrt(lifetimeCash / 1e9));
export const prestigeUnlocked = (d: Pick<GameData, 'maxEra'>) => d.maxEra >= 3;

/** average WPM of the last N stories (null if too few) */
export function recentAvgWpm(d: Pick<GameData, 'history'>, n = 20): number | null {
  const h = d.history.slice(-n);
  if (h.length < 3) return null;
  return h.reduce((a, r) => a + r.wpm, 0) / h.length;
}

/** staff output scales with your 7-day average WPM */
export function skillFactor(d: Pick<GameData, 'history'>): number {
  const cutoff = Date.now() - 7 * 864e5;
  const h = d.history.filter((r) => r.t >= cutoff);
  if (h.length < 3) return 1;
  const avg = h.reduce((a, r) => a + r.wpm, 0) / h.length;
  return Math.min(4, Math.max(0.5, avg / 40));
}

export function staffRate(d: GameData, id: string): number {
  const def = STAFF_BY_ID[id];
  const m = mods(d);
  return def.baseRate * (m.staffMult[id] ?? 1) * m.allStaffMult * skillFactor(d);
}

export function idleRate(d: GameData): number {
  let total = 0;
  for (const s of STAFF) {
    const n = d.staff[s.id] ?? 0;
    if (n > 0) total += n * staffRate(d, s.id);
  }
  return total;
}

export const comboMult = (combo: number, cap: number) => Math.min(cap, 1 + combo * 0.02);
export const moodMult = (mood: number) => 0.7 + (mood / 100) * 0.8;
export function hotMult(liveWpm: number | null, avg: number | null): number {
  if (liveWpm == null || avg == null || avg <= 0) return 1;
  const ratio = liveWpm / avg;
  return Math.min(2, Math.max(1, 1 + (ratio - 1) * 4));
}
export const signalMult = (signal: number) => 0.8 + signal * 0.6;
export const ratingsMult = (ratings: number) => 0.7 + ratings * 0.8;
/** each era's special meter: radio = rhythm signal, TV and later = viewer ratings */
export const meterMult = (era: number, v: number) => (era === 2 ? signalMult(v) : era >= 3 ? ratingsMult(v) : 1);

export function wordBaseValue(d: GameData): number {
  const m = mods(d);
  return ERAS[d.era].wordBase * m.wordMult + idleRate(d) * m.idleShare;
}

// ---------- store ----------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function initialState(): GameData & { offline: OfflineReport | null } {
  const d = loadData();
  // offline progress
  const elapsed = Math.max(0, (Date.now() - d.lastSeen) / 1000);
  let offline: OfflineReport | null = null;
  if (elapsed > 60) {
    const m = mods(d);
    const secs = Math.min(elapsed, m.offlineHours * 3600);
    const cash = idleRate(d) * secs * 0.5;
    const before = d.backlog;
    d.backlog = Math.min(m.backlogCap, d.backlog + (m.backlogRate * elapsed) / 3600);
    d.cash += cash;
    d.lifetimeCash += cash;
    offline = { seconds: elapsed, cash, stories: Math.floor(d.backlog) - Math.floor(before) };
    if (cash < 1 && offline.stories < 1) offline = null;
  }
  d.lastSeen = Date.now();
  return { ...d, offline };
}

export const useGame = create<Store>()((set, get) => ({
  ...initialState(),
  lastKeyAt: 0,
  shout: '',
  boost: null,

  addCash(amount) {
    const s = get();
    set({ cash: s.cash + amount, lifetimeCash: s.lifetimeCash + amount });
  },

  setBoost(b) {
    set({ boost: b });
  },

  patch(p) {
    set(p);
  },

  setShout(text) {
    if (get().shout !== text) set({ shout: text });
  },

  finishIntro() {
    set({ introSeen: true });
  },

  tick(dt) {
    const s = get();
    const m = mods(s);
    const earn = idleRate(s) * dt;
    const idleFor = (Date.now() - s.lastKeyAt) / 1000;
    let mood = s.mood;
    if (idleFor > 4) mood += (50 - mood) * Math.min(1, dt * 0.05);
    const reveal = s.reveal;
    let nextReveal = reveal;
    if (!reveal.shop && (s.totals.stories >= 1 || s.cash >= 150)) nextReveal = { ...nextReveal, shop: true };
    if (!reveal.upgrades && (s.upgrades.length > 0 || UPGRADES.some((u) => u.era <= s.era && u.cost <= s.cash && !u.needs))) nextReveal = { ...nextReveal, upgrades: true };
    const evoCost = ERAS[s.era].evolveCost;
    if (!reveal.evolve && (s.era > 0 || (evoCost != null && s.cash >= evoCost * 0.2))) nextReveal = { ...nextReveal, evolve: true };
    set({
      reveal: nextReveal,
      cash: s.cash + earn,
      lifetimeCash: s.lifetimeCash + earn,
      backlog: Math.min(m.backlogCap, s.backlog + (m.backlogRate * dt) / 3600),
      mood,
      totals: { ...s.totals, playSeconds: s.totals.playSeconds + dt },
    });
  },

  registerKey(correct, expected) {
    const s = get();
    const k = expected.toLowerCase();
    const prev = s.keyStats[k] ?? { hit: 0, miss: 0 };
    set({
      lastKeyAt: Date.now(),
      keyStats: { ...s.keyStats, [k]: correct ? { hit: prev.hit + 1, miss: prev.miss } : { hit: prev.hit, miss: prev.miss + 1 } },
      totals: { ...s.totals, keys: s.totals.keys + 1, correctKeys: s.totals.correctKeys + (correct ? 1 : 0) },
    });
  },

  completeWord({ perfect, liveWpm, signal, fresh, extra = 1 }) {
    const s = get();
    const m = mods(s);
    const combo = perfect ? s.combo + 1 : 0;
    const crit = perfect && Math.random() < m.critChance;
    let amount =
      wordBaseValue(s) *
      comboMult(combo, m.comboCap) *
      moodMult(s.mood) *
      hotMult(liveWpm, recentAvgWpm(s)) *
      (fresh ? m.freshMult : 1) *
      meterMult(s.era, signal);
    if (crit) amount *= m.critMult;
    amount *= extra;
    if (s.boost && Date.now() < s.boost.until) amount *= s.boost.mult;
    const moodDelta = perfect ? (crit ? 4 : 1.5) * m.moodGain : -7;
    set({
      cash: s.cash + amount,
      lifetimeCash: s.lifetimeCash + amount,
      combo,
      bestCombo: Math.max(s.bestCombo, combo),
      mood: clamp(s.mood + moodDelta, 0, 100),
      totals: { ...s.totals, words: s.totals.words + 1, crits: s.totals.crits + (crit ? 1 : 0) },
    });
    return { amount, crit };
  },

  completeStory({ wpm, acc, perfect, earned, arc, text }) {
    const s = get();
    const bonus = perfect ? earned * 0.25 : 0;
    const history = [...s.history, { t: Date.now(), wpm: Math.round(wpm * 10) / 10, acc: Math.round(acc * 1000) / 1000, era: s.era }];
    if (history.length > 1000) history.splice(0, history.length - 1000);
    set({
      cash: s.cash + bonus,
      lifetimeCash: s.lifetimeCash + bonus,
      history,
      currentStory: null,
      arcs: advanceArcs(s.arcs, arc),
      recentHeadlines: text ? [text, ...s.recentHeadlines].slice(0, 6) : s.recentHeadlines,
      mood: clamp(s.mood + (perfect ? 3 * mods(s).moodGain : 0), 0, 100),
      totals: { ...s.totals, stories: s.totals.stories + 1, bestWpm: Math.max(s.totals.bestWpm, wpm) },
    });
    return bonus;
  },

  takeStory(generate) {
    const s = get();
    if (s.currentStory && s.currentStory.era === s.era) return s.currentStory;
    const plan = generate();
    const fresh = !plan.ad && s.backlog >= 1; // commercials don't use up news
    const story = { ...plan, fresh, era: s.era };
    set({ backlog: fresh ? s.backlog - 1 : s.backlog, currentStory: story });
    return story;
  },

  buyStaff(id, qty) {
    const s = get();
    const def = STAFF_BY_ID[id];
    if (!def || def.era > s.era || qty <= 0) return false;
    const owned = s.staff[id] ?? 0;
    const cost = staffCost(def, owned, qty);
    if (cost > s.cash) return false;
    set({ cash: s.cash - cost, staff: { ...s.staff, [id]: owned + qty } });
    return true;
  },

  buyUpgrade(id) {
    const s = get();
    const u = UPGRADE_BY_ID[id];
    if (!u || s.upgrades.includes(id) || u.era > s.era || u.cost > s.cash) return false;
    if (u.needs && (s.staff[u.needs.staff] ?? 0) < u.needs.count) return false;
    set({ cash: s.cash - u.cost, upgrades: [...s.upgrades, id] });
    return true;
  },

  evolve() {
    const s = get();
    const era = ERAS[s.era];
    const next = ERAS[s.era + 1];
    if (era.evolveCost == null || !next?.playable || s.cash < era.evolveCost) return false;
    set({ cash: s.cash - era.evolveCost, era: s.era + 1, maxEra: Math.max(s.maxEra, s.era + 1), mood: 65, combo: 0, backlog: Math.max(s.backlog, 5) });
    return true;
  },

  addFame(n) {
    const s = get();
    set({ fame: s.fame + n, fameTotal: s.fameTotal + n });
  },

  buyLegend(id) {
    const s = get();
    const l = LEGEND_BY_ID[id];
    if (!l || s.legend.includes(id) || s.fame < l.cost || (l.after && !s.legend.includes(l.after))) return false;
    set({ fame: s.fame - l.cost, legend: [...s.legend, id] });
    return true;
  },

  sellCompany() {
    const s = get();
    const gain = fameFor(s.lifetimeCash);
    if (!prestigeUnlocked(s) || gain < 1) return 0;
    const has = (id: string) => s.legend.includes(id);
    set({
      fame: s.fame + gain,
      fameTotal: s.fameTotal + gain,
      sales: s.sales + 1,
      pastCash: s.pastCash + s.lifetimeCash,
      cash: has('l-start') ? 25_000 : 0,
      lifetimeCash: 0,
      era: has('l-radio') ? 2 : has('l-paper') ? 1 : 0,
      staff: {},
      upgrades: [],
      backlog: 5,
      mood: 60,
      combo: 0,
      currentStory: null,
      boost: null,
    });
    return gain;
  },

  setSound(on) {
    set({ settings: { ...get().settings, sound: on } });
  },

  dismissOffline() {
    set({ offline: null });
  },

  hardReset() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    set({ ...freshData(), offline: null });
  },
}));

// autosave
let saveTimer: number | undefined;
useGame.subscribe(() => {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    saveData(useGame.getState());
  }, 3000);
});
window.addEventListener('beforeunload', () => saveData(useGame.getState()));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveData(useGame.getState());
});
