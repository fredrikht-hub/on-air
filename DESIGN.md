# ON AIR — Typing Tycoon · Design

An idle game where typing real English is the engine. Goal: make daily typing practice
(toward 120 WPM) fun and habit-forming.

## Core loop
```
Away → news BACKLOG piles up (staff earn a little, offline at 50%)
Open → "N stories waiting!"
Type stories (funny generated headlines) → cash
Cash → staff (idle) + upgrades → EVOLVE to next media era → (Stage 2) REBRAND prestige
~15 min session, come back tomorrow
```

## Design rules (from the review)
1. **Idle builds the opportunity, typing cashes it in.** Fresh backlog stories pay ×2+.
   Each typed word also pays a slice of idle income (`idleShare` seconds), so typing stays
   relevant at any scale.
2. **Reward beating yourself, not absolute WPM.** "Hot" bonus = live WPM vs your recent
   average (last 20 stories). +25% above average → ×2.
3. **Staff scale with your skill.** Staff output × (7-day average WPM / 40).
4. **Short sessions.** Backlog fills over hours, not minutes.
5. **Accuracy matters.** Combo grows on perfect words, resets on a word with any error.
   Errors must be fixed (backspace) before a word counts.

## Payout per word
```
word = (eraBase × wordMult + idleRate × idleShare)
     × combo (1 + 0.02/word, capped)
     × mood (0.7 – 1.5, the era's boss character)
     × hot  (1 – 2, beating your average)
     × fresh (×2 if backlog story)
     × signal (Radio+: 0.8 – 1.4, steady rhythm)
     × crit (perfect word, 3% → ×5)
Story bonus: perfect story +25% of story earnings.
```

## Eras (each trains a skill)
| # | Era | Text | Skill | Status |
|---|-----|------|-------|--------|
| 1 | Town Crier | lowercase short headlines | basics | Stage 1 |
| 2 | Newspaper | Title Case Headlines | capitals | Stage 1 |
| 3 | Radio | long lowercase bulletins + signal meter | rhythm | Stage 1 |
| 4 | Television | Sentences, with punctuation. | punctuation | Stage 2 |
| 5 | 24/7 Cable | names, dates, 2026 numbers | number row | Stage 2 |
| 6 | Streaming | #hashtags @handles | symbols | Stage 3 |
| 7 | Space Broadcast | everything | mastery | Stage 3 |

## Stages
- **Stage 1** (this build): typing engine, economy, staff, upgrades, backlog, offline,
  eras 1–3, boss moods, pixel studio, sounds, save.
- **Stage 2**: TV eras, anchors, Breaking News, Prime Time, Rebrand prestige.
- **Stage 3**: eras 6–7, Career page (WPM graph, key heatmap), weak-key training,
  daily streak, balance.

## Added after playtesting
- **Speed feedback:** live rolling WPM by the text, 🏆 personal-record celebration, average-speed
  milestones every 10 WPM, "Road to 120" bar in the top bar, weekly "X% faster" note.
- **Surprises** (every ~40–70 typed words, after the first 2 stories):
  - ⭐ Golden word (30% of headlines): type it perfectly → ×10.
  - 🚨 Breaking News: timer = your avg speed × 1.25; words ×2, beat it → jackpot (3× story earnings).
  - 👑 Visitor (King / author / movie star): every word ×3 for 20s.
- **Continuing stories** (`src/game/stories.ts`): 7 six-part series; a chapter appears every 3
  headlines, progress is saved, the finale pays a bonus.
