export interface Mods {
  wordMult: number;
  allStaffMult: number;
  staffMult: Record<string, number>;
  comboCap: number;
  critChance: number;
  critMult: number;
  /** seconds of idle income added to every typed word */
  idleShare: number;
  backlogCap: number;
  /** stories per hour */
  backlogRate: number;
  freshMult: number;
  offlineHours: number;
  moodGain: number;
  /** Global News: words from a city where the sun is rising pay this much */
  sunriseMult: number;
}

export const BASE_MODS: Mods = {
  wordMult: 1,
  allStaffMult: 1,
  staffMult: {},
  comboCap: 1.5,
  critChance: 0.03,
  critMult: 5,
  idleShare: 0.5,
  backlogCap: 15,
  backlogRate: 4,
  freshMult: 2,
  offlineHours: 2,
  moodGain: 1,
  sunriseMult: 2,
};

export type Effect =
  | { kind: 'wordMult'; x: number }
  | { kind: 'allStaff'; x: number }
  | { kind: 'staff'; id: string; x: number }
  | { kind: 'comboCap'; add: number }
  | { kind: 'critChance'; add: number }
  | { kind: 'critMult'; add: number }
  | { kind: 'idleShare'; add: number }
  | { kind: 'backlog'; cap: number; rateX: number }
  | { kind: 'fresh'; add: number }
  | { kind: 'offline'; hours: number }
  | { kind: 'mood'; x: number }
  | { kind: 'sunrise'; add: number };

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  era: number;
  cost: number;
  desc: string;
  /** staff requirement: need N of staff id */
  needs?: { staff: string; count: number };
  effect: Effect;
}

