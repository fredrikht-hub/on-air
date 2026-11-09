import { useEffect, useRef, useState } from 'react';
import { Confetti } from './components/Confetti';
import { Intro } from './components/Intro';
import { toast } from './game/buy';
import { Shop } from './components/Shop';
import { TypingPanel } from './components/TypingPanel';
import { TownScene } from './components/TownScene';
import { NewspaperScene } from './components/NewspaperScene';
import { RadioScene } from './components/RadioScene';
import { TVScene } from './components/TVScene';
import { GlobalScene } from './components/GlobalScene';
import { ERAS } from './game/eras';
import { duration, fmt, money } from './game/format';
import { mods, recentAvgWpm, skillFactor, useGame } from './game/state';

export function App() {
  const s = useGame();
  const [modal, setModal] = useState<'settings' | 'stats' | null>(null);
  const [eraBanner, setEraBanner] = useState<number | null>(null);
  const era = ERAS[s.era];
  const m = mods(s);

  // game loop
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(3600, (now - last) / 1000);
      last = now;
      useGame.getState().tick(dt);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // buttons shouldn't keep focus (space would "click" them while typing)
  useEffect(() => {
    const blur = () => {
      const a = document.activeElement as HTMLElement | null;
      if (a && a.tagName === 'BUTTON') a.blur();
    };
    window.addEventListener('mouseup', blur);
    return () => window.removeEventListener('mouseup', blur);
  }, []);

  // new-era celebration
  const prevEra = useRef(s.era);
  useEffect(() => {
    if (s.era > prevEra.current) {
      setEraBanner(s.era);
      const t = window.setTimeout(() => setEraBanner(null), 3200);
      prevEra.current = s.era;
      return () => window.clearTimeout(t);
    }
    prevEra.current = s.era;
  }, [s.era]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', era.theme.accent);
    if (era.fonts) {
      root.setProperty('--title', era.fonts.title);
      root.setProperty('--type', era.fonts.type);
    }
  }, [era]);

  // weekly progress note (once per day): compare this week's average speed with last week's
  useEffect(() => {
    if (!s.introSeen) return;
    const t = window.setTimeout(() => {
      const st = useGame.getState();
      const today = new Date().toISOString().slice(0, 10);
      if (st.lastWeeklyNote === today) return;
      const now = Date.now();
      const week = 7 * 864e5;
      const thisWeek = st.history.filter((h) => h.t >= now - week);
      const lastWeek = st.history.filter((h) => h.t < now - week && h.t >= now - 2 * week);
      if (thisWeek.length < 5 || lastWeek.length < 5) return;
      const a = thisWeek.reduce((x, h) => x + h.wpm, 0) / thisWeek.length;
      const b = lastWeek.reduce((x, h) => x + h.wpm, 0) / lastWeek.length;
      const pct = Math.round(((a - b) / b) * 100);
      st.patch({ lastWeeklyNote: today });
      toast(
        pct > 0
          ? { emoji: '📈', title: `You're ${pct}% faster than last week!`, lines: [`${Math.round(b)} → ${Math.round(a)} WPM. Keep going!`], big: true }
          : { emoji: '💪', title: 'New week, new records!', lines: [`Last week you averaged ${Math.round(b)} WPM. Can you beat it?`] },
      );
    }, 1500);
    return () => window.clearTimeout(t);
  }, [s.introSeen]);

  // focus mode: while typing, everything except the story dims
  const typing = Date.now() - s.lastKeyAt < 1500;
  const paused = modal != null || s.offline != null || !s.introSeen;

  return (
    <div className={`app ${typing ? 'focus' : ''} ${s.reveal.shop ? '' : 'solo'}`}>
      <header className="topbar dimmable">
        <div className="logo">
          <span className="logo-dot" /> ON AIR
        </div>
        <div className="era-pill">{era.emoji} {era.name}</div>
        {s.fameTotal > 0 && <div className="era-pill fame-pill" title="Fame: every star you ever earned adds 5% to all money">⭐ {s.fame}</div>}
        <div style={{ flex: 1 }} />
        {s.history.length >= 3 && <RoadTo120 />}
        {s.totals.stories >= 3 && (
          <button className="icon-btn" onClick={() => setModal('stats')} title="Your progress">📈</button>
        )}
        <button className="icon-btn" onClick={() => setModal('settings')} title="Settings">⚙️</button>
      </header>

      <main className="main">
        <section className="left">
          {s.era === 0 ? <TownScene /> : s.era === 1 ? <NewspaperScene /> : s.era === 2 ? <RadioScene /> : s.era === 3 ? <TVScene /> : <GlobalScene />}
          <TypingPanel paused={paused} />
        </section>
        {s.reveal.shop && <Shop />}
      </main>

      <Confetti />
      {!s.introSeen && <Intro />}

      {s.introSeen && s.offline && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">📡 Welcome back!</div>
            <p>You were away for <b>{duration(s.offline.seconds)}</b>.</p>
            {s.offline.cash >= 1 && <p>Your staff earned <b className="green">{money(s.offline.cash)}</b>.</p>}
            {s.offline.stories > 0 && (
              <p>
                <b className="accent">{s.offline.stories} fresh stories</b> piled up — they pay {m.freshMult}× when you type them!
              </p>
            )}
            <button className="big-btn" onClick={s.dismissOffline}>Back on air ▶</button>
          </div>
        </div>
      )}

      {modal === 'settings' && <Settings onClose={() => setModal(null)} />}
      {modal === 'stats' && <Stats onClose={() => setModal(null)} />}

      {eraBanner != null && (
        <div className="era-banner">
          <div className="era-banner-emoji">{ERAS[eraBanner].emoji}</div>
          <div className="era-banner-title">NEW ERA: {ERAS[eraBanner].name.toUpperCase()}</div>
          <div className="era-banner-sub">{ERAS[eraBanner].skill}</div>
        </div>
      )}
    </div>
  );
}

