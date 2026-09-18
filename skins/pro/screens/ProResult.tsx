import type { Game } from '@engine/types';
import { allFindings } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { pro } from '@content/copy/pro';
import { count, days, dollars } from '@skins/shared/format';
import { Pips } from '../components/Pips';

interface Props {
  game: Game;
  pack: ScenarioPack;
  onNext: () => void;
}

export function ProResult({ game, pack, onNext }: Props) {
  const { state } = game;
  const record = state.history[state.history.length - 1];
  if (!record) return null;
  const finished = state.phase === 'finished';
  const titles = new Map(allFindings(pack).map((f) => [f.id, f.techTitle]));
  const assetName = new Map(state.assets.map((a) => [a.id, a.name]));
  const exploited = record.incidents.filter((i) => i.cause === 'exploited');
  const audit = record.incidents.find((i) => i.cause === 'audit');
  const lossToDate = state.incidents.reduce((s, i) => s + i.impact.dollars, 0);
  const lossThisSprint = record.incidents.reduce((s, i) => s + i.impact.dollars, 0);

  return (
    <div class="result">
      <header class="round-head">
        <div>
          <h1 tabIndex={-1}>{pro.result.heading(record.round)}</h1>
          <Pips current={record.round} total={pack.config.rounds} label={pro.a11y.progress} />
        </div>
        <dl class="stats">
          <div class="stat">
            <dt>{pro.round.lossToDate}</dt>
            <dd>
              {dollars(lossToDate)}
              {lossThisSprint > 0 && <span class="tag tag--bad">+{dollars(lossThisSprint)}</span>}
            </dd>
          </div>
        </dl>
      </header>

      {exploited.length === 0 && !audit && <p class="quiet">{pro.result.quiet}</p>}
      {exploited.length > 0 && (
        <>
          <p class="kicker">{pro.result.exploited(exploited.length)}</p>
          <ul class="incidents">
            {exploited.map((i) => (
              <li key={i.findingId} class="incident">
                <span class="incident__title">{titles.get(i.findingId) ?? i.findingId}</span>
                <span class="incident__asset">{assetName.get(i.assetId) ?? i.assetId}</span>
                <span class="incident__impact">
                  <strong>{dollars(i.impact.dollars)}</strong>
                  {i.impact.downtimeDays > 0 && <span>{pro.result.downtime(days(i.impact.downtimeDays))}</span>}
                  {i.impact.recordsExposed > 0 && <span>{pro.result.records(count(i.impact.recordsExposed))}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {audit && (
        <p class="incident incident--audit">
          <span class="incident__title">{pro.result.audit}</span>
          <span class="incident__asset">{pro.result.auditDetail(audit.relatedFindingIds?.length ?? 1)}</span>
          <span class="incident__impact">
            <strong>{dollars(audit.impact.dollars)}</strong>
          </span>
        </p>
      )}
      {state.emergencyDebt > 0 && !finished && <p class="muted small">{pro.result.burnNext(state.emergencyDebt)}</p>}
      <button type="button" class="btn btn--brass btn--big" onClick={onNext}>
        {finished ? pro.result.finish : pro.result.next}
      </button>
    </div>
  );
}
