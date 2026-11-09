import { useState } from 'react';
import { ERAS } from '../game/eras';
import { duration, fmt, money } from '../game/format';
import { buyLegend, buyStaff, buyUpgrade, evolve, previewUpgrade, sellCompany } from '../game/buy';
import { STAFF, maxAffordable, staffCost } from '../game/staff';
import { fameFor, idleRate, prestigeUnlocked, staffRate, useGame } from '../game/state';
import { FAME_BONUS, LEGEND, TAG_INFO, UPGRADES, upgradeTag } from '../game/upgrades';

type Tab = 'staff' | 'upgrades' | 'evolve' | 'legend';

export function Shop() {
  const [tab, setTab] = useState<Tab>('staff');
  const s = useGame();
  const affordableUpgrades = UPGRADES.filter(
    (u) => u.era <= s.era && !s.upgrades.includes(u.id) && u.cost <= s.cash && (!u.needs || (s.staff[u.needs.staff] ?? 0) >= u.needs.count),
  ).length;
  const era = ERAS[s.era];
  const canEvolve = era.evolveCost != null && ERAS[s.era + 1]?.playable && s.cash >= era.evolveCost;
  const legendOpen = prestigeUnlocked(s) || s.fameTotal > 0;
  const canPerk = LEGEND.some((l) => !s.legend.includes(l.id) && l.cost <= s.fame && (!l.after || s.legend.includes(l.after)));

  return (
    <aside className="shop dimmable">
      <div className="tabs">
        <button className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>🧑‍🤝‍🧑 Helpers</button>
        {s.reveal.upgrades && (
          <button className={`${tab === 'upgrades' ? 'active' : ''} appear`} onClick={() => setTab('upgrades')}>
            🛠️ Upgrades {affordableUpgrades > 0 && <span className="badge">{affordableUpgrades}</span>}
          </button>
        )}
        {s.reveal.evolve && (
          <button className={`${tab === 'evolve' ? 'active' : ''} appear`} onClick={() => setTab('evolve')}>
            🧬 Evolve {canEvolve && <span className="badge pulse">!</span>}
          </button>
        )}
        {legendOpen && (
          <button className={`${tab === 'legend' ? 'active' : ''} appear`} onClick={() => setTab('legend')}>
            ⭐ Legend {canPerk && <span className="badge">!</span>}
          </button>
        )}
      </div>
      <div className="shop-body">
        {tab === 'staff' && <StaffTab />}
        {tab === 'upgrades' && <UpgradesTab />}
        {tab === 'evolve' && <EvolveTab />}
        {tab === 'legend' && <LegendTab />}
      </div>
    </aside>
  );
}

function StaffTab() {
  const s = useGame();
  const [qtyMode, setQtyMode] = useState<1 | 10 | 'max'>(1);
  const visible = STAFF.filter((d) => d.era <= s.era);
  const nextLocked = STAFF.find((d) => d.era > s.era);
  return (
    <>
      <div className="shop-note">
        <b>Helpers</b> shout the news for you. They earn money <b>every second</b> — even when the game is closed.
      </div>
      <div className="qty">
        {([1, 10, 'max'] as const).map((q) => (
          <button key={q} className={qtyMode === q ? 'active' : ''} onClick={() => setQtyMode(q)}>
            {q === 'max' ? 'MAX' : `×${q}`}
          </button>
        ))}
      </div>
      {visible.map((d) => {
        const owned = s.staff[d.id] ?? 0;
        const qty = qtyMode === 'max' ? Math.max(1, maxAffordable(d, owned, s.cash)) : qtyMode;
        const cost = staffCost(d, owned, qty);
        const can = cost <= s.cash;
        const rate = staffRate(s, d.id);
        return (
          <button
            key={d.id}
            className={`row ${can ? 'can' : ''}`}
            onClick={() => buyStaff(d.id, qty)}
          >
            <span className="row-emoji">{d.emoji}</span>
            <span className="row-main">
              <span className="row-title">{d.name} <span className="owned">{owned}</span></span>
              <span className="row-desc">{d.flavor}</span>
              <span className="row-earn">Earns {money(rate)} every second{owned > 0 && <> · you have {owned} = {money(rate * owned)}/s</>}</span>
            </span>
            <span className="row-cost">
              {qty > 1 && <small>×{qty}</small>}
              {money(cost)}
            </span>
          </button>
        );
      })}
      {nextLocked && (
        <div className="row locked">
          <span className="row-emoji">🔒</span>
          <span className="row-main">
            <span className="row-title">???</span>
            <span className="row-desc">New helpers arrive in the {ERAS[nextLocked.era].name} era.</span>
          </span>
        </div>
      )}
    </>
  );
}

