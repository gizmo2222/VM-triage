import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, exploitProbability, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy, sortChipsFor } from '@content/copy/smallbiz';
import { BusinessMap, exploitsByAsset, openOn, type TileInfo } from '../components/BusinessMap';
import { FindingCard, findingTitle } from '../components/FindingCard';
import { CashPile } from '../components/CashPile';
import { Icon } from '../components/Icon';
import { QuarterPips } from '../components/QuarterPips';
import { usePrefersReducedMotion } from '../hooks';

interface Props {
  game: Game;
  pack: ScenarioPack;
  cash: number;
  /** Cash before last quarter's losses, so the pile settles in on open. */
  cashPrev: number;
  /** Playtest only: show each card's hidden exploit odds this quarter. */
  debug?: boolean;
  onCommit: (ids: Id[]) => void;
}

export function Round({ game, pack, cash, cashPrev, debug, onCommit }: Props) {
  const { state } = game;
  const [selected, setSelected] = useState<Set<Id>>(new Set());
  const [chip, setChip] = useState<StrategyId | null>(null);
  const [order, setOrder] = useState<Id[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  /**
   * Where focus goes after the next render, when the control that had it is
   * about to disappear (Close, a removed pick, Clear). Without this it falls
   * to <body> and keyboard users start again from the top.
   */
  const focusNext = useRef<((root: HTMLElement) => HTMLElement | null | undefined) | null>(null);
  useEffect(() => {
    const pick = focusNext.current;
    focusNext.current = null;
    if (pick && rootRef.current) pick(rootRef.current)?.focus();
  });

  const chips = useMemo(() => sortChipsFor(pack.meta), [pack.meta]);
  const byId = useMemo(() => new Map(state.backlog.map((f) => [f.id, f])), [state.backlog]);
  const hitsByAsset = useMemo(() => exploitsByAsset(state.incidents), [state.incidents]);

  const tiles: TileInfo[] = useMemo(
    () =>
      state.assets.map((asset) => ({
        asset,
        open: openOn(state.backlog, asset.id),
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
    setConfirmSkip(false);
  };

  const useChip = (id: StrategyId) => {
    setSelected(new Set(autoPick(game, id)));
    setOrder(rankBacklog(game, id).map((f) => f.id));
    setChip(id);
    setConfirmSkip(false);
  };

  const clear = () => {
    setSelected(new Set());
    setChip(null);
    setOrder(null);
    focusNext.current = (root) => root.querySelector<HTMLElement>('.chips .chip');
  };

  const closePanel = () => {
    const id = active;
    setActive(null);
    if (id) focusNext.current = (root) => root.querySelector<HTMLElement>(`.tile[data-asset="${id}"]`);
  };

  const removePick = (f: Finding, idx: number) => {
    toggle(f);
    focusNext.current = (root) => {
      const left = root.querySelectorAll<HTMLElement>('.pick');
      return left[idx] ?? left[idx - 1] ?? root.querySelector<HTMLElement>('.commit-bar .btn');
    };
  };

  // Opening an asset moves focus into its panel, which otherwise sits after
  // the rest of the map and the chips in tab order. Esc or Close hands it back.
  useEffect(() => {
    const panel = panelRef.current;
    if (!active || !panel) return;
    const narrow = window.innerWidth < 900;
    panel.querySelector<HTMLElement>('#panel-title')?.focus({ preventScroll: narrow });
    if (narrow) panel.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [active]);

  const firstRound = state.round === 1;
  const total = state.capacity;
  const debt = Math.min(state.emergencyDebt, pack.config.capacityPerRound);
  const eventDelta = state.modifiers.reduce((s, m) => (m.effect.kind === 'capacityDelta' ? s + m.effect.delta : s), 0);
  // Earlier events whose durational effects still act this quarter.
  const carried = state.history
    .map((r) => ({ round: r.round, event: pack.events.find((e) => e.id === r.eventId) }))
    .filter(
      (c) =>
        c.event &&
        c.event.effects.some((e) => e.kind === 'likelihoodBoost' || e.kind === 'capacityDelta' || e.kind === 'audit') &&
        c.round + (c.event.duration ?? 1) - 1 >= state.round,
    )
    .map((c) => c.event!);
  const auditActive = state.modifiers.some((m) => m.effect.kind === 'audit');
  const picks = [...selected].map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
  const hasPicks = picks.length > 0;
  const skipping = confirmSkip && !hasPicks;
  const nothingFits = left > 0 && !state.backlog.some((f) => !selected.has(f.id) && f.fixCost <= left);
  const odds = (f: Finding): string | undefined => {
    if (!debug) return undefined;
    const asset = state.assets.find((a) => a.id === f.assetId);
    const tl = game.truth.trueLikelihood[f.id];
    if (!asset || tl === undefined) return undefined;
    return `p ${Math.round(exploitProbability(f, asset, tl, state.modifiers) * 100)}%`;
  };

  return (
    <div class="round" ref={rootRef}>
      <header class="round-head">
        <div>
          <h1 tabIndex={-1}>{copy.round.title(state.round, pack.config.rounds, pack.meta.roundLabel)}</h1>
          <QuarterPips current={state.round} total={pack.config.rounds} label={pack.meta.roundLabel} />
        </div>
        <div class="round-head__stats">
          <CashPile value={cash} from={cashPrev} ms={900} />
          <div class="meter" role="status" aria-live="polite">
            <span class="meter__value">
              <span class="visually-hidden">{copy.round.pointsLabel}: </span>
              {copy.round.points(left, total)}
            </span>
            {debt > 0 && <span class="meter__tag">{copy.round.cleanupTag(debt)}</span>}
            {eventDelta !== 0 && <span class="meter__tag">{copy.round.eventTag(eventDelta)}</span>}
          </div>
        </div>
      </header>

      <div class="round-grid">
        <div class="round-grid__board">
          {state.currentEvent && (
            <details class="slip" key={state.currentEvent.id} open>
              <summary>
                <span class="slip__kicker">{copy.round.eventKicker}</span>
                <span class="slip__title">{state.currentEvent.plainTitle}</span>
              </summary>
              <p class="slip__body">{state.currentEvent.plainBody}</p>
            </details>
          )}
          {carried.map((ev) => (
            <details class="slip" key={`carry-${ev.id}`}>
              <summary>
                <span class="slip__title">{copy.round.stillOn(ev.plainTitle)}</span>
              </summary>
              <p class="slip__body">{ev.plainBody}</p>
            </details>
          ))}

          {firstRound && !active && selected.size === 0 && <p class="coach">{copy.round.coach.tapRoom}</p>}
          {debt > 0 && (
            <p class="voice">
              <span class="voice__who">{pack.meta.itPersonName}</span> “{pack.meta.voice.emergency}”
            </p>
          )}

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
            <section
              class="panel"
              id="asset-panel"
              ref={panelRef}
              aria-labelledby="panel-title"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closePanel();
                }
              }}
            >
              <div class="panel__head">
                <h2 id="panel-title" class="panel__title" tabIndex={-1}>
                  <Icon name={pack.meta.assetIcons[activeAsset.id]} size="1.2rem" />
                  {copy.round.panelTitle(activeAsset.name, panelFindings.length)}
                </h2>
                <button type="button" class="btn btn--sm" onClick={closePanel}>
                  {copy.round.close}
                </button>
                <a
                  class="skip-link skip-link--inline"
                  href="#commit"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('commit')?.focus();
                  }}
                >
                  {copy.round.goToFix}
                </a>
              </div>
              <p class="small muted">{pack.meta.assetNotes[activeAsset.id]}</p>
              {firstRound && selected.size === 0 && <p class="coach">{copy.round.coach.tapProblem}</p>}
              {panelFindings.length === 0 ? (
                <p class="small">{copy.round.panelClean}</p>
              ) : (
                <ul class="fcards">
                  {panelFindings.map((f) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      picked={selected.has(f.id)}
                      fits={f.fixCost <= left}
                      badge={auditActive ? pack.meta.audit.badge : undefined}
                      debug={odds(f)}
                      onToggle={() => toggle(f)}
                    />
                  ))}
                </ul>
              )}
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
                {picks.map((f, idx) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      class="pick"
                      onClick={() => removePick(f, idx)}
                      aria-label={`${copy.round.remove}: ${findingTitle(f)}`}
                    >
                      <Icon name={pack.meta.assetIcons[f.assetId]} />
                      <span class="pick__text">{findingTitle(f)}</span>
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
                {skipping
                  ? copy.round.skipHint(left)
                  : nothingFits
                    ? copy.round.nothingFits(left)
                    : firstRound && hasPicks
                      ? copy.round.coach.pressFix
                      : copy.round.commitHint(left)}
              </span>
              <button
                id="commit"
                type="button"
                class={hasPicks ? 'btn btn--brass' : 'btn'}
                onClick={() => {
                  if (!hasPicks && !confirmSkip) {
                    setConfirmSkip(true);
                    return;
                  }
                  onCommit([...selected]);
                }}
                disabled={left < 0}
              >
                {skipping ? copy.round.skipConfirm : copy.round.commit(picks.length)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
