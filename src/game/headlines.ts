import type { TextStyle } from './eras';

// All pools are lowercase plain words. Era styles transform them.
const SUBJECTS = [
  'local goose', 'the mayor', 'a retired pirate', 'the town baker', 'a confused wizard',
  'the school teacher', 'a famous chef', 'three tiny dogs', 'the village knight', 'a sleepy farmer',
  'the royal cat', 'an angry seagull', 'the night watchman', 'a traveling juggler', 'the old blacksmith',
  'a lost tourist', 'a talking parrot', 'the town council', 'a nervous mailman', 'the duke',
  'a brave grandmother', 'the local band', 'a very tall man', 'the fire brigade', 'a grumpy goat',
  'the best tailor in town', 'a young inventor', 'the harbor master', 'a famous painter', 'the lazy dragon',
  'a polite raccoon', 'the shoe maker', 'the head librarian', 'a giant turtle', 'the queen',
];

const ACTIONS = [
  'wins pie eating contest', 'refuses to leave the bakery', 'finds treasure under the bridge',
  'loses a shoe in the river', 'learns to juggle fire', 'challenges the king to chess',
  'sells invisible hats', 'opens a school for ducks', 'falls asleep during own speech',
  'builds a castle out of cheese', 'promises free bread for everyone', 'adopts forty cats',
  'paints the town hall purple', 'forgets how to whistle', 'starts a band with goats',
  'writes a song about soup', 'climbs the clock tower', 'races a horse and wins',
  'invents a square wheel', 'apologizes to the moon', 'bakes the largest cake in history',
  'is elected mayor', 'trains pigeons to deliver letters', 'discovers a secret tunnel',
  'sneezes for three days', 'wins a staring contest with an owl', 'teaches cows to dance',
  'swims across the lake at midnight', 'hides from the tax collector', 'plants a tree indoors',
  'buys every carrot in the market', 'declares war on the rain', 'grows a beard in one night',
  'returns a library book after fifty years', 'opens a museum of spoons',
];

const REASONS = [
  'a long argument with a duck', 'eating too much cheese', 'a strange dream', 'losing a bet',
  'a wild storm', 'a heated debate', 'finding a magic spoon', 'a very bad haircut',
  'missing the morning coach', 'reading the wrong map', 'a sudden fear of soup',
  'a mysterious letter', 'hearing a rumor at the market', 'a terrible joke', 'a broken umbrella',
];

const PLACES = [
  'the market square', 'the old mill', 'the royal garden', 'the harbor', 'the town hall',
  'the bakery', 'the dark forest', 'the library', 'the stone bridge', 'the castle',
  'the village well', 'the fish market', 'the north tower', 'the church steps', 'the river bank',
];

const THINGS = [
  'squeaky shoes', 'loud singing', 'flying pigeons', 'giant hats', 'free samples',
  'midnight picnics', 'wooden swords', 'pumpkin races', 'whistling', 'spicy soup',
  'tiny umbrellas', 'cheese sculptures', 'goat parades', 'pillow fights', 'bad poetry',
];

const CLAIMS = [
  'mondays are longer than fridays', 'cats understand every word', 'soup tastes better on tuesdays',
  'the river is slightly wet', 'ducks are planning something', 'cheese makes people happier',
  'naps improve everything', 'the moon is still there', 'bread is the best invention',
  'goats are excellent listeners', 'nobody likes cold tea', 'rain is mostly water',
];

const DOINGS = [
  'dancing with a goat', 'reading poetry to cows', 'juggling turnips', 'sleeping in a fountain',
  'wearing three hats', 'riding a giant chicken', 'singing to the fish', 'arguing with a statue',
  'painting the clouds', 'counting every brick',
];

const NUMBERS = ['two', 'three', 'five', 'seven', 'twelve', 'forty', 'one hundred'];
const ANIMALS = ['goats', 'chickens', 'pigs', 'sheep', 'ducks', 'cows', 'geese', 'rabbits'];
const SHOPS = ['bakery', 'hat shop', 'candle store', 'soup kitchen', 'music hall', 'toy shop', 'pet store'];
const ADJECTIVES = ['dangerous', 'delicious', 'magical', 'too loud', 'very sticky', 'completely invisible', 'secretly alive'];

const WEATHER = [
  'sunny skies over the hills', 'light rain in the morning', 'a strong wind from the sea',
  'thick fog near the harbor', 'warm weather all week', 'snow on the mountains',
  'clouds shaped like ducks', 'a small chance of frogs',
];

const RADIO_INTROS = [
  'good evening listeners our top story tonight is that', 'this just in', 'breaking news',
  'welcome back to the show where we hear that', 'our reporters tell us that', 'listeners are calling in because',
];

const CONNECTORS = ['and in other news', 'meanwhile', 'elsewhere tonight', 'also today', 'after the break'];

