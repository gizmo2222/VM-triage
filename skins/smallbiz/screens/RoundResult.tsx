import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Game, Incident } from '@engine/types';
import { allFindings } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { count, days, dollars } from '@skins/shared/format';
import { BusinessMap, type TileInfo } from '../components/BusinessMap';
import { CashPile } from '../components/CashPile';
import { usePrefersReducedMotion } from '../hooks';

interface Props {
  game: Game;
  pack: ScenarioPack;
  cashBefore: number;
  onNext: () => void;
}

const MONTH_MS = 650;
const BREAK_MS = 550;

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

  // Which month each break-in lands in. Spread across the quarter.
  const byMonth = useMemo(() => {
    const m: Incident[][] = [[], [], []];
    exploited.forEach((i, idx) => m[idx % 3]!.push(i));
    return m;
  }, [exploited]);

  /** -1 = not started, 0..2 = month in progress, 3 = done. */
  const [month, setMonth] = useState(reduced ? 3 : -1);
  const [revealedCount, setRevealedCount] = useState(reduced ? exploited.length : 0);
  const [breaking, setBreaking] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    let t = 200;
    let shown = 0;
    // Break-ins land in month order: all of month 0's, then month 1's, then month 2's.
    for (let m = 0; m < 3; m++) {
      at(t, () => setMonth(m));
      t += MONTH_MS;
      for (const inc of byMonth[m]!) {
        shown += 1;
        const n = shown;
        at(t, () => {
          setBreaking(new Set([inc.assetId]));
          setRevealedCount(n);
        });
        t += BREAK_MS;
      }
    }
    at(t, () => {
      setBreaking(new Set());
      setMonth(3);
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [reduced, byMonth]);

  const skip = () => {
    setMonth(3);
    setRevealedCount(exploited.length);
    setBreaking(new Set());
  };

  const done = month >= 3;
  // Reveal order must match the timeline: month 0's incidents, then month 1's, then month 2's.
  const inRevealOrder = useMemo(() => byMonth.flat(), [byMonth]);
  const revealed = inRevealOrder.slice(0, revealedCount);
  const lostSoFar = revealed.reduce((s, i) => s + i.impact.dollars, 0) + (done && audit ? audit.impact.dollars : 0);
  const cashNow = cashBefore - lostSoFar;

  const titles = useMemo(() => new Map(allFindings(pack).map((f) => [f.id, f.headline ?? f.plainTitle])), [pack]);
  const assetName = new Map(state.assets.map((a) => [a.id, a.name]));

  const hitsBefore = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of state.incidents) {
      if (i.round < state.round && i.cause === 'exploited') m.set(i.assetId, (m.get(i.assetId) ?? 0) + 1);
    }
    return m;
  }, [state.incidents, state.round]);

  const tiles: TileInfo[] = state.assets.map((asset) => ({
    asset,
    open: state.backlog.filter((f) => f.assetId === asset.id).length,
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
      <div class="round-head">
        <h1 tabIndex={-1}>{copy.reveal.kicker(pack.meta.roundLabel, state.round)}</h1>
        <div class="round-head__stats">
          <CashPile value={cashNow} ms={reduced ? 0 : 600} />
        </div>
      </div>

      <ol class="months" aria-hidden="true">
        {months.map((m, i) => (
          <li key={m} class={`month${i === month ? ' month--now' : ''}${i < month ? ' month--past' : ''}`}>
            {m}
          </li>
        ))}
      </ol>

      <BusinessMap tiles={tiles} icons={pack.meta.assetIcons} shaking={probed} breaking={breaking} compact />

      {!done && (
        <div class="reveal__status" role="status" aria-live="polite">
          <span>{copy.reveal.probing}</span>
          <button type="button" class="btn btn--sm" onClick={skip}>
            {copy.reveal.skip}
          </button>
        </div>
      )}

      <ul class="hits" aria-live="polite">
        {revealed.map((i) => (
          <li key={i.findingId} class="hit">
            <span class="hit__kicker">{copy.reveal.breakIn}</span>
            <span class="hit__title">
              <span aria-hidden="true">{pack.meta.assetIcons[i.assetId]} </span>
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
          {exploited.length === 0 && !audit && (
            <p class="quiet">
              <strong>{copy.reveal.quiet}</strong> <span class="muted">{copy.reveal.quietHint}</span>
            </p>
          )}
          <p class="voice">
            <span class="voice__who">{pack.meta.itPersonName}</span> “{line}”
          </p>
          {state.emergencyDebt > 0 && !finished && <p class="small muted">{copy.reveal.emergencyNext(state.emergencyDebt)}</p>}
          <button type="button" class="btn btn--brass btn--big btn--block" onClick={onNext}>
            {finished ? copy.reveal.finish : copy.reveal.next}
          </button>
        </div>
      )}
    </div>
  );
}
