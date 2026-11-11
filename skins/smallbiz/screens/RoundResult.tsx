import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Game, Incident } from '@engine/types';
import { allFindings } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { count, days, dollars } from '@skins/shared/format';
import { BusinessMap, exploitsByAsset, openOn, type TileInfo } from '../components/BusinessMap';
import { CashPile } from '../components/CashPile';
import { findingTitle } from '../components/FindingCard';
import { Icon } from '../components/Icon';
import { QuarterPips } from '../components/QuarterPips';
import { usePrefersReducedMotion } from '../hooks';
import { startReveal, type RevealRun } from '../reveal';

interface Props {
  game: Game;
  pack: ScenarioPack;
  cashBefore: number;
  onNext: () => void;
}

/**
 * The reveal. The quarter plays out month by month: tiles with open problems
 * shake as they are probed, the ones that break crack open, and the cash
 * pile drains. Then the summary.
 */
export function RoundResult({ game, pack, cashBefore, onNext }: Props) {
  const { state } = game;
  const record = state.history[state.history.length - 1];
  const reduced = usePrefersReducedMotion();
  const finished = state.phase === 'finished';

  const incidents = record?.incidents ?? [];
  const exploited = useMemo(() => incidents.filter((i) => i.cause === 'exploited'), [incidents]);
  const audit = incidents.find((i) => i.cause === 'audit');
  const months = copy.reveal.months[(state.round - 1) % 4]!;

  const byMonth = useMemo(() => {
    const m: Incident[][] = [[], [], []];
    exploited.forEach((i, idx) => m[idx % 3]!.push(i));
    return m;
  }, [exploited]);

  /** -1 = not started, 0..2 = month in progress, 3 = done. */
  const [month, setMonth] = useState(reduced ? 3 : -1);
  const [revealedCount, setRevealedCount] = useState(reduced ? exploited.length : 0);
  const [breaking, setBreaking] = useState<Set<string>>(new Set());

  const finish = () => {
    setMonth(3);
    setRevealedCount(exploited.length);
    setBreaking(new Set());
  };
  const run = useRef<RevealRun | null>(null);

  useEffect(() => {
    if (reduced) {
      finish();
      return;
    }
    const r = startReveal(byMonth, {
      month: setMonth,
      hit: (n, assetId) => {
        setBreaking(new Set([assetId]));
        setRevealedCount(n);
      },
      finish,
    });
    run.current = r;
    return () => {
      r.stop();
      run.current = null;
    };
  }, [reduced, byMonth]);

  const skip = () => (run.current ? run.current.skip() : finish());

  const done = month >= 3;
  // Skip (or the reveal ending under it) unmounts the focused button; hand focus to Next.
  const nextRef = useRef<HTMLButtonElement>(null);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      const a = document.activeElement;
      if (!a || a === document.body) nextRef.current?.focus();
    }
    wasDone.current = done;
  }, [done]);
  const inRevealOrder = useMemo(() => byMonth.flat(), [byMonth]);
  const revealed = inRevealOrder.slice(0, revealedCount);
  const lostSoFar = revealed.reduce((s, i) => s + i.impact.dollars, 0) + (done && audit ? audit.impact.dollars : 0);
  const cashNow = cashBefore - lostSoFar;
  const auditRan = state.modifiers.some((m) => m.effect.kind === 'audit' && m.expiresAfterRound >= state.round);
  const summary = exploited.length === 0 && !audit ? copy.reveal.quiet : copy.reveal.doneSummary(exploited.length, dollars(lostSoFar));

  const titles = useMemo(() => new Map(allFindings(pack).map((f) => [f.id, findingTitle(f)])), [pack]);
  const assetName = new Map(state.assets.map((a) => [a.id, a.name]));

  const hitsBefore = useMemo(() => exploitsByAsset(state.incidents, state.round), [state.incidents, state.round]);

  const tiles: TileInfo[] = state.assets.map((asset) => ({
    asset,
    open: openOn(state.backlog, asset.id),
    picked: 0,
    hits: (hitsBefore.get(asset.id) ?? 0) + revealed.filter((i) => i.assetId === asset.id).length,
  }));

  const probed = useMemo(() => {
    if (done || month < 0) return new Set<string>();
    const s = new Set<string>();
    for (const f of state.backlog) s.add(f.assetId);
    for (const i of exploited) s.add(i.assetId);
    return s;
  }, [done, month, state.backlog, exploited]);

  const voice = pack.meta.voice;
  const line = audit
    ? voice.audit
    : exploited.length === 0
      ? voice.quiet[(state.round - 1) % voice.quiet.length]
      : voice.breach[(state.round - 1) % voice.breach.length];

  return (
    <div class="reveal">
      <header class="round-head">
        <div>
          <h1 tabIndex={-1}>{copy.reveal.kicker(pack.meta.roundLabel, state.round)}</h1>
          <QuarterPips current={state.round} total={pack.config.rounds} label={pack.meta.roundLabel} />
        </div>
        <div class="round-head__stats">
          <CashPile value={cashNow} ms={reduced ? 0 : 600} announce={false} />
        </div>
      </header>

      <div class="round-grid">
        <div class="round-grid__board">
          <ol class="months" aria-hidden="true">
            {months.map((m, i) => (
              <li key={m} class={`month${i === month ? ' month--now' : ''}${i < month ? ' month--past' : ''}`}>
                {m}
              </li>
            ))}
          </ol>
          <BusinessMap tiles={tiles} icons={pack.meta.assetIcons} shaking={probed} breaking={breaking} compact />
          <p class="visually-hidden" role="status">
            {done ? summary : ''}
          </p>
          {!done && (
            <div class="reveal__status">
              <span>{copy.reveal.probing}</span>
              <button type="button" class="btn btn--sm" onClick={skip}>
                {copy.reveal.skip}
              </button>
            </div>
          )}
        </div>

        <div class="round-grid__side">
          <ul class="hits" aria-live="polite">
            {revealed.map((i) => (
              <li key={i.findingId} class="hit">
                <span class="hit__kicker">{copy.reveal.breakIn}</span>
                <span class="hit__title">
                  <Icon name={pack.meta.assetIcons[i.assetId]} />
                  {titles.get(i.findingId) ?? i.findingId}
                </span>
                <span class="hit__asset">{assetName.get(i.assetId) ?? i.assetId}</span>
                <span class="hit__impact">
                  <strong>{dollars(i.impact.dollars)}</strong>
                  {i.impact.downtimeDays > 0 && <span>{copy.reveal.closedFor(days(i.impact.downtimeDays))}</span>}
                  {i.impact.recordsExposed > 0 && <span>{copy.reveal.letters(count(i.impact.recordsExposed), pack.meta.people)}</span>}
                </span>
              </li>
            ))}
            {done && audit && (
              <li class="hit hit--audit">
                <span class="hit__kicker">
                  {pack.meta.audit.label}: {copy.reveal.auditFail}
                </span>
                <span class="hit__title">{copy.reveal.auditFailed(audit.relatedFindingIds?.length ?? 1, pack.meta.audit.name)}</span>
                <span class="hit__impact">
                  <strong>{copy.reveal.auditCost(dollars(audit.impact.dollars), pack.meta.audit.penalty)}</strong>
                </span>
              </li>
            )}
          </ul>

          {done && (
            <div class="reveal__done">
              {lostSoFar > 0 && <p class="reveal__total">{copy.reveal.quarterLost(dollars(lostSoFar))}</p>}
              {auditRan && !audit && (
                <p class="quiet">
                  <strong>{copy.reveal.auditPassed}</strong>
                </p>
              )}
              {exploited.length === 0 && !audit && (
                <p class="quiet">
                  <strong>{copy.reveal.quiet}</strong> <span class="muted">{copy.reveal.quietHint}</span>
                </p>
              )}
              <p class="voice">
                <span class="voice__who">{pack.meta.itPersonName}</span> “{line}”
              </p>
              {state.emergencyDebt > 0 && !finished && <p class="small muted">{copy.reveal.emergencyNext(state.emergencyDebt)}</p>}
              <button ref={nextRef} type="button" class="btn btn--brass btn--big btn--block" onClick={onNext}>
                {finished ? copy.reveal.finish : copy.reveal.next}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