export const UPGRADES: UpgradeDef[] = [
  // --- Town Square ---
  { id: 'bell1', name: 'Bigger Bell', emoji: '🔔', era: 0, cost: 300, desc: 'A bigger bell — the whole town comes to listen!', effect: { kind: 'wordMult', x: 3 } },
  { id: 'lungs', name: 'Lung Training', emoji: '🫁', era: 0, cost: 2_500, desc: 'Deep breaths — you can shout longer without stopping.', effect: { kind: 'comboCap', add: 0.5 } },
  { id: 'gloves', name: 'Ringer Gloves', emoji: '🧤', era: 0, cost: 4_000, desc: 'Warm gloves — your Bell Ringers ring twice as hard.', needs: { staff: 'bell', count: 5 }, effect: { kind: 'staff', id: 'bell', x: 2 } },
  { id: 'gossip', name: 'Tavern Rumors', emoji: '🍺', era: 0, cost: 6_000, desc: 'Everyone talks at the tavern — more news piles up for you.', effect: { kind: 'backlog', cap: 10, rateX: 1.5 } },
  { id: 'horseshoe', name: 'Nosy Neighbor', emoji: '👀', era: 0, cost: 9_000, desc: 'She sees EVERYTHING. More juicy secret words that pay 5×.', effect: { kind: 'critChance', add: 0.03 } },
  { id: 'watchman', name: 'Night Watchman', emoji: '🏮', era: 0, cost: 12_000, desc: 'He shouts the news at night while you sleep.', effect: { kind: 'offline', hours: 2 } },
  { id: 'robes', name: 'Kid Lunchboxes', emoji: '🥪', era: 0, cost: 15_000, desc: 'Well-fed kids shout twice as loud.', needs: { staff: 'apprentice', count: 5 }, effect: { kind: 'staff', id: 'apprentice', x: 2 } },
  { id: 'megaphone', name: 'Megaphone', emoji: '📣', era: 0, cost: 22_000, desc: 'Now even the next town can hear you!', effect: { kind: 'wordMult', x: 2 } },
  { id: 'quills', name: 'Sharper Quills', emoji: '🪶', era: 0, cost: 28_000, desc: 'Town Scribes write signs twice as fast.', needs: { staff: 'scribe', count: 5 }, effect: { kind: 'staff', id: 'scribe', x: 2 } },

  // --- Newspaper ---
  { id: 'bold', name: 'Bigger Headlines', emoji: '🗞️', era: 1, cost: 50_000, desc: 'HUGE letters — nobody can walk past your paper.', effect: { kind: 'wordMult', x: 2 } },
  { id: 'coffee', name: 'Faster Printing Press', emoji: '⚙️', era: 1, cost: 200_000, desc: 'A steam engine — Typesetters print twice as fast.', needs: { staff: 'typesetter', count: 5 }, effect: { kind: 'staff', id: 'typesetter', x: 2 } },
  { id: 'morning', name: 'Telegraph Machine', emoji: '📠', era: 1, cost: 400_000, desc: 'News arrives by wire, piping hot — fresh news pays more.', effect: { kind: 'fresh', add: 1 } },
  { id: 'bikes', name: 'Paperboy Bicycles', emoji: '🚲', era: 1, cost: 900_000, desc: 'Paperboys sell twice as many papers.', needs: { staff: 'paperboy', count: 5 }, effect: { kind: 'staff', id: 'paperboy', x: 2 } },
  { id: 'colorink', name: 'Color Ink', emoji: '🎨', era: 1, cost: 1_200_000, desc: 'Colorful pages — everybody wants a copy!', effect: { kind: 'wordMult', x: 2 } },
  { id: 'instinct', name: 'Exclusive Scoop', emoji: '🕵️', era: 1, cost: 1_500_000, desc: 'Nobody else has this story! Secret words pay 8× instead of 5×.', effect: { kind: 'critMult', add: 3 } },
  { id: 'ink', name: 'Front Page Photos', emoji: '📷', era: 1, cost: 2_500_000, desc: "Photos sell papers — each word also earns some of your helpers' money.", effect: { kind: 'idleShare', add: 0.5 } },
  { id: 'nightpress', name: 'Night Shift Press', emoji: '🌙', era: 1, cost: 3_000_000, desc: 'The press runs all night — helpers earn longer while you sleep.', effect: { kind: 'offline', hours: 4 } },
  { id: 'rhyme', name: 'Rhyming Dictionary', emoji: '📖', era: 1, cost: 4_000_000, desc: 'Copywriters write catchy lines twice as fast.', needs: { staff: 'copywriter', count: 5 }, effect: { kind: 'staff', id: 'copywriter', x: 2 } },
  { id: 'approval', name: 'Fan Letters', emoji: '💌', era: 1, cost: 5_000_000, desc: 'Readers love you — they start cheering faster.', effect: { kind: 'mood', x: 1.5 } },
  { id: 'notebooks', name: 'Reporter Notebooks', emoji: '📓', era: 1, cost: 8_000_000, desc: 'Junior Reporters find twice as many stories.', needs: { staff: 'reporter', count: 5 }, effect: { kind: 'staff', id: 'reporter', x: 2 } },

  // --- Radio ---
  { id: 'mic', name: 'Studio Microphone', emoji: '🎤', era: 2, cost: 20_000_000, desc: 'Crystal clear sound — every home can hear you!', effect: { kind: 'wordMult', x: 3 } },
  { id: 'wavelength', name: 'Soundproof Booth', emoji: '🚪', era: 2, cost: 50_000_000, desc: 'No noise, no distractions — keep your combo going longer.', effect: { kind: 'comboCap', add: 0.5 } },
  { id: 'turntables', name: 'DJ Turntables', emoji: '💿', era: 2, cost: 80_000_000, desc: 'Radio DJs play twice the hits.', needs: { staff: 'dj', count: 5 }, effect: { kind: 'staff', id: 'dj', x: 2 } },
  { id: 'wire', name: 'Listener Hotline', emoji: '☎️', era: 2, cost: 150_000_000, desc: 'Listeners call in with news — lots more piles up for you.', effect: { kind: 'backlog', cap: 20, rateX: 2 } },
  { id: 'golden', name: 'Celebrity Interview', emoji: '🌟', era: 2, cost: 400_000_000, desc: 'Famous guests bring more secret words that pay big.', effect: { kind: 'critChance', add: 0.04 } },
  { id: 'reruns', name: 'Late Night Reruns', emoji: '🌜', era: 2, cost: 600_000_000, desc: 'Old shows play all night — helpers earn longer while you sleep.', effect: { kind: 'offline', hours: 6 } },
  { id: 'booth', name: 'Sound Mixer', emoji: '🎛️', era: 2, cost: 800_000_000, desc: 'Sound Engineers make everything sound twice as good.', needs: { staff: 'engineer', count: 5 }, effect: { kind: 'staff', id: 'engineer', x: 2 } },
  { id: 'syndication', name: 'Bigger Antenna', emoji: '📡', era: 2, cost: 2_000_000_000, desc: 'The whole country can listen — ALL helpers earn 2×.', effect: { kind: 'allStaff', x: 2 } },
  { id: 'truck', name: 'Remote Truck', emoji: '🚚', era: 2, cost: 5_000_000_000, desc: 'Field Reporters drive to every story twice as fast.', needs: { staff: 'field', count: 5 }, effect: { kind: 'staff', id: 'field', x: 2 } },
  { id: 'prime', name: 'Radio Tower', emoji: '🗼', era: 2, cost: 10_000_000_000, desc: "Your signal reaches every home — each word also earns more of your helpers' money.", effect: { kind: 'idleShare', add: 1 } },

  // --- TV ---
  { id: 'tv-color', name: 'Color Cameras', emoji: '🌈', era: 3, cost: 12_000_000_000, desc: 'No more black and white — everyone wants to watch you in color!', effect: { kind: 'wordMult', x: 3 } },
  { id: 'tv-prompter', name: 'Teleprompter', emoji: '📜', era: 3, cost: 30_000_000_000, desc: 'Read the news right off a screen — keep your combo going longer.', effect: { kind: 'comboCap', add: 0.5 } },
  { id: 'tv-tripod', name: 'Rolling Tripods', emoji: '🎥', era: 3, cost: 50_000_000_000, desc: 'Camera Operators film twice as much.', needs: { staff: 'camera', count: 5 }, effect: { kind: 'staff', id: 'camera', x: 2 } },
  { id: 'tv-heli', name: 'News Helicopter', emoji: '🚁', era: 3, cost: 100_000_000_000, desc: 'Fly over every story — lots more news piles up for you.', effect: { kind: 'backlog', cap: 25, rateX: 2 } },
  { id: 'tv-hidden', name: 'Hidden Camera', emoji: '🕶️', era: 3, cost: 250_000_000_000, desc: 'Catch secrets on film — more secret words that pay big.', effect: { kind: 'critChance', add: 0.04 } },
  { id: 'tv-radar', name: 'Weather Radar', emoji: '🌀', era: 3, cost: 400_000_000_000, desc: 'Weather Forecasters are right twice as often.', needs: { staff: 'weather', count: 5 }, effect: { kind: 'staff', id: 'weather', x: 2 } },
  { id: 'tv-prime', name: 'Prime Time Slot', emoji: '🕗', era: 3, cost: 600_000_000_000, desc: 'Your show at 8 o’clock — viewers start cheering faster.', effect: { kind: 'mood', x: 1.5 } },
  { id: 'tv-interview', name: 'Exclusive Interview', emoji: '🎤', era: 3, cost: 1_500_000_000_000, desc: 'Big stars only talk to you — secret words pay even more.', effect: { kind: 'critMult', add: 3 } },
  { id: 'tv-allnight', name: '24-Hour Studio', emoji: '🌙', era: 3, cost: 2_000_000_000_000, desc: 'The studio never closes — helpers earn longer while you sleep.', effect: { kind: 'offline', hours: 8 } },
  { id: 'tv-hairspray', name: 'Super Hairspray', emoji: '💇', era: 3, cost: 3_000_000_000_000, desc: 'Makeup Artists work twice as fast. Not one hair moves!', needs: { staff: 'makeup', count: 5 }, effect: { kind: 'staff', id: 'makeup', x: 2 } },
  { id: 'tv-satellite', name: 'Satellite Dish', emoji: '📡', era: 3, cost: 8_000_000_000_000, desc: 'Beam your show across the ocean — ALL helpers earn 2×.', effect: { kind: 'allStaff', x: 2 } },
  { id: 'tv-budget', name: 'Big Budget', emoji: '💼', era: 3, cost: 20_000_000_000_000, desc: 'TV Producers make twice the shows.', needs: { staff: 'producer', count: 5 }, effect: { kind: 'staff', id: 'producer', x: 2 } },
  { id: 'tv-famous', name: 'Famous Face', emoji: '😎', era: 3, cost: 35_000_000_000_000, desc: "Everybody knows your face — each word also earns more of your helpers' money.", effect: { kind: 'idleShare', add: 1 } },

  // --- Global News ---
  { id: 'g-rocket', name: 'Launch Another Satellite', emoji: '🚀', era: 4, cost: 150_000_000_000_000, desc: 'A second satellite — twice the planet can see you! Words earn 3×.', effect: { kind: 'wordMult', x: 3 } },
  { id: 'g-phone', name: 'Satellite Phone', emoji: '☎️', era: 4, cost: 300_000_000_000_000, desc: 'Call anyone, anywhere — keep your combo going longer.', effect: { kind: 'comboCap', add: 0.5 } },
  { id: 'g-passport', name: 'Golden Passports', emoji: '🛂', era: 4, cost: 500_000_000_000_000, desc: 'Foreign Correspondents skip every line at the airport — 2× stories.', needs: { staff: 'correspondent', count: 5 }, effect: { kind: 'staff', id: 'correspondent', x: 2 } },
  { id: 'g-ticker', name: 'World News Ticker', emoji: '📜', era: 4, cost: 1_000_000_000_000_000, desc: 'Headlines from everywhere — lots more news piles up for you.', effect: { kind: 'backlog', cap: 30, rateX: 2 } },
  { id: 'g-alarm', name: 'Sunrise Alarm Clock', emoji: '⏰', era: 4, cost: 1_800_000_000_000_000, desc: 'Wake the whole world up — sunrise news pays 3× instead of 2×.', effect: { kind: 'sunrise', add: 1 } },
  { id: 'g-fans', name: 'Fan Mail From Everywhere', emoji: '💌', era: 4, cost: 2_500_000_000_000_000, desc: 'Letters in 100 languages — viewers cheer faster.', effect: { kind: 'mood', x: 1.5 } },
  { id: 'g-dictionary', name: 'Universal Dictionary', emoji: '📚', era: 4, cost: 4_000_000_000_000_000, desc: 'Translators know EVERY word — 2× faster.', needs: { staff: 'translator', count: 5 }, effect: { kind: 'staff', id: 'translator', x: 2 } },
  { id: 'g-spy', name: 'Spy Satellite', emoji: '🕵️', era: 4, cost: 7_000_000_000_000_000, desc: 'See secrets from space — more secret words that pay big.', effect: { kind: 'critChance', add: 0.04 } },
  { id: 'g-nosleep', name: 'Never-Sleeping Newsroom', emoji: '🌐', era: 4, cost: 12_000_000_000_000_000, desc: 'It is always daytime somewhere — helpers earn 12 hours longer while you are away.', effect: { kind: 'offline', hours: 12 } },
  { id: 'g-solar', name: 'Solar Panels', emoji: '☀️', era: 4, cost: 30_000_000_000_000_000, desc: 'Satellites run on sunshine — Satellite Engineers 2× faster.', needs: { staff: 'satengineer', count: 5 }, effect: { kind: 'staff', id: 'satengineer', x: 2 } },
  { id: 'g-rival', name: 'Buy Your Competitor', emoji: '🏢', era: 4, cost: 60_000_000_000_000_000, desc: 'You bought the other news channel! ALL helpers earn 2×.', effect: { kind: 'allStaff', x: 2 } },
  { id: 'g-moon', name: 'Moon Relay Station', emoji: '🌕', era: 4, cost: 120_000_000_000_000_000, desc: "Bounce your signal off the Moon — each word also earns more of your helpers' money.", effect: { kind: 'idleShare', add: 1 } },
  { id: 'g-coffee', name: 'Endless Coffee Machine', emoji: '☕', era: 4, cost: 180_000_000_000_000_000, desc: 'Night Desk Editors never get tired — 2× faster.', needs: { staff: 'nightdesk', count: 5 }, effect: { kind: 'staff', id: 'nightdesk', x: 2 } },
];

