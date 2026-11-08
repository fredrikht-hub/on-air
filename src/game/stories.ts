/**
 * Continuing storylines: short "series" of headlines with recurring characters.
 * One chapter is slipped in every few headlines, and progress is saved,
 * so players come back to find out what happens next.
 */
export interface Arc {
  id: string;
  title: string;
  emoji: string;
  parts: string[];
}

export const ARCS: Arc[] = [
  {
    id: 'goose',
    title: 'The Goose Mayor',
    emoji: '🪿',
    parts: [
      'a goose walks into the town hall and refuses to leave',
      'the goose wins the election for mayor with a lot of honks',
      'mayor goose bans bread from the whole town',
      'angry ducks march to the town hall with tiny signs',
      'mayor goose and the ducks share one giant loaf of bread',
      'the town throws a party for the goose and the ducks',
    ],
  },
  {
    id: 'cheese',
    title: 'The Missing Cheese',
    emoji: '🧀',
    parts: [
      'the biggest cheese in town goes missing from the market',
      'detectives find tiny footprints next to the empty cheese table',
      'a trail of crumbs leads all the way to the old mill',
      'the mice of the old mill are having a giant cheese party',
      'the baker gives the mice a job as cheese tasters',
      'the market now sells cheese with a mouse stamp of approval',
    ],
  },
  {
    id: 'dragon',
    title: 'The Dragon Next Door',
    emoji: '🐉',
    parts: [
      'a sleepy dragon moves into the empty castle on the hill',
      'the town is scared but the dragon only wants a cup of tea',
      'the dragon lights every candle in town with one tiny sneeze',
      'children ride the dragon to school and are never late again',
      'the dragon opens a warm bakery that never needs an oven',
      'the dragon is voted best neighbor of the year',
    ],
  },
  {
    id: 'pirate',
    title: 'The Pirate Treasure',
    emoji: '🏴‍☠️',
    parts: [
      'an old pirate arrives in the harbor with a torn map',
      'the pirate asks the town to help him find his lost treasure',
      'half the town is digging holes in the royal garden',
      'the queen is not happy about the holes in her garden',
      'the treasure is found and it is a chest full of old socks',
      'the pirate opens the first sock museum in the world',
    ],
  },
  {
    id: 'cat',
    title: 'The Talking Cat',
    emoji: '🐈',
    parts: [
      'the royal cat says its very first word',
      'the first word of the royal cat is fish',
      'the royal cat now gives a speech every morning',
      'the royal cat asks the queen for a crown of its own',
      'the queen gives the cat a tiny golden crown',
      'the town now has a cat king and nobody minds at all',
    ],
  },
  {
    id: 'pumpkin',
    title: 'The Great Pumpkin',
    emoji: '🎃',
    parts: [
      'a farmer grows a pumpkin the size of a house',
      'the giant pumpkin rolls down the hill toward the town',
      'the whole town runs after the rolling pumpkin',
      'the pumpkin stops right in front of the bakery door',
      'the bakery makes pumpkin pie for everyone in town',
      'the farmer promises an even bigger pumpkin next year',
    ],
  },
  {
    id: 'robot',
    title: 'The Robot Baker',
    emoji: '🤖',
    parts: [
      'the baker builds a robot to help in the kitchen',
      'the robot bakes one thousand cakes in a single morning',
      'the town cannot eat one thousand cakes',
      'the leftover cakes are used to build a new bridge',
      'the cake bridge is very strong and very delicious',
      'birds eat half of the cake bridge before lunch',
    ],
  },
];

export const ARC_BY_ID = Object.fromEntries(ARCS.map((a) => [a.id, a])) as Record<string, Arc>;

/** a story chapter shows up after this many normal headlines */
export const ARC_EVERY = 3;

export interface ArcState {
  active: string | null;
  part: number;
  done: string[];
  sinceLast: number;
}

export const freshArcState = (): ArcState => ({ active: null, part: 0, done: [], sinceLast: 0 });

/** which arc chapter (if any) should be the next headline */
export function nextArcChapter(st: ArcState): { arc: Arc; part: number } | null {
  if (st.sinceLast < ARC_EVERY) return null;
  let arc = st.active ? ARC_BY_ID[st.active] : undefined;
  let part = st.part;
  if (!arc) {
    const left = ARCS.filter((a) => !st.done.includes(a.id));
    const pool = left.length ? left : ARCS;
    arc = pool[Math.floor(Math.random() * pool.length)];
    part = 0;
  }
  return { arc, part };
}

/** state after a story is filed (pure — also used to plan the "next" preview) */
export function advanceArcs(st: ArcState, arc?: { id: string; part: number }): ArcState {
  if (!arc) return { ...st, sinceLast: st.sinceLast + 1 };
  const total = ARC_BY_ID[arc.id]?.parts.length ?? 0;
  const part = arc.part + 1;
  if (part >= total) return { active: null, part: 0, done: [...st.done.filter((d) => d !== arc.id), arc.id], sinceLast: 0 };
  return { ...st, active: arc.id, part, sinceLast: 0 };
}
