import { useMemo, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy, instincts } from '@content/copy/smallbiz';

interface Props {
  game: Game;
  pack: ScenarioPack;
  onCommit: (ids: Id[]) => void;
}

export function Round({ game, pack, onCommit }: Props) {
  const { state } = game;
  const [selected, setSelected] = useState<Set<Id>>(new Set());
  const [instinct, setInstinct] = useState<StrategyId | null>(null);
  const [order, setOrder] = useState<Id[] | null>(null);

  const assetName = useMemo(() => new Map(state.assets.map((a) => [a.id, a.name])), [state.assets]);
  const byId = useMemo(() => new Map(state.backlog.map((f) => [f.id, f])), [state.backlog]);

  const list: Finding[] = useMemo(() => {
    if (!order) return state.backlog;
    return order.map((id) => byId.get(id)).filter((f): f is Finding => Boolean(f));
  }, [order, state.backlog, byId]);

  const used = [...selected].reduce((s, id) => s + (byId.get(id)?.fixCost ?? 0), 0);
  const left = state.capacity - used;

  const toggle = (f: Finding) => {
    const next = new Set(selected);
    if (next.has(f.id)) next.delete(f.id);
    else if (f.fixCost <= left) next.add(f.id);
    else return;
    setSelected(next);
    setInstinct(null);
  };

  const useInstinct = (id: StrategyId) => {
    setSelected(new Set(autoPick(game, id)));
    setOrder(rankBacklog(game, id).map((f) => f.id));
    setInstinct(id);
  };

  const clear = () => {
    setSelected(new Set());
    setInstinct(null);
    setOrder(null);
  };

  const total = pack.config.capacityPerRound;
  const baseCapacityLost = Math.max(0, state.emergencyDebt);
  const monthLabel = copy.round.monthOf(state.round, pack.config.rounds, pack.meta.roundLabel);

  return (
    <div>
      <div class="round-head">
        <h1 tabIndex={-1}>{monthLabel}</h1>
        <div class={`meter${left < 0 ? ' meter--over' : ''}`} role="status" aria-live="polite" aria-label={copy.a11y.pointsMeter}>
          {left >= 0 ? copy.round.pointsLeft(left, state.capacity) : copy.round.pointsOver(-left)}
        </div>
      </div>

      {baseCapacityLost > 0 && (
        <p class="small muted">{copy.round.emergencyNote(Math.min(baseCapacityLost, total))}</p>
      )}

      {state.currentEvent && (
        <section class="card card--warn" aria-labelledby="event-title">
          <span class="kicker">{copy.round.eventHeading}</span>
          <h2 id="event-title">{state.currentEvent.plainTitle}</h2>
          <p>{state.currentEvent.plainBody}</p>
        </section>
      )}

      <section class="card" aria-labelledby="instincts-title">
        <h2 id="instincts-title">{copy.round.instinctsHeading}</h2>
        <p class="small muted">{copy.round.instinctsHint}</p>
        <div class="instincts">
          {instincts.map((i) => (
            <button
              key={i.id}
              type="button"
              class="instinct"
              aria-pressed={instinct === i.id}
              onClick={() => useInstinct(i.id)}
            >
              <span class="instinct__label">{i.label}</span>
              <span class="instinct__blurb">{i.blurb}</span>
            </button>
          ))}
        </div>
        <button type="button" class="btn btn--sm" onClick={clear} disabled={selected.size === 0 && !order}>
          {copy.round.clearPicks}
        </button>
      </section>

      <section aria-labelledby="list-title">
        <h2 id="list-title">{copy.round.listHeading}</h2>
        <p class="small muted">{copy.round.listHint(state.backlog.length)}</p>
        <fieldset style="border:0;padding:0;margin:0">
          <legend class="visually-hidden">{copy.a11y.findingList}</legend>
          <ul class="findings">
            {list.map((f) => {
              const checked = selected.has(f.id);
              const fits = checked || f.fixCost <= left;
              return (
                <li key={f.id}>
                  <label class="finding">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!fits}
                      onChange={() => toggle(f)}
                    />
                    <span>
                      <span class="finding__title">{f.plainTitle}</span>
                      <span class="finding__meta">
                        <span class="finding__cost">{copy.round.cost(f.fixCost)}</span>
                        <span>{assetName.get(f.assetId) ?? f.assetId}</span>
                        {f.compliance && <span class="badge">{copy.round.askedAboutBadge}</span>}
                        {!fits && <span>{copy.round.tooExpensive}</span>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </section>

      <div class="commit-bar">
        <div class="commit-bar__inner">
          <span class="commit-bar__hint">{copy.round.commitHint}</span>
          <button type="button" class="btn btn--brass" onClick={() => onCommit([...selected])} disabled={left < 0}>
            {copy.round.commit(selected.size)}
          </button>
        </div>
      </div>
    </div>
  );
}