const TV_OPENERS = ['Good evening.', 'Hello, America.', 'Welcome back.', 'Here is the news.', 'Good evening, everyone.'];
const TV_LEADS = ['Tonight,', 'This just in:', 'In other news,', 'Meanwhile,', 'Believe it or not,', 'Right now,', 'Earlier today,'];
const TV_REACTIONS = [
  'nobody knows why', 'the whole town is cheering', 'experts are very confused', 'the police are not amused',
  'children are thrilled', 'we will keep you posted', 'the mayor has no comment', 'witnesses are still laughing',
];
const TV_QUESTIONS = ['Is it true?', 'Can you believe it?', 'What happens next?', 'Who saw that coming?'];
const TV_SIGNOFFS = ['Stay tuned!', 'Back after the break.', 'More at eleven.', 'Good night, and good luck.', 'Do not touch that dial!'];

/** TV sponsor messages ("commercials") — they pay extra */
const ADS = [
  'Drink Fizzo Cola. It tastes like a sunny Tuesday!',
  'New Sparkle Soap: your dishes will shine, and so will you.',
  'Buy a Rocket Vacuum. It eats dust, crumbs, and socks!',
  'Crunchy Flakes, the breakfast of champions. Now with more crunch!',
  'Visit Big Bob’s Cars. Low prices, shiny wheels, free balloons!',
  'Minty Fresh toothpaste: smile, and the world smiles back.',
  'Cozy Socks keep your toes warm, even on Mondays.',
  'Try Golden Pancake Syrup. Pour it on, then pour some more!',
  'Super Glow light bulbs: brighter nights, happier homes.',
  'Get a Jet Toaster. Toast in three seconds, or your money back!',
];
export function generateAd(): string {
  return pick(ADS);
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

let lastTemplate = -1;
let shownTemplate = -1;
const same = (a: number, b: number) => a === b || (a <= 2 && b <= 2);
function baseHeadline(): string {
  let t = Math.floor(Math.random() * 10);
  // never use the same sentence pattern twice in a row (incl. the last one shown)
  while (same(t, lastTemplate) || same(t, shownTemplate)) t = Math.floor(Math.random() * 10);
  lastTemplate = t;
  switch (t) {
    case 0:
    case 1:
    case 2:
      return `${pick(SUBJECTS)} ${pick(ACTIONS)}`;
    case 3:
      return `${pick(SUBJECTS)} ${pick(ACTIONS)} after ${pick(REASONS)}`;
    case 4:
      return `scientists confirm ${pick(CLAIMS)}`;
    case 5:
      return `${pick(PLACES)} bans ${pick(THINGS)} after ${pick(REASONS)}`;
    case 6:
      return `${pick(SUBJECTS)} spotted ${pick(DOINGS)} near ${pick(PLACES)}`;
    case 7:
      return `experts warn ${pick(THINGS)} may be ${pick(ADJECTIVES)}`;
    case 8:
      return `${pick(SUBJECTS)} opens new ${pick(SHOPS)} near ${pick(PLACES)}`;
    default:
      return `${pick(NUMBERS)} ${pick(ANIMALS)} escape from ${pick(PLACES)}`;
  }
}

function sentenceCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

const recent: string[] = [];
function fresh(gen: () => string): string {
  for (let i = 0; i < 12; i++) {
    const h = gen();
    if (!recent.includes(h)) {
      recent.push(h);
      if (recent.length > 40) recent.shift();
      return h;
    }
  }
  return gen();
}

export function generateStory(style: TextStyle): string {
  const out = generateRaw(style);
  shownTemplate = lastTemplate;
  return out;
}

function generateRaw(style: TextStyle): string {
  switch (style) {
    case 'crier':
      // short and simple: one plain headline, cap ~9 words
      return fresh(() => {
        let h = baseHeadline();
        while (h.split(' ').length > 9) h = baseHeadline();
        return h;
      });
    case 'paper':
      return fresh(() => sentenceCase(baseHeadline()));
    case 'tv':
      return fresh(() => {
        const h = baseHeadline();
        const r = Math.random();
        if (r < 0.2) return `${pick(TV_OPENERS)} ${sentenceCase(h)}.`;
        if (r < 0.4) return `${pick(TV_LEADS)} ${h}.`;
        if (r < 0.55) return `${sentenceCase(h)}, and ${pick(TV_REACTIONS)}.`;
        if (r < 0.7) return `${pick(TV_QUESTIONS)} ${sentenceCase(h)}!`;
        if (r < 0.82) return `${sentenceCase(h)}. ${pick(TV_SIGNOFFS)}`;
        return `Weather: ${pick(WEATHER)}, then ${pick(WEATHER)}.`;
      });
    case 'radio':
      return fresh(() => {
        const r = Math.random();
        if (r < 0.3) return `${pick(RADIO_INTROS)} ${baseHeadline()}`;
        if (r < 0.5) return `weather report ${pick(WEATHER)} and ${pick(WEATHER)} later tonight`;
        return `${baseHeadline()} ${pick(CONNECTORS)} ${baseHeadline()}`;
      });
  }
}

/** apply an era's text style to a hand-written sentence (used for story chapters) */
export function styleText(style: TextStyle, text: string): string {
  if (style === 'tv') return sentenceCase(text) + '.';
  return style === 'paper' ? sentenceCase(text) : text;
}