// ---------- Legend perks: bought with ⭐ Fame, kept forever (even after selling the company) ----------
export interface LegendDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  effect?: Effect;
  /** buy this perk first */
  after?: string;
}

export const LEGEND: LegendDef[] = [
  { id: 'l-start', name: 'Piggy Bank', emoji: '🐷', cost: 3, desc: 'Every new company starts with $25K in the bank.' },
  { id: 'l-voice', name: 'Famous Voice', emoji: '🎙️', cost: 6, desc: 'People know your voice — your words earn 2×. Forever.', effect: { kind: 'wordMult', x: 2 } },
  { id: 'l-staff', name: 'Loyal Helpers', emoji: '🤝', cost: 10, desc: 'Helpers love working for a legend — ALL helpers earn 2×.', effect: { kind: 'allStaff', x: 2 } },
  { id: 'l-lungs', name: 'Legend Lungs', emoji: '🫁', cost: 15, desc: 'Keep your combo going even longer.', effect: { kind: 'comboCap', add: 0.5 } },
  { id: 'l-luck', name: 'Lucky Star', emoji: '🍀', cost: 20, desc: 'More secret words that pay big.', effect: { kind: 'critChance', add: 0.03 } },
  { id: 'l-paper', name: 'Newspaper Heir', emoji: '📰', cost: 30, desc: 'Skip the Town Square — new companies start as a Newspaper.' },
  { id: 'l-away', name: 'Beach House', emoji: '🏖️', cost: 40, desc: 'Relax! Helpers earn 12 hours longer while you are away.', effect: { kind: 'offline', hours: 12 } },
  { id: 'l-news', name: 'Secret Sources', emoji: '🕵️', cost: 60, desc: 'Fresh news pays even more.', effect: { kind: 'fresh', add: 1 } },
  { id: 'l-radio', name: 'Radio Royalty', emoji: '📻', cost: 100, desc: 'New companies start as a Radio Station.', after: 'l-paper' },
  { id: 'l-gold', name: 'Golden Voice', emoji: '✨', cost: 150, desc: 'A voice of pure gold — your words earn 3× more. Forever.', effect: { kind: 'wordMult', x: 3 }, after: 'l-voice' },
];
export const LEGEND_BY_ID = Object.fromEntries(LEGEND.map((l) => [l.id, l])) as Record<string, LegendDef>;