function RoadTo120() {
  const s = useGame();
  const avg = recentAvgWpm(s) ?? 0;
  const pct = Math.min(100, (avg / 120) * 100);
  return (
    <div className="road" title="Your average speed (last 20 headlines) on the way to 120 WPM">
      <span className="road-label">Road to 120</span>
      <span className="road-track">
        {[30, 60, 90].map((m) => (
          <i key={m} style={{ left: `${(m / 120) * 100}%` }} />
        ))}
        <span className="road-fill" style={{ width: `${pct}%` }} />
        <span className="road-you" style={{ left: `${pct}%` }}>{Math.round(avg)}</span>
      </span>
      <span className="road-flag">🏁</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Stats({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const avg = recentAvgWpm(s);
  const acc = s.totals.keys ? (s.totals.correctKeys / s.totals.keys) * 100 : 100;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">📈 Your progress</div>
        <div className="stats-grid">
          <Stat label="Avg WPM (last 20)" value={avg == null ? '—' : Math.round(avg).toString()} />
          <Stat label="Best WPM" value={Math.round(s.totals.bestWpm).toString()} />
          <Stat label="Accuracy" value={`${acc.toFixed(1)}%`} />
          <Stat label="Best combo" value={s.bestCombo.toString()} />
          <Stat label="Staff skill boost" value={`×${skillFactor(s).toFixed(2)}`} />
          <Stat label="Stories filed" value={fmt(s.totals.stories)} />
          <Stat label="Words typed" value={fmt(s.totals.words)} />
          <Stat label="Time played" value={duration(s.totals.playSeconds)} />
          <Stat label="Lifetime cash" value={money(s.pastCash + s.lifetimeCash)} />
          {s.sales > 0 && <Stat label="Companies sold" value={fmt(s.sales)} />}
        </div>
        <p className="muted">Your staff work at the speed of your 7-day average. Type faster → everything earns more.</p>
        <button className="big-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">⚙️ Settings</div>
        <label className="toggle">
          <input type="checkbox" checked={s.settings.sound} onChange={(e) => s.setSound(e.target.checked)} /> Sound effects
        </label>
        <div className="howto">
          <b>How to play</b>
          <span>Type the headline. Fix mistakes with <kbd>Backspace</kbd> (<kbd>Ctrl</kbd>+<kbd>Backspace</kbd> clears a word).</span>
          <span>Perfect words build your combo — one typo resets it.</span>
          <span>Press <kbd>Enter</kbd> any time to buy the suggested item.</span>
        </div>
        <button
          className={`danger-btn ${confirm ? 'armed' : ''}`}
          onClick={() => {
            if (confirm) {
              s.hardReset();
              onClose();
            } else setConfirm(true);
          }}
        >
          {confirm ? 'Click again to erase everything' : 'Reset save'}
        </button>
        <button className="big-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
