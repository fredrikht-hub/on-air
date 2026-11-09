export interface StaffDef {
  id: string;
  name: string;
  emoji: string;
  era: number;
  baseCost: number;
  /** cash per second per unit, before multipliers */
  baseRate: number;
  flavor: string;
}

export const COST_GROWTH = 1.15;

export const STAFF: StaffDef[] = [
  { id: 'bell', name: 'Bell Ringer', emoji: '🔔', era: 0, baseCost: 150, baseRate: 2.5, flavor: "Rings a bell so people come and listen." },
  { id: 'apprentice', name: 'Shouting Kid', emoji: '🧒', era: 0, baseCost: 1_100, baseRate: 16, flavor: "A kid who shouts the news for you." },
  { id: 'scribe', name: 'Town Scribe', emoji: '🪶', era: 0, baseCost: 10_000, baseRate: 90, flavor: "Writes the news on signs around town." },

  { id: 'typesetter', name: 'Typesetter', emoji: '🔠', era: 1, baseCost: 60_000, baseRate: 400, flavor: "Puts the letters in the printing press." },
  { id: 'paperboy', name: 'Paperboy', emoji: '🚲', era: 1, baseCost: 500_000, baseRate: 2_200, flavor: "Rides around selling your newspaper." },
  { id: 'copywriter', name: 'Copywriter', emoji: '✍️', era: 1, baseCost: 1_500_000, baseRate: 6_000, flavor: 'Writes catchy headlines that sell papers.' },
  { id: 'reporter', name: 'Junior Reporter', emoji: '🕵️', era: 1, baseCost: 4_000_000, baseRate: 12_000, flavor: "Finds new stories all over the city." },

  { id: 'dj', name: 'Radio DJ', emoji: '🎧', era: 2, baseCost: 30_000_000, baseRate: 70_000, flavor: "Plays music between your news." },
  { id: 'engineer', name: 'Sound Engineer', emoji: '🎛️', era: 2, baseCost: 250_000_000, baseRate: 400_000, flavor: "Keeps the radio sounding perfect." },
  { id: 'field', name: 'Field Reporter', emoji: '🎙️', era: 2, baseCost: 2_000_000_000, baseRate: 2_200_000, flavor: "Reports live from everywhere." },

  { id: 'camera', name: 'Camera Operator', emoji: '🎥', era: 3, baseCost: 15_000_000_000, baseRate: 12_000_000, flavor: 'Points the big camera at you.' },
  { id: 'weather', name: 'Weather Forecaster', emoji: '🌦️', era: 3, baseCost: 120_000_000_000, baseRate: 70_000_000, flavor: 'Tells everyone if they need an umbrella.' },
  { id: 'makeup', name: 'Makeup Artist', emoji: '💄', era: 3, baseCost: 900_000_000_000, baseRate: 400_000_000, flavor: 'Makes you look great on camera.' },
  { id: 'producer', name: 'TV Producer', emoji: '📋', era: 3, baseCost: 6_000_000_000_000, baseRate: 2_200_000_000, flavor: 'Runs the whole show from behind the camera.' },

  { id: 'correspondent', name: 'Foreign Correspondent', emoji: '🌍', era: 4, baseCost: 80_000_000_000_000, baseRate: 60_000_000_000, flavor: 'Flies around the world to find stories.' },
  { id: 'translator', name: 'Translator', emoji: '🗣️', era: 4, baseCost: 600_000_000_000_000, baseRate: 350_000_000_000, flavor: 'Says your news in every language.' },
  { id: 'satengineer', name: 'Satellite Engineer', emoji: '🛰️', era: 4, baseCost: 4_500_000_000_000_000, baseRate: 2_000_000_000_000, flavor: 'Keeps your satellites flying.' },
  { id: 'nightdesk', name: 'Night Desk Editor', emoji: '🌙', era: 4, baseCost: 30_000_000_000_000_000, baseRate: 12_000_000_000_000, flavor: 'It is always morning somewhere — she never sleeps.' },
];

export const STAFF_BY_ID = Object.fromEntries(STAFF.map((s) => [s.id, s])) as Record<string, StaffDef>;

/** total cost of buying `qty` more when `owned` already owned */
export function staffCost(def: StaffDef, owned: number, qty = 1): number {
  const g = COST_GROWTH;
  return (def.baseCost * g ** owned * (g ** qty - 1)) / (g - 1);
}

/** how many can be afforded with `cash` */
export function maxAffordable(def: StaffDef, owned: number, cash: number): number {
  const g = COST_GROWTH;
  const first = def.baseCost * g ** owned;
  if (cash < first) return 0;
  return Math.floor(Math.log((cash * (g - 1)) / first + 1) / Math.log(g));
}
