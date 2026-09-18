import { useMemo, useState } from 'preact/hooks';
import type { Game, Scorecard, StrategyId } from '@engine/types';
import { STRATEGY_IDS } from '@engine/types';
import { allFindings, longRun, longRunOrder, replayGrade } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { FORMULA, gradeForRatio, methodById, pro } from '@content/copy/pro';
import { dollars } from '@skins/shared/format';
import { buildUrl, seedToParam } from '@skins/shared/seed';

interface Props {
  game: Game;
  pack: ScenarioPack;
  baseId: string;
  isDaily: boolean;
  scorecard: Scorecard;
  onAgain: () => void;
  onNew: () => void;
  onOther: () => void;
}

const MISS = 0.2;

export function ProReport({ game, pack, baseId, isDaily, scorecard, onAgain, onNew, onOther }: Props) {
  const t = scorecard.player.totals;
  type Row = { id: StrategyId | 'you'; name: string; cost: number; incidents: number; fixes: number; byRound: string[][] };
  const rows: Row[] = [
    {
      id: 'you' as const,
      name: pro.report.you,
      cost: scorecard.player.totalCost,
      incidents: t.incidentCount,
      fixes: t.fixedCount,
      byRound: scorecard.player.fixedByRound,
    },
    ...STRATEGY_IDS.map((id) => ({
      id,
      name: methodById[id].name,
      cost: scorecard.strategies[id].totalCost,
      incidents: scorecard.strategies[id].totals.incidentCount,
      fixes: scorecard.strategies[id].totals.fixedCount,
      byRound: scorecard.strategies[id].fixedByRound,
    })),
  ].sort((a, b) => a.cost - b.cost || (a.id === 'you' ? -1 : 1));
  const best = rows[0]!.cost;

  const replay = useMemo(() => replayGrade(pack, game, STRATEGY_IDS, 100), [pack, game]);
  const grade = gradeForRatio(replay.ratio);
  const pct = Math.max(0, Math.round((replay.ratio - 1) * 100));
  const bestMethod = STRATEGY_IDS.reduce((a, b) => (replay.strategyMeans[a] <= replay.strategyMeans[b] ? a : b));

  const YEARS = 200;
  const lr = useMemo(() => longRun(pack, YEARS, STRATEGY_IDS), [pack]);
  const lrOrder = longRunOrder(lr);

  const findings = useMemo(() => new Map(allFindings(pack).map((f) => [f.id, f])), [pack]);
  const fixedRound = new Map<string, number>();
  const exploitedRound = new Map<string, number>();
  game.state.history.forEach((r) => r.fixedIds.forEach((id) => fixedRound.set(id, r.round)));
  game.state.incidents.forEach((i) => i.cause === 'exploited' && exploitedRound.set(i.findingId, i.round));
  const seen = [...new Set([...game.state.fixed, ...game.state.exploited, ...game.state.backlog.map((f) => f.id)])];
  const truthRows = seen
    .map((id) => {
      const f = findings.get(id);
      const tl = game.truth.trueLikelihood[id];
      const shown = f?.likelihood;
      const delta = f && tl !== undefined ? tl - f.likelihood : undefined;
      return { id, f, tl, shown, delta, ex: exploitedRound.get(id), fx: fixedRound.get(id) };
    })
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  const misses = truthRows.filter((r) => Math.abs(r.delta ?? 0) > MISS).length;
  const exploitedRows = truthRows.filter((r) => r.ex !== undefined);
  const exploitedUnderHalf = exploitedRows.filter((r) => (r.shown ?? 1) < 0.5).length;

  const shareUrl = buildUrl(baseId, game.state.seed);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // input remains selectable
    }
  };

  return (
    <div class="report">
      <h1 tabIndex={-1}>{pro.report.heading}</h1>
      <p class="muted">
        {pack.meta.name} · {pro.report.seedLine(seedToParam(game.state.seed), isDaily)}
      </p>
      <nav class="subnav" aria-label={pro.a11y.nav}>
        <a href="#grade-title">{pro.report.nav.grade}</a>
        <a href="#year-title">{pro.report.nav.year}</a>
        <a href="#lr-title">{pro.report.nav.longRun}</a>
        <a href="#truth-title">{pro.report.nav.truth}</a>
        <a href="#share-title">{pro.report.nav.share}</a>
      </nav>

      <section class="panel gradepanel" aria-labelledby="grade-title">
        <div class="stamp" aria-hidden="true">
          {grade}
        </div>
        <div>
          <h2 id="grade-title">{pro.report.replayHeading}</h2>
          <p>{pro.report.replayBody(replay.years, dollars(replay.yourMean), dollars(replay.strategyMeans[bestMethod]), pct, methodById[bestMethod].name)}</p>
        </div>
      </section>

      <section class="panel" aria-labelledby="year-title">
        <h2 id="year-title">{pro.report.thisYear}</h2>
        <div class="tablewrap tablewrap--free">
          <table class="ftable ftable--year">
            <thead>
              <tr>
                <th scope="col">{pro.report.cols.method}</th>
                <th scope="col" class="num">{pro.report.cols.cost}</th>
                <th scope="col" class="num">{pro.report.cols.delta}</th>
                <th scope="col" class="num">{pro.report.cols.incidents}</th>
                <th scope="col" class="num">{pro.report.cols.fixes}</th>
              </tr>
            </thead>
            {rows.map((r) => (
              <tbody key={r.id} class={r.id === 'you' ? 'is-you' : ''}>
                <tr>
                  <th scope="row">
                    {r.name}
                    {r.cost === best && <span class="tag tag--good">{pro.report.best}</span>}
                    {r.id === 'blended' && <span class="tag">{pro.report.recommended}</span>}
                  </th>
                  <td class="num">{dollars(r.cost)}</td>
                  <td class="num">{r.cost === best ? '—' : `+${dollars(r.cost - best)}`}</td>
                  <td class="num">{r.incidents}</td>
                  <td class="num">{r.fixes}</td>
                </tr>
                <tr class="picks-row">
                  <td colSpan={5}>
                    <details class="picks">
                      <summary>{pro.report.fixesToggle}</summary>
                      <ol>
                        {r.byRound.map((ids, i) => (
                          <li key={i}>
                            <span class="picks__q">S{i + 1}</span> {ids.length ? ids.map((id) => findings.get(id)?.techTitle ?? id).join(' · ') : '—'}
                          </li>
                        ))}
                      </ol>
                    </details>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section class="panel" aria-labelledby="lr-title">
        <h2 id="lr-title">{pro.report.longRunHeading(YEARS)}</h2>
        <div class="tablewrap tablewrap--free">
          <table class="ftable">
            <thead>
              <tr>
                <th scope="col">{pro.report.longRunCols.method}</th>
                <th scope="col" class="num">{pro.report.longRunCols.mean}</th>
                <th scope="col" class="num">{pro.report.longRunCols.win}</th>
              </tr>
            </thead>
            <tbody>
              {lrOrder.map((id) => (
                <tr key={id}>
                  <th scope="row">{methodById[id].name}</th>
                  <td class="num">{dollars(lr[id].meanCost)}</td>
                  <td class="num">{Math.round(lr[id].winShare * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="muted small">{pro.report.longRunNote}</p>
        <details class="fold fold--tight">
          <summary>{FORMULA.heading}</summary>
          <ol class="formula">
            {FORMULA.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </details>
      </section>

      <section class="panel" aria-labelledby="truth-title">
        <h2 id="truth-title">{pro.report.truthHeading}</h2>
        <p class="muted small">{pro.report.truthHint}</p>
        <p class="truth-summary">{pro.report.truthSummary(misses, truthRows.length, exploitedUnderHalf, exploitedRows.length)}</p>
        <div class="tablewrap tablewrap--free">
          <table class="ftable ftable--dense">
            <thead>
              <tr>
                <th scope="col">{pro.report.truthCols.finding}</th>
                <th scope="col" class="num">{pro.report.truthCols.epss}</th>
                <th scope="col" class="num">{pro.report.truthCols.p}</th>
                <th scope="col" class="num">{pro.report.truthCols.delta}</th>
                <th scope="col">{pro.report.truthCols.outcome}</th>
              </tr>
            </thead>
            <tbody>
              {truthRows.map((r) => (
                <tr key={r.id} class={`${r.ex ? 'is-bad' : ''}${Math.abs(r.delta ?? 0) > MISS ? ' is-miss' : ''}`}>
                  <th scope="row">{r.f?.techTitle ?? r.id}</th>
                  <td class="num">{r.shown !== undefined ? r.shown.toFixed(2) : '·'}</td>
                  <td class="num">{r.tl !== undefined ? r.tl.toFixed(2) : '·'}</td>
                  <td class="num">{r.delta !== undefined ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}` : '·'}</td>
                  <td>{r.ex ? pro.report.outcomeExploited(r.ex) : r.fx ? pro.report.outcomeFixed(r.fx) : pro.report.outcomeOpen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" aria-labelledby="share-title">
        <h2 id="share-title">{pro.report.shareHeading}</h2>
        <p class="muted small">{pro.report.shareHint}</p>
        <div class="share-row">
          <input type="text" readOnly value={shareUrl} aria-label={pro.report.shareHeading} onFocus={(e) => (e.target as HTMLInputElement).select()} />
          <button type="button" class="btn" onClick={copyLink} aria-live="polite">
            {copied ? pro.report.copied : pro.report.copy}
          </button>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn--brass" onClick={onAgain}>
            {pro.report.again}
          </button>
          <button type="button" class="btn" onClick={onNew}>
            {pro.report.tomorrow}
          </button>
          <button type="button" class="btn" onClick={onOther}>
            {pro.report.other}
          </button>
        </div>
      </section>
    </div>
  );
}
