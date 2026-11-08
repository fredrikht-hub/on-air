import { ERAS } from './eras';
import { money, mult } from './format';
import { sfx } from './sound';
import { STAFF, STAFF_BY_ID, staffCost } from './staff';
import { idleRate, mods, staffRate, useGame, wordBaseValue, type GameData } from './state';
import { UPGRADES, UPGRADE_BY_ID } from './upgrades';

// ---------- toast bus ----------
export interface Toast { id: number; emoji: string; title: string; lines: string[]; big?: boolean }
type Listener = (t: Toast) => void;
const listeners = new Set<Listener>();
let toastId = 0;
export function onToast(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function toast(t: Omit<Toast, 'id'>) {
  const full = { ...t, id: ++toastId };
  listeners.forEach((l) => l(full));
}

// ---------- before/after snapshots ----------
function snapshot(s: GameData) {
  const m = mods(s);
  return {
    word: wordBaseValue(s),
    idle: idleRate(s),
    comboCap: m.comboCap,
    crit: m.critChance,
    critMult: m.critMult,
    backlog: m.backlogCap,
    fresh: m.freshMult,
    offline: m.offlineHours,
    mood: m.moodGain,
  };
}

function diffLines(a: ReturnType<typeof snapshot>, b: ReturnType<typeof snapshot>): string[] {
  const out: string[] = [];
  const changed = (x: number, y: number) => Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x));
  if (changed(a.word, b.word)) out.push(`Each word: ${money(a.word)} → ${money(b.word)}`);
  if (changed(a.idle, b.idle)) out.push(`Staff income: ${money(a.idle)}/s → ${money(b.idle)}/s`);
  if (changed(a.comboCap, b.comboCap)) out.push(`Max combo: ${mult(a.comboCap)} → ${mult(b.comboCap)}`);
  if (changed(a.crit, b.crit)) out.push(`Crit chance: ${Math.round(a.crit * 100)}% → ${Math.round(b.crit * 100)}%`);
  if (changed(a.critMult, b.critMult)) out.push(`Crits pay: ${mult(a.critMult)} → ${mult(b.critMult)}`);
  if (changed(a.backlog, b.backlog)) out.push(`Backlog holds: ${a.backlog} → ${b.backlog} stories`);
  if (changed(a.fresh, b.fresh)) out.push(`Fresh stories: ${mult(a.fresh)} → ${mult(b.fresh)}`);
  if (changed(a.offline, b.offline)) out.push(`Offline earnings: ${a.offline}h → ${b.offline}h`);
  if (changed(a.mood, b.mood)) out.push(`Mood rises ${mult(b.mood / a.mood)} faster`);
  return out;
}

/** what buying this upgrade would change, e.g. "Each word: $31 → $93" */
export function previewUpgrade(s: GameData, id: string): string[] {
  return diffLines(snapshot(s), snapshot({ ...s, upgrades: [...s.upgrades, id] }));
}

export function buyUpgrade(id: string): boolean {
  const before = snapshot(useGame.getState());
  if (!useGame.getState().buyUpgrade(id)) {
    sfx.deny();
    return false;
  }
  const u = UPGRADE_BY_ID[id];
  sfx.buy();
  toast({ emoji: u.emoji, title: u.name + '!', lines: diffLines(before, snapshot(useGame.getState())), big: true });
  return true;
}

export function buyStaff(id: string, qty: number): boolean {
  const before = snapshot(useGame.getState());
  if (!useGame.getState().buyStaff(id, qty)) {
    sfx.deny();
    return false;
  }
  const d = STAFF_BY_ID[id];
  sfx.buy();
  const owned = useGame.getState().staff[id] ?? 0;
  toast({ emoji: d.emoji, title: `${qty > 1 ? qty + ' × ' : ''}${d.name} hired! (${owned} total)`, lines: diffLines(before, snapshot(useGame.getState())) });
  return true;
}

export function evolve(): boolean {
  if (!useGame.getState().evolve()) {
    sfx.deny();
    return false;
  }
  sfx.evolve();
  return true;
}

// ---------- "what should I buy next?" ----------
export interface Suggestion {
  kind: 'upgrade' | 'staff' | 'evolve';
  id: string;
  emoji: string;
  name: string;
  cost: number;
  detail: string;
  affordable: boolean;
}

export function suggest(s: GameData): Suggestion | null {
  const era = ERAS[s.era];
  const next = ERAS[s.era + 1];
  if (era.evolveCost != null && next?.playable && s.cash >= era.evolveCost) {
    return { kind: 'evolve', id: next.id, emoji: '🧬', name: `Evolve to ${next.name}`, cost: era.evolveCost, detail: 'A whole new era!', affordable: true };
  }

  const ups = UPGRADES.filter((u) => u.era <= s.era && !s.upgrades.includes(u.id) && (!u.needs || (s.staff[u.needs.staff] ?? 0) >= u.needs.count)).sort((a, b) => a.cost - b.cost);
  const staffOptions = STAFF.filter((d) => d.era <= s.era).map((d) => {
    const cost = staffCost(d, s.staff[d.id] ?? 0, 1);
    return { d, cost, value: staffRate(s, d.id) / cost };
  });

  const upAff = ups.find((u) => u.cost <= s.cash);
  if (upAff) return { kind: 'upgrade', id: upAff.id, emoji: upAff.emoji, name: upAff.name, cost: upAff.cost, detail: upAff.desc, affordable: true };

  const affStaff = staffOptions.filter((o) => o.cost <= s.cash).sort((a, b) => b.value - a.value)[0];
  if (affStaff) {
    return { kind: 'staff', id: affStaff.d.id, emoji: affStaff.d.emoji, name: `Hire ${affStaff.d.name}`, cost: affStaff.cost, detail: `+${money(staffRate(s, affStaff.d.id))}/s, even while you're away`, affordable: true };
  }

  // nothing affordable: show the nearest goal
  const goals: Suggestion[] = [];
  if (ups[0]) goals.push({ kind: 'upgrade', id: ups[0].id, emoji: ups[0].emoji, name: ups[0].name, cost: ups[0].cost, detail: ups[0].desc, affordable: false });
  const cheapStaff = [...staffOptions].sort((a, b) => a.cost - b.cost)[0];
  if (cheapStaff) goals.push({ kind: 'staff', id: cheapStaff.d.id, emoji: cheapStaff.d.emoji, name: `Hire ${cheapStaff.d.name}`, cost: cheapStaff.cost, detail: `+${money(staffRate(s, cheapStaff.d.id))}/s`, affordable: false });
  goals.sort((a, b) => a.cost - b.cost);
  return goals[0] ?? null;
}

export function buySuggestion(sg: Suggestion): boolean {
  if (sg.kind === 'evolve') return evolve();
  if (sg.kind === 'upgrade') return buyUpgrade(sg.id);
  return buyStaff(sg.id, 1);
}