/** every ⭐ you ever earned adds this much to ALL money (spending stars doesn't lower it) */
export const FAME_BONUS = 0.05;

/** upgrade category -> small colored dot in the shop */
export type UpgradeTag = 'words' | 'helpers' | 'combo' | 'lucky' | 'news' | 'away';
export const TAG_INFO: Record<UpgradeTag, { color: string; label: string }> = {
  words: { color: '#ffd84d', label: 'Your words earn more' },
  helpers: { color: '#5aa9ff', label: 'Helpers earn more' },
  combo: { color: '#ff8a3d', label: 'Bigger combo / happier crowd' },
  lucky: { color: '#c77dff', label: 'More secret (lucky) words' },
  news: { color: '#5dff9b', label: 'More fresh news' },
  away: { color: '#9a9ab0', label: 'Earn more while away' },
};
export function upgradeTag(u: UpgradeDef): UpgradeTag {
  switch (u.effect.kind) {
    case 'wordMult': case 'idleShare': return 'words';
    case 'staff': case 'allStaff': return 'helpers';
    case 'comboCap': case 'mood': return 'combo';
    case 'critChance': case 'critMult': return 'lucky';
    case 'sunrise': return 'words';
    case 'backlog': case 'fresh': return 'news';
    case 'offline': return 'away';
  }
}

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<string, UpgradeDef>;

