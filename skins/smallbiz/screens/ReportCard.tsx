import { useState } from 'preact/hooks';
import type { Game, Scorecard, StrategyId } from '@engine/types';
import { STRATEGY_IDS } from '@engine/types';
import type { ScenarioPack } from '@content/types';
import { copy, gradeForRank, strategyNamesFor } from '@content/copy/smallbiz';
import { count, dollars } from '@skins/shared/format';
import { buildUrl } from '@skins/shared/seed';
import { cta } from '../config';
import { CashPile } from '../components/CashPile';

interface Props {
  game: Game;
  pack: ScenarioPack;
  scorecard: Scorecard;
  onReplaySame: () => void;
  onReplayNew: () => void;
  onReplayOther: () => void;
}

export function ReportCard({ game, pack, scorecard, onReplaySame, onReplayNew, onReplayOther }: Props) {
  const grade = gradeForRank(scorecard.playerRank);
  const t = scorecard.player.totals;
  const names = strategyNamesFor(pack.meta);
  const auditDrawn = game.state.history.some(
    (r) => r.eventId && pack.events.find((e) => e.id === r.eventId)?.effects.some((x) => x.kind === 'audit'),
  );
  const cashLeft = pack.meta.cashOnHand - t.dollars;

  type Row = { id: StrategyId | 'you'; name: string; cost: number; incidents: number };
  const rows: Row[] = [
    { id: 'you' as const, name: copy.report.you, cost: scorecard.player.totalCost, incidents: t.incidentCount },
    ...STRATEGY_IDS.map((id) => ({
      id,
      name: names[id],
      cost: scorecard.strategies[id].totalCost,
      incidents: scorecard.strategies[id].totals.incidentCount,
    })),
  ].sort((a, b) => a.cost - b.cost || (a.id === 'you' ? -1 : 1));
  const maxCost = Math.max(1, ...rows.map((r) => r.cost));

  const shareUrl = buildUrl(pack.id, game.state.seed);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the input is selectable.
    }
  };

  return (
    <div class="report">
      <h1 tabIndex={-1}>{copy.report.heading}</h1>

      <section class="card card--brass gradecard" aria-labelledby="grade-title">
        <div class="stamp" aria-hidden="true">
          {grade}
        </div>
        <div>
          <h2 id="grade-title">
            {copy.report.gradeLabel}: {grade}
          </h2>
          <p>{copy.report.gradeBlurb[grade]}</p>
        </div>
      </section>

      <section class="card">
        <CashPile value={cashLeft} ms={900} big />
        <dl class="totals">
          <div>
            <dt>{copy.report.totals.lost}</dt>
            <dd>{dollars(t.dollars)}</dd>
          </div>
          <div>
            <dt>{copy.report.totals.breakIns}</dt>
            <dd>{t.incidentCount}</dd>
          </div>
          <div>
            <dt>{copy.report.totals.daysClosed}</dt>
            <dd>{Math.round(t.downtimeDays * 2) / 2}</dd>
          </div>
          <div>
            <dt>{copy.report.totals.letters}</dt>
            <dd>{count(t.recordsExposed)}</dd>
          </div>
          <div>
            <dt>{pack.meta.audit.label}</dt>
            <dd>{!auditDrawn ? copy.report.totals.none : t.auditFailure ? copy.report.totals.failed : copy.report.totals.passed}</dd>
          </div>
        </dl>
      </section>

      <section class="card" aria-labelledby="compare-title">
        <h2 id="compare-title">{copy.report.compareHeading}</h2>
        <p class="small muted">{copy.report.compareHint}</p>
        <ol class="bars">
          {rows.map((r) => (
            <li key={r.id} class={`bar${r.id === 'you' ? ' bar--you' : ''}`}>
              <span class="bar__name">
                {r.name}
                {r.id === 'you' && <span class="visually-hidden"> ({copy.a11y.picked})</span>}
              </span>
              <span class="bar__track">
                <span class="bar__fill" style={`width:${Math.max(3, (r.cost / maxCost) * 100)}%`} />
              </span>
              <span class="bar__value">{dollars(r.cost)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section class="card card--quiet">
        <p class="lesson">{copy.report.lesson}</p>
        <p>{copy.report.lessonDetail}</p>
      </section>

      <section class="card cta" aria-labelledby="cta-title">
        <span class="kicker">{cta.kicker}</span>
        <h2 id="cta-title">{cta.heading}</h2>
        <p>{cta.body}</p>
        <a class="btn btn--brass" href={cta.url}>
          {cta.buttonLabel}
        </a>
        {cta.finePrint && <p class="small" style="margin-top:0.75rem">{cta.finePrint}</p>}
      </section>

      <section class="card" aria-labelledby="replay-title">
        <h2 id="replay-title">{copy.report.replayHeading}</h2>
        <div class="btn-row">
          <button type="button" class="btn btn--primary" onClick={onReplaySame}>
            {copy.report.replaySame}
          </button>
          <button type="button" class="btn" onClick={onReplayNew}>
            {copy.report.replayNew}
          </button>
          <button type="button" class="btn" onClick={onReplayOther}>
            {copy.report.replayOther}
          </button>
        </div>
      </section>

      <section class="card" aria-labelledby="share-title">
        <h2 id="share-title">{copy.report.shareHeading}</h2>
        <p class="small muted">{copy.report.shareHint}</p>
        <div class="share-row">
          <input type="text" readOnly value={shareUrl} aria-label={copy.report.shareHeading} onFocus={(e) => (e.target as HTMLInputElement).select()} />
          <button type="button" class="btn" onClick={copyLink} aria-live="polite">
            {copied ? copy.report.copied : copy.report.copyLink}
          </button>
        </div>
      </section>
    </div>
  );
}
