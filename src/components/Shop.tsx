import { useState } from 'react';
import { ERAS } from '../game/eras';
import { duration, fmt, money } from '../game/format';
import { buyStaff, buyUpgrade, evolve, previewUpgrade } from '../game/buy';
import { STAFF, maxAffordable, staffCost } from '../game/staff';
import { idleRate, staffRate, useGame } from '../game/state';
import { TAG_INFO, UPGRADES, upgradeTag } from '../game/upgrades';

type Tab = 'staff' | 'upgrades' | 'evolve';

export function Shop() {
  const [tab, setTab] = useState<Tab>('staff');
  const s = useGame();
  const affordableUpgrades = UPGRADES.filter(
    (u) => u.era <= s.era && !s.upgrades.includes(u.id) && u.cost <= s.cash && (!u.needs || (s.staff[u.needs.staff] ?? 0) >= u.needs.count),
  ).length;
  const era = ERAS[s.era];
  const canEvolve = era.evolveCost != null && ERAS[s.era + 1]?.playable && s.cash >= era.evolveCost;

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
      </div>
      <div className="shop-body">
        {tab === 'staff' && <StaffTab />}
        {tab === 'upgrades' && <UpgradesTab />}
        {tab === 'evolve' && <EvolveTab />}
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
            <div className="shop-note">📺 Television arrives in the next update — anchors, Breaking News and Prime Time!</div>
          )}
        </div>
      )}
    </>
  );
}