function UpgradesTab() {
  const s = useGame();
  const available = UPGRADES.filter((u) => u.era <= s.era && !s.upgrades.includes(u.id)).sort((a, b) => a.cost - b.cost);
  const owned = UPGRADES.filter((u) => s.upgrades.includes(u.id));
  return (
    <>
      {available.length === 0 && <div className="shop-note">All upgrades bought for this era. Time to evolve! 🧬</div>}
      {available.map((u) => {
        const needOk = !u.needs || (s.staff[u.needs.staff] ?? 0) >= u.needs.count;
        const can = needOk && u.cost <= s.cash;
        const needName = u.needs ? STAFF.find((d) => d.id === u.needs!.staff)?.name : '';
        return (
          <button key={u.id} className={`row ${can ? 'can' : ''} ${!needOk ? 'dim' : ''}`} onClick={() => buyUpgrade(u.id)}>
            <span className="row-emoji">{u.emoji}</span>
            <span className="row-main">
              <span className="row-title">{u.name} <span className="tag-dot" style={{ background: TAG_INFO[upgradeTag(u)].color }} title={TAG_INFO[upgradeTag(u)].label} /></span>
              <span className="row-desc">{u.desc}</span>
              {needOk && previewUpgrade(s, u.id).map((l) => (
                <span key={l} className="row-earn">{l}</span>
              ))}
              {!needOk && <span className="row-need">🔒 Hire {u.needs!.count} {needName}s first (you have {s.staff[u.needs!.staff] ?? 0})</span>}
            </span>
            <span className="row-cost">{money(u.cost)}</span>
          </button>
        );
      })}
      {owned.length > 0 && (
        <div className="owned-list">
          <div className="owned-title">Owned ({owned.length})</div>
          <div className="owned-icons">
            {owned.map((u) => (
              <span key={u.id} title={`${u.name} — ${u.desc}`}>{u.emoji}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function EvolveTab() {
  const s = useGame();
  const era = ERAS[s.era];
  const next = ERAS[s.era + 1];
  const cost = era.evolveCost;
  const progress = cost ? Math.min(1, s.cash / cost) : 0;
  const rate = idleRate(s);
  const eta = cost && rate > 0 && s.cash < cost ? (cost - s.cash) / rate : null;
  const can = cost != null && next?.playable && s.cash >= cost;

  return (
    <>
      <div className="evo-path">
        {ERAS.map((e, i) => (
          <div key={e.id} className={`evo-node ${i < s.era ? 'past' : ''} ${i === s.era ? 'now' : ''} ${!e.playable ? 'soon' : ''}`}>
            <span className="evo-emoji">{e.emoji}</span>
            <span className="evo-text">
              <span className="evo-name">{e.name} <small>{e.year}</small></span>
              <span className="evo-skill">{e.skill}</span>
            </span>
            {!e.playable && <span className="evo-soon">soon</span>}
          </div>
        ))}
      </div>

      {next && (
        <div className="evo-box">
          <div className="evo-next">Next: {next.emoji} {next.name}</div>
          <div className="evo-desc">{next.description}</div>
          {next.playable ? (
            <>
              <div className="bar"><div className="bar-fill" style={{ width: `${progress * 100}%` }} /></div>
              <div className="evo-cost">{money(s.cash)} / {money(cost!)} {eta != null && <span>· ~{duration(eta)} idle</span>}</div>
              <button
                className={`evolve-btn ${can ? 'ready' : ''}`}
                disabled={!can}
                onClick={() => evolve()}
              >
                EVOLVE for {money(cost!)}
              </button>
              <div className="shop-note">You keep your staff and upgrades. Words pay {fmt(next.wordBase)}× base and new staff & upgrades appear.</div>
            </>
          ) : (
            <div className="shop-note">{next.emoji} {next.name} arrives in a future update. Meanwhile — try selling your company in the ⭐ Legend tab!</div>
          )}
        </div>
      )}
    </>
  );
}

function LegendTab() {
  const s = useGame();
  const [confirm, setConfirm] = useState(false);
  const gain = fameFor(s.lifetimeCash);
  const nextStarAt = (gain + 1) ** 2 * 1e9;
  const bonus = Math.round(s.fameTotal * FAME_BONUS * 100);
  const canSell = prestigeUnlocked(s) && gain >= 1;
  return (
    <>
      <div className="fame-head">
        <span className="fame-stars">⭐ {s.fame}</span>
        <span className="fame-sub">Fame to spend · all money <b>+{bonus}%</b> forever</span>
      </div>

      <div className="evo-box sell-box">
        <div className="evo-next">🗽 Sell your company</div>
        <div className="evo-desc">
          Sell everything and start over in the Town Square — but now you're <b>famous</b>.
        </div>
        <ul className="sell-list">
          <li>✅ Keep: ⭐ Fame, Legend perks, your typing records</li>
          <li>❌ Lose: money, helpers, upgrades</li>
          <li>⭐ Every star = +{FAME_BONUS * 100}% money forever</li>
        </ul>
        {prestigeUnlocked(s) ? (
          <>
            <button
              className={`evolve-btn ${canSell ? 'ready' : ''} ${confirm ? 'armed' : ''}`}
              disabled={!canSell}
              onClick={() => {
                if (!confirm) return setConfirm(true);
                setConfirm(false);
                sellCompany();
              }}
            >
              {canSell ? (confirm ? `Sure? Click again to sell for ${gain} ⭐` : `SELL for +${gain} ⭐`) : 'Earn more to get your first ⭐'}
            </button>
            <div className="shop-note">Next ⭐ when this company has earned {money(nextStarAt)} (now {money(s.lifetimeCash)}).</div>
          </>
        ) : (
          <div className="shop-note">🔒 Reach the 📺 TV era to unlock.</div>
        )}
        <div className="shop-note">🏆 Beat your speed record: <b>+1 ⭐</b> · reach a new average (40, 50, 60… WPM): <b>+3 ⭐</b></div>
      </div>

      <div className="owned-title">Legend perks — kept forever</div>
      {LEGEND.map((l) => {
        const owned = s.legend.includes(l.id);
        const locked = !!l.after && !s.legend.includes(l.after);
        const can = !owned && !locked && l.cost <= s.fame;
        return (
          <button key={l.id} className={`row ${can ? 'can' : ''} ${owned ? 'owned-row' : ''} ${locked ? 'dim' : ''}`} onClick={() => !owned && buyLegend(l.id)}>
            <span className="row-emoji">{l.emoji}</span>
            <span className="row-main">
              <span className="row-title">{l.name}</span>
              <span className="row-desc">{l.desc}</span>
              {locked && <span className="row-need">🔒 Buy {LEGEND.find((x) => x.id === l.after)?.name} first</span>}
            </span>
            <span className="row-cost">{owned ? '✓' : `${l.cost} ⭐`}</span>
          </button>
        );
      })}
    </>
  );
}
