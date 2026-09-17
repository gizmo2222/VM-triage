import type { Game, Incident } from '@engine/types';
import { allFindings } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { count, days, dollars } from '@skins/shared/format';

interface Props {
  game: Game;
  pack: ScenarioPack;
  onNext: () => void;
}

export function RoundResult({ game, pack, onNext }: Props) {
  const { state } = game;
  const record = state.history[state.history.length - 1];
  if (!record) return null;

  const titles = new Map(allFindings(pack).map((f) => [f.id, f.plainTitle]));
  const assetName = new Map(state.assets.map((a) => [a.id, a.name]));
  const finished = state.phase === 'finished';

  return (
    <div>
      <h1 tabIndex={-1}>{copy.result.heading(record.round, pack.meta.roundLabel)}</h1>
      <p class="muted">{copy.result.fixedLine(record.fixedIds.length)}</p>

      {record.incidents.length === 0 ? (
        <section class="card card--good">
          <h2>{copy.result.quiet}</h2>
          <p class="muted">{copy.result.quietHint}</p>
        </section>
      ) : (
        <>
          <p>
            <strong>{copy.result.incidentIntro(record.incidents.length)}</strong>
          </p>
          {record.incidents.map((i) => (
            <IncidentCard key={`${i.cause}-${i.findingId}`} incident={i} titles={titles} assetName={assetName} />
          ))}
        </>
      )}

      {state.emergencyDebt > 0 && !finished && (
        <p class="small muted">{copy.result.emergencyNext(state.emergencyDebt)}</p>
      )}

      <button type="button" class="btn btn--brass btn--block" onClick={onNext}>
        {finished ? copy.result.finish : copy.result.next}
      </button>
    </div>
  );
}

function IncidentCard({
  incident,
  titles,
  assetName,
}: {
  incident: Incident;
  titles: Map<string, string>;
  assetName: Map<string, string>;
}) {
  const { impact } = incident;
  if (incident.cause === 'audit') {
    const n = incident.relatedFindingIds?.length ?? 1;
    return (
      <section class="card card--warn incident">
        <span class="incident__title">{copy.result.auditFailed(n)}</span>
        <ul class="incident__impact">
          <li>{copy.result.auditCost(dollars(impact.dollars))}</li>
        </ul>
      </section>
    );
  }
  return (
    <section class="card card--bad incident">
      <span class="kicker">{copy.result.howTheyGotIn}</span>
      <span class="incident__title">{titles.get(incident.findingId) ?? incident.findingId}</span>
      <span class="small muted">{assetName.get(incident.assetId) ?? incident.assetId}</span>
      <ul class="incident__impact">
        {impact.downtimeDays > 0 && <li>{copy.result.closedFor(days(impact.downtimeDays))}</li>}
        <li>{copy.result.cost(dollars(impact.dollars))}</li>
        {impact.recordsExposed > 0 && <li>{copy.result.letters(count(impact.recordsExposed))}</li>}
      </ul>
    </section>
  );
}