export function computeMods(owned: string[], legend: string[] = [], fameTotal = 0): Mods {
  const m: Mods = { ...BASE_MODS, staffMult: {} };
  const fame = 1 + fameTotal * FAME_BONUS;
  m.wordMult *= fame;
  m.allStaffMult *= fame;
  const effects = [...owned.map((id) => UPGRADE_BY_ID[id]?.effect), ...legend.map((id) => LEGEND_BY_ID[id]?.effect)];
  for (const e of effects) {
    if (!e) continue;
    switch (e.kind) {
      case 'wordMult': m.wordMult *= e.x; break;
      case 'allStaff': m.allStaffMult *= e.x; break;
      case 'staff': m.staffMult[e.id] = (m.staffMult[e.id] ?? 1) * e.x; break;
      case 'comboCap': m.comboCap += e.add; break;
      case 'critChance': m.critChance += e.add; break;
      case 'critMult': m.critMult += e.add; break;
      case 'idleShare': m.idleShare += e.add; break;
      case 'backlog': m.backlogCap += e.cap; m.backlogRate *= e.rateX; break;
      case 'fresh': m.freshMult += e.add; break;
      case 'offline': m.offlineHours += e.hours; break;
      case 'mood': m.moodGain *= e.x; break;
      case 'sunrise': m.sunriseMult += e.add; break;
    }
  }
  return m;
}
