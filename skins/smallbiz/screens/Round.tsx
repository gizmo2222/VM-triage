import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy, sortChipsFor } from '@content/copy/smallbiz';
import { BusinessMap, type TileInfo } from '../components/BusinessMap';
import { FindingCard } from '../components/FindingCard';
import { CashPile } from '../components/CashPile';

interface Props {
  game: Game;
  pack: ScenarioPack;
  cash: number;
  onCommit: (ids: Id[]) => void;
}

export function Round({ game, pack, cash, onCommit }: Props) {
  const { state } = game;
  const [selected, setSelected] = useState<Set<Id>>(new Set());
  const [chip, setChip] = useState<StrategyId | null>(null);
  const [order, setOrder] = useState<Id[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const chips = useMemo(() => sortChipsFor(pack.meta), [pack.meta]);
  const byId = useMemo(() => new Map(state.backlog.map((f) => [f.id, f])), [state.backlog]);
  const hitsByAsset = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of state.incidents) if (i.cause === 'exploited') m.set(i.assetId, (m.get(i.assetId) ?? 0) + 1);
    return m;
  }, [state.incidents]);

  const tiles: TileInfo[] = useMemo(
    () =>
      state.assets.map((asset) => ({
        asset,
        open: state.backlog.filter((f) => f.assetId === asset.id).length,
        picked: state.backlog.filter((f) => f.assetId === asset.id && selected.has(f.id)).length,
        hits: hitsByAsset.get(asset.id) ?? 0,
      })),
    [state.assets, state.backlog, selected, hitsByAsset],
  );

  const ordered: Finding[] = useMemo(() => {
    if (!order) return state.backlog;
    return order.map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
  }, [order, state.backlog, byId]);

  const panelFindings = active ? ordered.filter((f) => f.assetId === active) : [];
  const activeAsset = state.assets.find((a) => a.id === active);

  const used = [...selected].reduce((s, id) => s + (byId.get(id)?.fixCost ?? 0), 0);
  const left = state.capacity - used;

  const toggle = (f: Finding) => {
    const next = new Set(selected);
    if (next.has(f.id)) next.delete(f.id);
    else if (f.fixCost <= left) next.add(f.id);
    else return;
    setSelected(next);
    setChip(null);
  };

  const useChip = (id: StrategyId) => {
    setSelected(new Set(autoPick(game, id)));
    setOrder(rankBacklog(game, id).map((f) => f.id));
    setChip(id);
  };

  const clear = () => {
    setSelected(new Set());
    setChip(null);
    setOrder(null);
  };

  useEffect(() => {
    if (active && panelRef.current) panelRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const firstRound = state.round === 1;
  const total = state.capacity;
  const brokeLastRound = state.history[state.history.length - 1]?.incidents.filter((i) => i.cause === 'exploited').length ?? 0;
  const picks = [...selected].map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));

  return (
    <div class="round">
      <div class="round-head">
        <h1 tabIndex={-1}>{copy.round.title(state.round, pack.config.rounds, pack.meta.roundLabel)}</h1>
        <div class="round-head__stats">
          <CashPile value={cash} ms={0} />
          <div class="meter" role="status" aria-live="polite" aria-label={copy.round.pointsLabel}>
            {copy.round.points(left, total)}
          </div>
        </div>
      </div>

      {state.emergencyDebt > 0 && (
        <p class="strip strip--bad">
          <span class="strip__kicker">{copy.round.emergencyKicker}</span>
          {copy.round.emergencyBody(brokeLastRound, Math.min(state.emergencyDebt, pack.config.capacityPerRound))}
        </p>
      )}

      {state.currentEvent && (
        <section class="news" aria-labelledby="event-title">
          <span class="news__kicker">{copy.round.eventKicker}</span>
          <h2 id="event-title" class="news__title">
            {state.currentEvent.plainTitle}
          </h2>
          <p class="news__body">{state.currentEvent.plainBody}</p>
        </section>
      )}

      <div class="chips" role="group" aria-label={copy.round.sortLabel}>
        <span class="chips__label">{copy.round.sortLabel}</span>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            class="chip"
            aria-pressed={chip === c.id}
            aria-label={`${c.label}. ${c.hint}`}
            onClick={() => useChip(c.id)}
          >
            {c.label}
          </button>
        ))}
        {(selected.size > 0 || order) && (
          <button type="button" class="chip chip--ghost" onClick={clear}>
            {copy.round.clear}
          </button>
        )}
      </div>

      {firstRound && !active && selected.size === 0 && <p class="coach">{copy.round.coach.tapRoom}</p>}

      <BusinessMap
        tiles={tiles}
        icons={pack.meta.assetIcons}
        activeId={active ?? undefined}
        onSelect={(id) => setActive(id === active ? null : id)}
      />

      {activeAsset && (
        <section class="panel" ref={panelRef} aria-labelledby="panel-title">
          <div class="panel__head">
            <h2 id="panel-title" class="panel__title">
              <span aria-hidden="true">{pack.meta.assetIcons[activeAsset.id]} </span>
              {copy.round.panelTitle(activeAsset.name, panelFindings.length)}
            </h2>
            <button type="button" class="btn btn--sm" onClick={() => setActive(null)}>
              {copy.round.close}
            </button>
          </div>
          <p class="small muted">{pack.meta.assetNotes[activeAsset.id]}</p>
          {firstRound && selected.size === 0 && <p class="coach">{copy.round.coach.tapProblem}</p>}
          <ul class="fcards">
            {panelFindings.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                picked={selected.has(f.id)}
                fits={f.fixCost <= left}
                badge={pack.meta.audit.badge}
                onToggle={() => toggle(f)}
              />
            ))}
          </ul>
        </section>
      )}

      {picks.length > 0 && (
        <section class="picks" aria-labelledby="picks-title">
          <h2 id="picks-title" class="picks__title">
            {copy.round.picksHeading(picks.length)}
          </h2>
          <ul class="picks__list">
            {picks.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  class="pick"
                  onClick={() => toggle(f)}
                  aria-label={`${copy.round.remove}: ${f.headline ?? f.plainTitle}`}
                >
                  <span aria-hidden="true">{pack.meta.assetIcons[f.assetId]} </span>
                  <span class="pick__text">{f.headline ?? f.plainTitle}</span>
                  <span class="pick__cost">{copy.round.cost(f.fixCost)}</span>
                  <span class="pick__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="commit-bar">
        <div class="commit-bar__inner">
          <span class="commit-bar__hint">
            {firstRound && selected.size > 0 ? copy.round.coach.pressFix : copy.round.commitHint(left)}
          </span>
          <button type="button" class="btn btn--brass" onClick={() => onCommit([...selected])} disabled={left < 0}>
            {copy.round.commit(selected.size)}
          </button>
        </div>
      </div>
    </div>
  );
}
