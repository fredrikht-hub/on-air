import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { buySuggestion, onToast, suggest, toast, type Toast } from '../game/buy';
import { ERAS } from '../game/eras';
import { AD_MULT, BREAKING_JACKPOT, BREAKING_WORD_MULT, GOLDEN_MULT, PUNCT_MULT, VISITORS, eventGap, hasPunct, pickGolden, planStory } from '../game/events';
import { money, mult } from '../game/format';
import { confetti, liveFx, sceneEvent } from '../game/fx';
import { sfx } from '../game/sound';
import { comboMult, hotMult, idleRate, meterMult, moodMult, mods, recentAvgWpm, useGame, wordBaseValue, type ArcRef, type StoryPlan } from '../game/state';
import { ARC_BY_ID, advanceArcs } from '../game/stories';

interface Breaking { limit: number; startedAt: number; failed: boolean }

interface Engine {
  text: string;
  words: { start: number; end: number }[];
  charWord: number[];
  typed: string;
  wordErr: boolean[];
  done: boolean[];
  lock: number;
  start: number | null;
  keys: number;
  correctKeys: number;
  fresh: boolean;
  earned: number;
  anyError: boolean;
  finished: boolean;
  arc?: ArcRef;
  ad: boolean;
  golden: number;
  breaking: Breaking | null;
}

interface Popup { id: number; x: number; y: number; text: string; kind: 'normal' | 'crit' | 'golden' | 'lost' }

const MAX_PENDING_ERRORS = 6;

function makeEngine(text: string, fresh: boolean, arc?: ArcRef, ad = false): Engine {
  const words: { start: number; end: number }[] = [];
  const charWord: number[] = [];
  let start = 0;
  text.split(' ').forEach((w, i) => {
    words.push({ start, end: start + w.length });
    for (let c = 0; c <= w.length; c++) charWord[start + c] = i; // includes trailing space
    start += w.length + 1;
  });
  return {
    text, words, charWord, typed: '', wordErr: words.map(() => false), done: words.map(() => false),
    lock: 0, start: null, keys: 0, correctKeys: 0, fresh, earned: 0, anyError: false, finished: false,
    arc, ad, golden: ad ? -1 : pickGolden(text), breaking: null,
  };
}

function firstMismatch(e: Engine): number {
  for (let i = e.lock; i < e.typed.length; i++) if (e.typed[i] !== e.text[i]) return i;
  return -1;
}

