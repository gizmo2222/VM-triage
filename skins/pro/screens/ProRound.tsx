import { useMemo, useState } from 'preact/hooks';
import type { Finding, Game, Id, StrategyId } from '@engine/types';
import { autoPick, exploitProbability, rankBacklog } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { METHODS, pro } from '@content/copy/pro';
import { dollars } from '@skins/shared/format';
import { FindingTable } from '../components/FindingTable';
import { Pips } from '../components/Pips';

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
  const [showMore, setShowMore] = useState(false);

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

  // Row tags for this sprint's immediate event effects.
  const rowTags = useMemo(() => {
    const tags = new Map<Id, string[]>();
    const add = (id: Id, t: string) => tags.set(id, [...(tags.get(id) ?? []), t]);
    for (const eff of state.currentEvent?.effects ?? []) {
      if (eff.kind === 'markKnownExploited') add(eff.findingId, pro.round.newKevTag);
      if (eff.kind === 'addAsset') for (const f of eff.findings) add(f.id, pro.round.newAssetTag);
      if (eff.kind === 'setExposure' && eff.internetExposed) {
        for (const f of state.backlog) if (f.assetId === eff.assetId) add(f.id, pro.round.nowExposedTag);
      }
    }
    return tags;
  }, [state.currentEvent, state.backlog]);

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
  const primary = METHODS.filter((m) => m.primary);
  const secondary = METHODS.filter((m) => !m.primary);
  const moreOpen = showMore || secondary.some((m) => m.id === method);

  const pill = (m: (typeof METHODS)[number]) => (
    <label key={m.id} class="radio" title={m.rule}>
      <input type="radio" name="method" checked={method === m.id} aria-label={`${m.name}. ${m.rule}`} onChange={() => useMethod(m.id)} />
      <span>{m.short}</span>
    </label>
  );

  return (
    <div class="round">
      <header class="round-head">
        <div>
          <h1 tabIndex={-1}>{pro.round.sprint(state.round, pack.config.rounds)}</h1>
          <Pips current={state.round} total={pack.config.rounds} label={pro.a11y.progress} />
        </div>
        <dl class="stats">
          <div class="stat">
            <dt>{pro.round.lossToDate}</dt>
            <dd>{dollars(lossToDate)}</dd>
          </div>
          <div class="stat stat--cap" role="status" aria-live="polite">
            <dt>{pro.round.capacityLabel}</dt>
            <dd>
              {pro.round.capacity(left, state.capacity)}
              {debt > 0 && <span class="tag tag--bad">{pro.round.debt(debt)}</span>}
            </dd>
          </div>
        </dl>
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
          {primary.map(pill)}
          {moreOpen && secondary.map(pill)}
          <button type="button" class="radio radio--more" aria-expanded={moreOpen} onClick={() => setShowMore(!moreOpen)}>
            {moreOpen ? pro.round.less : `${pro.round.more} (${secondary.length})`}
          </button>
        </div>
      </fieldset>

      <FindingTable
        findings={rows}
        assets={state.assets}
        selected={selected}
        left={left}
        auditActive={auditActive}
        boosts={boosts}
        rowTags={rowTags}
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
