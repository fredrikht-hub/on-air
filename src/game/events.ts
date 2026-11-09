import type { TextStyle } from './eras';
import { generateAd, generateStory, styleText } from './headlines';
import type { StoryPlan } from './state';
import { nextArcChapter, type ArcState } from './stories';

/** Visitors: a famous guest shows up and every word pays more for a short time. */
export const VISITORS = [
  { emoji: '👑', label: 'The King rides through town!', short: "King's visit", mult: 3, seconds: 20 },
  { emoji: '🎩', label: 'A famous author visits the newsroom!', short: 'Author visit', mult: 3, seconds: 20 },
  { emoji: '🌟', label: 'A movie star walks into the studio!', short: 'Star guest', mult: 3, seconds: 20 },
  { emoji: '🎸', label: 'A rock and roll star drops by the TV studio!', short: 'Rock star', mult: 3, seconds: 20 },
];

/** Golden words: chance that a headline contains one golden word */
export const GOLDEN_CHANCE = 0.3;
export const GOLDEN_MULT = 10;

/** Breaking News: every word pays this much more, and beating the timer gives a jackpot */
export const BREAKING_WORD_MULT = 2;
export const BREAKING_JACKPOT = 3; // × what the story earned

/** TV commercials: a sponsor pays this much more for every word of the ad */
export const AD_MULT = 3;
export const AD_CHANCE = 0.16;

/** words with punctuation (TV and later) pay this much more when typed perfectly */
export const PUNCT_MULT = 2;
export const hasPunct = (w: string) => /[,.!?;:]/.test(w);

/** words to type between surprise events */
export const eventGap = (first: boolean) => (first ? 25 : 40) + Math.floor(Math.random() * 30);

/** decide the next headline: a story chapter (if due) or a fresh random headline */
export function planStory(style: TextStyle, arcs: ArcState): StoryPlan {
  const ch = nextArcChapter(arcs);
  if (ch) return { text: styleText(style, ch.arc.parts[ch.part]), arc: { id: ch.arc.id, part: ch.part } };
  if (style === 'tv' && Math.random() < AD_CHANCE) return { text: generateAd(), ad: true };
  return { text: generateStory(style) };
}

/** pick a golden word index (a longer word), or -1 */
export function pickGolden(text: string): number {
  if (Math.random() > GOLDEN_CHANCE) return -1;
  const words = text.split(' ');
  const options = words.map((w, i) => ({ w, i })).filter((o) => o.w.length >= 4 && o.i > 0);
  if (!options.length) return -1;
  return options[Math.floor(Math.random() * options.length)].i;
}