/** smoothly counts a displayed number toward its real value */
function useAnimatedNumber(value: number): number {
  const [shown, setShown] = useState(value);
  const target = useRef(value);
  target.current = value;
  useEffect(() => {
    let raf = 0;
    const step = () => {
      setShown((cur) => {
        const t = target.current;
        if (Math.abs(t - cur) < Math.max(0.01, Math.abs(t) * 0.0005)) return t;
        return cur + (t - cur) * 0.18;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return shown;
}

let popupId = 0;

export function TypingPanel({ paused }: { paused: boolean }) {
  const s = useGame();
  const { era, combo, mood } = s;
  const m = mods(s);
  const avg = recentAvgWpm(s);

  const engine = useRef<Engine | null>(null);
  const [, render] = useReducer((x: number) => x + 1, 0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [shake, setShake] = useState(false);
  const [bump, setBump] = useState(0);
  const [liveWpm, setLiveWpm] = useState<number | null>(null);
  const [rollingWpm, setRollingWpm] = useState<number | null>(null);
  const [signal, setSignal] = useState(0.7);
  // TV: viewer ratings — talking keeps them up, silence ("dead air") makes viewers switch channels
  const [ratings, setRatingsState] = useState(liveFx.ratings);
  const [deadAir, setDeadAir] = useState(false);
  const ratingsRef = useRef(liveFx.ratings);
  const setRatings = (v: number) => {
    const r = Math.max(0, Math.min(1, v));
    ratingsRef.current = r;
    liveFx.ratings = r;
    setRatingsState(r);
  };
  const [toasts, setToasts] = useState<Toast[]>([]);

  const caretRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const intervals = useRef<number[]>([]);
  const wordTimes = useRef<{ t: number; chars: number }[]>([]);
  const lastWordAt = useRef<number | null>(null);
  const lastFinishAt = useRef(0);
  const nextPlan = useRef<StoryPlan | null>(null);
  const caretPos = useRef({ x: 0, y: 0 });
  const wordsToEvent = useRef(eventGap(true));
  const breakingNext = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const cashShown = useAnimatedNumber(s.cash);

  useEffect(
    () =>
      onToast((t) => {
        setToasts((ts) => [...ts.slice(-1), t]);
        window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), t.big ? 3400 : 2400);
      }),
    [],
  );

  const newStory = useCallback(() => {
    const st = useGame.getState();
    const style = ERAS[st.era].textStyle ?? 'crier';
    const story = st.takeStory(() => nextPlan.current ?? planStory(style, st.arcs));
    // plan the NEXT headline as if this one were already filed (keeps the preview honest)
    nextPlan.current = planStory(style, advanceArcs(useGame.getState().arcs, story.arc));
    const en = makeEngine(story.text, story.fresh, story.arc, story.ad);
    if (en.ad) sfx.commercial();
    if (breakingNext.current && !en.ad) {
      breakingNext.current = false;
      const speed = Math.max(25, recentAvgWpm(useGame.getState()) ?? 30);
      const ms = (story.text.length / 5 / speed) * 60000 * 1.25 + 1500;
      en.breaking = { limit: ms, startedAt: performance.now(), failed: false };
      en.golden = -1;
      sfx.siren();
    }
    engine.current = en;
    charRefs.current = [];
    setLiveWpm(null);
    render();
  }, []);

  useEffect(() => {
    nextPlan.current = null;
    newStory();
  }, [era, newStory]);

  // breaking-news deadline watcher
  useEffect(() => {
    const id = window.setInterval(() => {
      const e = engine.current;
      if (!e?.breaking || e.breaking.failed || e.finished) return;
      if (performance.now() > e.breaking.startedAt + e.breaking.limit) {
        e.breaking.failed = true;
        sfx.fail();
        toast({ emoji: '⌛', title: 'Too slow!', lines: ['The rival paper got the scoop first. Keep typing!'] });
        render();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // dead air: a pause mid-show drops the ratings (a longer break freezes them — that's just a coffee break)
  useEffect(() => {
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.era < 3 || pausedRef.current) return;
      const idle = (Date.now() - st.lastKeyAt) / 1000;
      const dead = st.lastKeyAt > 0 && idle > 2 && idle < 15;
      if (dead) {
        if (!liveFx.deadAir) sfx.static();
        setRatings(ratingsRef.current - 0.04);
      }
      if (dead !== liveFx.deadAir) {
        liveFx.deadAir = dead;
        setDeadAir(dead);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // first time on TV: explain the new rules once
  useEffect(() => {
    if (era < 3) return;
    const st = useGame.getState();
    if (st.townSeen.includes('tv-intro')) return;
    st.patch({ townSeen: [...st.townSeen, 'tv-intro'] });
    window.setTimeout(
      () =>
        toast({
          emoji: '📺',
          title: "You're on TV!",
          lines: ['Words with , . ! ? pay ×2', "Don't stop talking — silence drops your ratings"],
          big: true,
        }),
      3600,
    );
  }, [era]);

  const spawnPopup = (text: string, kind: Popup['kind'] = 'normal') => {
    const id = ++popupId;
    const p = { id, x: caretPos.current.x, y: caretPos.current.y, text, kind };
    setPopups((ps) => [...ps.slice(-12), p]);
    window.setTimeout(() => setPopups((ps) => ps.filter((q) => q.id !== id)), kind === 'golden' ? 1600 : 1100);
  };

  const triggerEvent = () => {
    const st = useGame.getState();
    if (st.totals.stories < 2) return;
    if (Math.random() < 0.55) {
      breakingNext.current = true;
    } else {
      const v = VISITORS[Math.min(st.era, VISITORS.length - 1)];
      st.setBoost({ mult: v.mult, until: Date.now() + v.seconds * 1000, label: v.short, emoji: v.emoji });
      sfx.fanfare();
      toast({ emoji: v.emoji, title: v.label, lines: [`Every word pays ×${v.mult} for ${v.seconds} seconds!`], big: true });
    }
  };

  const finishStory = (e: Engine) => {
    e.finished = true;
    const st = useGame.getState();
    const minutes = (performance.now() - (e.start ?? performance.now())) / 60000;
    const wpm = minutes > 0 ? e.text.length / 5 / minutes : 0;
    const acc = e.keys ? e.correctKeys / e.keys : 1;
    const perfect = !e.anyError;
    const prevBest = st.totals.bestWpm;
    const storiesBefore = st.totals.stories;
    const bonus = st.completeStory({ wpm, acc, perfect, earned: e.earned, arc: e.arc, text: e.text });
    sfx.story();
    if (perfect) {
      spawnPopup(`★ PERFECT! +${money(bonus)}`, 'crit');
      sceneEvent('perfect');
    }

    // breaking news jackpot
    if (e.breaking && !e.breaking.failed) {
      const jackpot = e.earned * BREAKING_JACKPOT;
      st.addCash(jackpot);
      sfx.jackpot();
      confetti(1);
      toast({ emoji: '🚨', title: 'JACKPOT! You beat the deadline!', lines: [`+${money(jackpot)}`], big: true });
    }

    // story chapter finished
    if (e.arc) {
      const arc = ARC_BY_ID[e.arc.id];
      if (arc && e.arc.part === arc.parts.length - 1) {
        const reward = e.earned * 2;
        st.addCash(reward);
        confetti(0.7);
        toast({ emoji: arc.emoji, title: `Story complete: ${arc.title}!`, lines: [`Finale bonus +${money(reward)}`, 'A new story starts soon…'], big: true });
      }
    }

    // personal speed record (after a few warm-up stories, on real-length headlines)
    if (storiesBefore >= 3 && e.text.length >= 25 && prevBest > 0 && wpm > prevBest) {
      sfx.record();
      confetti(1.3);
      toast({ emoji: '🏆', title: `NEW RECORD: ${Math.round(wpm)} WPM!`, lines: [`Your fastest headline ever (old best ${Math.round(prevBest)})`], big: true });
    }

    // average-speed milestones: 30, 40, 50 … 120
    const after = useGame.getState();
    const newAvg = recentAvgWpm(after);
    if (newAvg != null && after.history.length >= 5) {
      const ms = Math.floor(newAvg / 10) * 10;
      if (ms >= 20 && ms > after.wpmMilestone) {
        after.patch({ wpmMilestone: ms });
        if (after.wpmMilestone > 0 || ms >= 30) {
          confetti(1);
          sfx.fanfare();
          toast({
            emoji: ms >= 120 ? '👑' : '🎉',
            title: ms >= 120 ? 'YOU REACHED 120 WPM! LEGEND!' : `Your average is now ${ms}+ WPM!`,
            lines: ms >= 120 ? ['You are officially a typing master.'] : [`Only ${120 - ms} WPM to go until 120 🏁`],
            big: true,
          });
        }
      }
    }

    lastFinishAt.current = performance.now();
    if (wordsToEvent.current <= 0) {
      wordsToEvent.current = eventGap(false);
      triggerEvent();
    }
    newStory(); // no pause — keep the momentum going
  };

  const completeWord = (e: Engine, idx: number) => {
    e.done[idx] = true;
    e.lock = Math.min(e.text.length, e.words[idx].end + 1);
    const now = performance.now();
    const len = e.words[idx].end - e.words[idx].start + 1;

    // rhythm signal (radio)
    if (lastWordAt.current != null) {
      const per = (now - lastWordAt.current) / len;
      if (per < 600) {
        intervals.current.push(per);
        if (intervals.current.length > 8) intervals.current.shift();
      }
    }
    lastWordAt.current = now;
    let sig = 0.7;
    const iv = intervals.current;
    if (iv.length >= 4) {
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
      const sd = Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length);
      sig = Math.max(0, Math.min(1, 1 - (sd / mean) * 1.6));
    }
    setSignal(sig);
    liveFx.signal = sig;

    // rolling live WPM over the last ~12 words (resets after a pause)
    const wt = wordTimes.current;
    if (wt.length && now - wt[wt.length - 1].t > 4000) wt.length = 0;
    wt.push({ t: now, chars: len });
    if (wt.length > 12) wt.shift();
    if (wt.length >= 4) {
      const chars = wt.slice(1).reduce((a, w) => a + w.chars, 0);
      setRollingWpm(chars / 5 / ((wt[wt.length - 1].t - wt[0].t) / 60000));
    }

    const wordsDone = e.done.filter(Boolean).length;
    const elapsedMin = (now - (e.start ?? now)) / 60000;
    const live = wordsDone >= 3 && elapsedMin > 0.03 ? e.lock / 5 / elapsedMin : null;
    setLiveWpm(live);

    const perfect = !e.wordErr[idx];
    const isGolden = idx === e.golden;
    const tv = useGame.getState().era >= 3;
    const punct = tv && perfect && hasPunct(e.text.slice(e.words[idx].start, e.words[idx].end));
    let extra = 1;
    if (isGolden && perfect) extra *= GOLDEN_MULT;
    if (e.breaking && !e.breaking.failed) extra *= BREAKING_WORD_MULT;
    if (punct) extra *= PUNCT_MULT;
    if (e.ad) extra *= AD_MULT;
    if (tv) setRatings(ratingsRef.current + (!perfect ? -0.08 : punct ? 0.1 : 0.05));

    const res = useGame.getState().completeWord({ perfect, liveWpm: live, signal: tv ? ratingsRef.current : sig, fresh: e.fresh, extra });
    e.earned += res.amount;
    wordsToEvent.current--;
    const c = useGame.getState().combo;
    sceneEvent(isGolden && perfect ? 'golden' : res.crit ? 'crit' : 'word');
    if (isGolden && perfect) {
      sfx.golden();
      confetti(0.35);
      spawnPopup(`⭐ GOLDEN! +${money(res.amount)}`, 'golden');
    } else if (isGolden) {
      spawnPopup('💔 golden word lost', 'lost');
      sfx.word(c);
    } else if (res.crit) {
      sfx.crit();
      spawnPopup('CRIT! +' + money(res.amount), 'crit');
    } else {
      sfx.word(c);
      spawnPopup((punct ? '✒️ ×2 +' : '+') + money(res.amount));
    }
    if (res.crit || (isGolden && perfect)) {
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
    }
    setBump((b) => b + 1);
    if (idx === e.words.length - 1) finishStory(e);
  };

  const typeChar = (ch: string) => {
    const e = engine.current;
    if (!e || e.finished) return;
    // a space right after finishing a story is natural — ignore it
    if (ch === ' ' && e.typed.length === 0) return;
    if (e.typed.length >= e.text.length) return;
    const fm = firstMismatch(e);
    if (fm !== -1 && e.typed.length - fm >= MAX_PENDING_ERRORS) {
      sfx.deny();
      return;
    }
    const pos = e.typed.length;
    const expected = e.text[pos];
    const correct = ch === expected;
    if (e.start == null) {
      const now = performance.now();
      // keep timing continuous when flowing straight from the previous story
      e.start = now - lastFinishAt.current < 3000 ? lastFinishAt.current : now;
    }
    e.keys++;
    if (correct) e.correctKeys++;
    useGame.getState().registerKey(correct, expected);
    if (!correct) {
      e.wordErr[e.charWord[pos]] = true;
      e.anyError = true;
      sfx.error();
      sceneEvent('mistake');
    } else sfx.key();
    e.typed += ch;

    const idx = e.charWord[pos];
    const w = e.words[idx];
    const trigger = idx === e.words.length - 1 ? w.end : w.end + 1;
    if (!e.done[idx] && e.typed.length === trigger && firstMismatch(e) === -1) completeWord(e, idx);
    render();
  };

  const backspace = (word: boolean) => {
    const e = engine.current;
    if (!e || e.finished || e.typed.length <= e.lock) return;
    if (word) {
      const idx = e.charWord[e.typed.length - 1];
      e.typed = e.typed.slice(0, Math.max(e.lock, e.words[idx].start));
    } else e.typed = e.typed.slice(0, -1);
    render();
  };

  const enter = () => {
    const st = useGame.getState();
    if (!st.reveal.shop) return;
    const sg = suggest(st);
    if (sg?.affordable) buySuggestion(sg);
  };

  // keyboard
  const handlers = useRef({ typeChar, backspace, enter });
  handlers.current = { typeChar, backspace, enter };
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (pausedRef.current || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Backspace') {
        ev.preventDefault();
        handlers.current.backspace(ev.ctrlKey);
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (!ev.repeat) handlers.current.enter();
        return;
      }
      if (ev.ctrlKey || ev.key.length !== 1) return;
      ev.preventDefault();
      if (ev.repeat) return;
      handlers.current.typeChar(ev.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // smooth caret
  useLayoutEffect(() => {
    const en = engine.current;
    const caret = caretRef.current;
    if (!en || !caret) return;
    const i = en.typed.length;
    const el = charRefs.current[Math.min(i, en.text.length - 1)];
    if (!el) return;
    const x = i >= en.text.length ? el.offsetLeft + el.offsetWidth : el.offsetLeft;
    caret.style.transform = `translate(${x}px, ${el.offsetTop}px)`;
    caretPos.current = { x, y: el.offsetTop };
    caret.style.height = `${el.offsetHeight}px`;
    // what "you" are shouting in the studio = the correctly typed part
    const fmi = firstMismatch(en);
    useGame.getState().setShout(en.text.slice(0, fmi === -1 ? en.typed.length : fmi));
  });

  const e = engine.current;
  if (!e) return null;

  const now = Date.now();
  const boost = s.boost && now < s.boost.until ? s.boost : null;
  const hot = hotMult(liveWpm, avg);
  const sigM = meterMult(era, era >= 3 ? ratings : signal);
  const nextCombo = comboMult(combo + 1, m.comboCap);
  const wordValue =
    wordBaseValue(s) * nextCombo * moodMult(mood) * hot * sigM * (e.fresh ? m.freshMult : 1) * (boost ? boost.mult : 1) *
    (e.breaking && !e.breaking.failed ? BREAKING_WORD_MULT : 1) * (e.ad ? AD_MULT : 1);
  const fm = firstMismatch(e);
  const currentWord = e.charWord[Math.min(e.typed.length, e.text.length - 1)];
  const firstTime = s.totals.words === 0;
  const sg = s.reveal.shop ? suggest(s) : null;
  const backlogLeft = Math.floor(s.backlog);
  const rate = idleRate(s);
  const arc = e.arc ? ARC_BY_ID[e.arc.id] : null;
  const typingNow = now - s.lastKeyAt < 4000;

  let breakingLeft = 0;
  if (e.breaking && !e.breaking.failed) breakingLeft = Math.max(0, e.breaking.startedAt + e.breaking.limit - performance.now());

  return (
    <div className={`typing-panel ${shake ? 'shake' : ''} ${e.breaking ? 'breaking' : ''}`}>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.big ? 'big' : ''}`}>
            <span className="toast-emoji">{t.emoji}</span>
            <span>
              <span className="toast-title">{t.title}</span>
              {t.lines.map((l) => (
                <span key={l} className="toast-line">{l}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      {e.breaking && (
        <div className={`breaking-banner ${e.breaking.failed ? 'failed' : ''}`}>
          {e.breaking.failed ? (
            <span>⌛ Too slow — no jackpot this time. Finish it anyway!</span>
          ) : (
            <>
              <span>🚨 BREAKING NEWS! Words pay ×{BREAKING_WORD_MULT} — finish in <b>{(breakingLeft / 1000).toFixed(1)}s</b> for a JACKPOT</span>
              <span className="breaking-bar"><span style={{ width: `${(breakingLeft / e.breaking.limit) * 100}%` }} /></span>
            </>
          )}
        </div>
      )}

      <div className="story-head">
        <span className="story-tags">
          {arc ? (
            <span className="story-tag arc">{arc.emoji} {arc.title} · part {e.arc!.part + 1}/{arc.parts.length}</span>
          ) : null}
          {e.ad && <span className="story-tag ad">💰 COMMERCIAL · sponsor pays ×{AD_MULT}</span>}
          <span className={`story-tag ${e.fresh ? 'fresh' : 'filler'}`}>
            {e.ad ? '📺 AD BREAK' : e.fresh ? `🗞️ FRESH ${mult(m.freshMult)}` : '📼 OLD NEWS'}
            {s.reveal.shop && <small>{backlogLeft > 0 ? ` · ${backlogLeft} waiting` : ' · none waiting'}</small>}
          </span>
        </span>
        <span className="cash-box">
          <span key={bump} className="cash-big">{money(cashShown)}</span>
          {rate > 0 && <span className="cash-rate">+{money(rate)}/s from helpers</span>}
        </span>
      </div>

      {firstTime && <div className="first-hint">👇 Just start typing the headline below</div>}

      <div className="story-text">
        {e.words.map((w, wi) => {
          const cls = [
            'word', e.done[wi] ? 'done' : '', wi === currentWord ? 'current' : '', e.wordErr[wi] && !e.done[wi] ? 'err' : '',
            wi === e.golden ? (e.wordErr[wi] ? 'golden lost' : 'golden') : '',
          ].join(' ');
          const chars: JSX.Element[] = [];
          const endWithSpace = wi === e.words.length - 1 ? w.end : w.end + 1;
          for (let i = w.start; i < endWithSpace; i++) {
            let state = 'pending';
            if (i < e.typed.length) state = fm !== -1 && i >= fm ? 'bad' : 'ok';
            const isSpace = e.text[i] === ' ';
            chars.push(
              <span key={i} ref={(el) => (charRefs.current[i] = el)} className={`ch ${state} ${isSpace ? 'sp' : ''}`}>
                {isSpace ? ' ' : e.text[i]}
              </span>,
            );
          }
          return <span key={wi} className={cls}>{chars}</span>;
        })}
        <div className="caret" ref={caretRef} />
        {popups.map((p) => (
          <div key={p.id} className={`popup ${p.kind}`} style={{ left: p.x, top: p.y }}>
            {p.text}
          </div>
        ))}
      </div>

      {nextPlan.current && (
        <div className="up-next">
          <span>NEXT</span> {nextPlan.current.text}
        </div>
      )}

      <div className="word-line">
        {rollingWpm != null && (
          <span className={`live-wpm ${typingNow ? '' : 'idle'}`} title="Your typing speed right now">
            ⚡ <b>{Math.round(rollingWpm)}</b> WPM
          </span>
        )}
        <span className="word-value">
          Each word ≈ <b key={Math.round(wordValue * 100)}>{money(wordValue)}</b>
        </span>
        {boost && (
          <span className="pill boost">{boost.emoji} {boost.label} ×{boost.mult} · {Math.ceil((boost.until - now) / 1000)}s</span>
        )}
        {e.golden >= 0 && !e.done[e.golden] && !e.wordErr[e.golden] && <span className="pill gold">⭐ Golden word: type it perfectly for ×{GOLDEN_MULT}!</span>}
        {combo >= 2 && <span className="pill hot">🔥 Combo {combo} · {mult(comboMult(combo, m.comboCap))}</span>}
        {moodMult(mood) >= 1.25 && <span className="pill hot">😄 Crowd cheering {mult(moodMult(mood))}</span>}
        {moodMult(mood) < 0.95 && <span className="pill cold">😠 Crowd booing {mult(moodMult(mood))}</span>}
        {hot > 1.05 && avg != null && liveWpm != null && <span className="pill hot">⚡ beating your avg {mult(hot)}</span>}
        {era === 2 && <span className={`pill ${signal > 0.75 ? 'hot' : signal < 0.35 ? 'cold' : ''}`}>📶 Signal {mult(sigM)}</span>}
        {era >= 3 && (
          <span className={`pill ratings ${deadAir ? 'cold dead' : ratings > 0.75 ? 'hot' : ratings < 0.35 ? 'cold' : ''}`} title="Keep talking to keep viewers watching">
            {deadAir ? '📴 DEAD AIR — keep talking!' : `📺 Ratings ${mult(sigM)}`}
            <span className="ratings-bar"><span style={{ width: `${ratings * 100}%` }} /></span>
          </span>
        )}
      </div>

      {sg && (
        <button className={`suggest ${sg.affordable ? 'ready' : ''}`} onClick={() => sg.affordable && buySuggestion(sg)}>
          <span className="suggest-emoji">{sg.emoji}</span>
          <span className="suggest-main">
            <span className="suggest-name">{sg.name}</span>
            <span className="suggest-detail">{sg.detail}</span>
          </span>
          {sg.affordable ? (
            <span className="suggest-key"><kbd>Enter</kbd> buy {money(sg.cost)}</span>
          ) : (
            <span className="suggest-progress">
              <span className="suggest-bar"><span style={{ width: `${Math.min(100, (s.cash / sg.cost) * 100)}%` }} /></span>
              {money(sg.cost)}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
