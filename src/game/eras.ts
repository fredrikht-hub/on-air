export type CharacterId = 'mayor' | 'editor' | 'manager';
export type TextStyle = 'crier' | 'paper' | 'radio';

export interface Era {
  id: string;
  name: string;
  emoji: string;
  year: string;
  /** base cash per typed word */
  wordBase: number;
  /** cost to evolve INTO the next era (null = last playable) */
  evolveCost: number | null;
  skill: string;
  description: string;
  playable: boolean;
  character?: { id: CharacterId; name: string; title: string };
  textStyle?: TextStyle;
  theme: { accent: string; sky1: string; sky2: string; floor: string };
  /** era fonts: titles (display) and the typing text (always monospace) */
  fonts?: { title: string; type: string };
}

export const ERAS: Era[] = [
  {
    id: 'crier',
    fonts: { title: "'IM Fell English', Georgia, serif", type: "'JetBrains Mono', monospace" },
    name: 'Town Square',
    emoji: '📢',
    year: '1650',
    wordBase: 10,
    evolveCost: 30_000,
    skill: 'Basics — short common words',
    description: 'Shout the news in the town square so everyone hears it.',
    playable: true,
    character: { id: 'mayor', name: 'You', title: 'News Shouter' },
    textStyle: 'crier',
    theme: { accent: '#f2b84b', sky1: '#6ec3f4', sky2: '#c7ecff', floor: '#8a7a6a' },
  },
  {
    id: 'paper',
    fonts: { title: "'Playfair Display', Georgia, serif", type: "'Courier Prime', 'Courier New', monospace" },
    name: 'Newspaper',
    emoji: '📰',
    year: '1890',
    wordBase: 80,
    evolveCost: 15_000_000,
    skill: 'Capital letters — start every headline with one',
    description: 'Print your news on paper — now the whole city can read it!',
    playable: true,
    character: { id: 'editor', name: 'You', title: 'Newspaper Reporter' },
    textStyle: 'paper',
    theme: { accent: '#e9e2c9', sky1: '#5a4636', sky2: '#8a6d55', floor: '#3b2d22' },
  },
  {
    id: 'radio',
    fonts: { title: "'Limelight', Georgia, serif", type: "'JetBrains Mono', monospace" },
    name: 'Radio Station',
    emoji: '📻',
    year: '1930',
    wordBase: 600,
    evolveCost: 50_000_000_000,
    skill: 'Rhythm — steady typing keeps the signal clear',
    description: 'Talk on the radio — the whole country can listen! Type at a steady rhythm.',
    playable: true,
    character: { id: 'manager', name: 'You', title: 'Radio Host' },
    textStyle: 'radio',
    theme: { accent: '#b48cff', sky1: '#24183f', sky2: '#3d2a66', floor: '#171026' },
  },
  {
    id: 'tv',
    name: 'Television',
    emoji: '📺',
    year: '1955',
    wordBase: 5_000,
    evolveCost: null,
    skill: 'Punctuation — sentences, commas, periods.',
    description: 'Live captions for the evening news. Meet your first anchor.',
    playable: false,
    theme: { accent: '#ff5d73', sky1: '#222', sky2: '#444', floor: '#111' },
  },
  {
    id: 'cable',
    name: '24/7 Cable News',
    emoji: '📡',
    year: '1985',
    wordBase: 0,
    evolveCost: null,
    skill: 'Number row — names, dates, 2026',
    description: 'The news never sleeps, and neither do you.',
    playable: false,
    theme: { accent: '#4bd3ff', sky1: '#222', sky2: '#444', floor: '#111' },
  },
  {
    id: 'stream',
    name: 'Streaming',
    emoji: '🌐',
    year: '2015',
    wordBase: 0,
    evolveCost: null,
    skill: 'Symbols — #hashtags @handles',
    description: 'Go viral or go home.',
    playable: false,
    theme: { accent: '#5dff9b', sky1: '#222', sky2: '#444', floor: '#111' },
  },
  {
    id: 'space',
    name: 'Space Broadcast',
    emoji: '🚀',
    year: '2077',
    wordBase: 0,
    evolveCost: null,
    skill: 'Mastery — everything at once',
    description: 'Broadcasting to the stars.',
    playable: false,
    theme: { accent: '#ffd36e', sky1: '#222', sky2: '#444', floor: '#111' },
  },
];
