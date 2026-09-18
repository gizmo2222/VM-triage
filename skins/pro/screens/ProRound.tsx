import { useMemo, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, exploitProbability, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { METHODS, pro } from '@content/copy/pro';
import { dollars } from '@skins/shared/format';
import { FindingTable } from '../components/FindingTable';

interface Props {
  game: Game;
  pack: ScenarioPack;
  debug?: boolean;
  onCommit: (ids: Id[]) => void;
}

export function ProRound({ game, pack, debug, onCommit }: Props) {
  const { state } = game;
  const [selected, setSelected] = useState<Set<Id>>(new Set());
  const [method, setMethod] = useState<StrategyId | null>(null);
  const [order, setOrder] = useState<Id[] | null>(null);

  const byId = useMemo(() => new Map(state.backlog.map((f) => [f.id, f])), [state.backlog]);
  const rows: Finding[] = useMemo(() => {
    if (!order) return state.backlog;
    return order.map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
  }, [order, state.backlog, byId]);

  const used = [...selected].reduce((s, id) => s + (byId.get(id)?.fixCost ?? 0), 0);
  const left = state.capacity - used;
  const lossToDate = state.incidents.reduce((s, i) => s + i.impact.dollars, 0);
  const auditActive = state.modifiers.some((m) => m.effect.kind === 'audit');
  const boosts = new Map<string, number>();
  for (const m of state.modifiers) if (m.effect.kind === 'likelihoodBoost') boosts.set(m.effect.tag, m.effect.multiplier);

  const toggle = (f: Finding) => {
    const next = new Set(selected);
    if (next.has(f.id)) next.delete(f.id);
    else if (f.fixCost <= left) next.add(f.id);
    else return;
    setSelected(next);
    setMethod(null);
  };

  const useMethod = (id: StrategyId | null) => {
    setMethod(id);
    if (!id) {
      setSelected(new Set());
      setOrder(null);
      return;
    }
    setSelected(new Set(autoPick(game, id)));
    setOrder(rankBacklog(game, id).map((f) => f.id));
  };

  const odds = (f: Finding) => {
    if (!debug) return undefined;
    const asset = state.assets.find((a) => a.id === f.assetId);
    const tl = game.truth.trueLikelihood[f.id];
    if (!asset || tl === undefined) return undefined;
    return `p ${Math.round(exploitProbability(f, asset, tl, state.modifiers) * 100)}%`;
  };

  const debt = Math.min(state.emergencyDebt, pack.config.capacityPerRound);

  return (
    <div class="round">
      <header class="round-head">
        <h1 tabIndex={-1}>{pro.round.sprint(state.round, pack.config.rounds)}</h1>
        <div class="stats">
          <div class="stat">
            <span class="stat__label">{pro.round.lossToDate}</span>
            <span class="stat__value">{dollars(lossToDate)}</span>
          </div>
          <div class="stat stat--cap" role="status" aria-live="polite" aria-label={pro.round.capacityLabel}>
            <span class="stat__label">{pro.round.capacityLabel}</span>
            <span class="stat__value">
              {pro.round.capacity(left, state.capacity)}
              {debt > 0 && <span class="tag tag--bad">{pro.round.debt(debt)}</span>}
            </span>
          </div>
        </div>
      </header>

      {state.currentEvent && (
        <section class="event" aria-labelledby="event-title">
          <span class="kicker">{pro.round.event}</span>
          <h2 id="event-title">{state.currentEvent.techTitle}</h2>
          <p>{state.currentEvent.techBody}</p>
        </section>
      )}

      <fieldset class="methods-pick">
        <legend>
          {pro.round.method} <span class="muted small">{pro.round.methodHint}</span>
        </legend>
        <div class="radios">
          <label class="radio">
            <input type="radio" name="method" checked={method === null} onChange={() => useMethod(null)} />
            <span>{pro.round.methodNone}</span>
          </label>
          {METHODS.filter((m) => m.pick).map((m) => (
            <label key={m.id} class="radio" title={m.rule}>
              <input type="radio" name="method" checked={method === m.id} onChange={() => useMethod(m.id)} />
              <span>{m.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <FindingTable
        findings={rows}
        assets={state.assets}
        selected={selected}
        left={left}
        auditActive={auditActive}
        boosts={boosts}
        debug={debug ? odds : undefined}
        onToggle={toggle}
      />

      <div class="commit">
        <span class="muted">{pro.round.picked(used, state.capacity)}</span>
        <button type="button" class={selected.size ? 'btn btn--brass' : 'btn'} onClick={() => onCommit([...selected])} disabled={left < 0}>
          {pro.round.commit(selected.size)}
        </button>
      </div>
    </div>
  );
}
