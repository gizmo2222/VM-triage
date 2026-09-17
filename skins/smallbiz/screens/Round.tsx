import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy, sortChipsFor } from '@content/copy/smallbiz';
import { BusinessMap, type TileInfo } from '../components/BusinessMap';
import { FindingCard } from '../components/FindingCard';
import { CashPile } from '../components/CashPile';
import { Icon } from '../components/Icon';
import { QuarterPips } from '../components/QuarterPips';

interface Props {
  game: Game;
  pack: ScenarioPack;
  cash: number;
  /** Cash before last quarter's losses, so the pile settles in on open. */
  cashPrev: number;
  onCommit: (ids: Id[]) => void;
}

export function Round({ game, pack, cash, cashPrev, onCommit }: Props) {
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
    if (active && panelRef.current && window.innerWidth < 900) {
      panelRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [active]);

  const firstRound = state.round === 1;
  const total = state.capacity;
  const debt = Math.min(state.emergencyDebt, pack.config.capacityPerRound);
  const auditActive = state.modifiers.some((m) => m.effect.kind === 'audit');
  const picks = [...selected].map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
  const hasPicks = picks.length > 0;

  return (
    <div class="round">
      <header class="round-head">
        <div>
          <h1 tabIndex={-1}>{copy.round.title(state.round, pack.config.rounds, pack.meta.roundLabel)}</h1>
          <QuarterPips current={state.round} total={pack.config.rounds} label={pack.meta.roundLabel} />
        </div>
        <div class="round-head__stats">
          <CashPile value={cash} from={cashPrev} ms={900} />
          <div class="meter" role="status" aria-live="polite" aria-label={copy.round.pointsLabel}>
            <span class="meter__value">{copy.round.points(left, total)}</span>
            {debt > 0 && <span class="meter__tag">{copy.round.cleanupTag(debt)}</span>}
          </div>
        </div>
      </header>

      <div class="round-grid">
        <div class="round-grid__board">
          {state.currentEvent && (
            <details class="slip" open={state.round === pack.config.firstEventRound}>
              <summary>
                <span class="slip__kicker">{copy.round.eventKicker}</span>
                <span class="slip__title">{state.currentEvent.plainTitle}</span>
              </summary>
              <p class="slip__body">{state.currentEvent.plainBody}</p>
            </details>
          )}

          {firstRound && !active && selected.size === 0 && <p class="coach">{copy.round.coach.tapRoom}</p>}

          <BusinessMap
            tiles={tiles}
            icons={pack.meta.assetIcons}
            activeId={active ?? undefined}
            onSelect={(id) => setActive(id === active ? null : id)}
          />

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
        </div>

        <div class="round-grid__side">
          {activeAsset ? (
            <section class="panel" ref={panelRef} aria-labelledby="panel-title">
              <div class="panel__head">
                <h2 id="panel-title" class="panel__title">
                  <Icon name={pack.meta.assetIcons[activeAsset.id] ?? 'monitor'} size="1.2rem" />
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
                    badge={auditActive ? pack.meta.audit.badge : undefined}
                    onToggle={() => toggle(f)}
                  />
                ))}
              </ul>
            </section>
          ) : (
            <p class="panel-empty">{copy.round.panelEmpty}</p>
          )}

          {hasPicks && (
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
                      <Icon name={pack.meta.assetIcons[f.assetId] ?? 'monitor'} />
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
                {firstRound && hasPicks ? copy.round.coach.pressFix : copy.round.commitHint(left)}
              </span>
              <button
                type="button"
                class={hasPicks ? 'btn btn--brass' : 'btn'}
                onClick={() => onCommit([...selected])}
                disabled={left < 0}
              >
                {copy.round.commit(picks.length)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
