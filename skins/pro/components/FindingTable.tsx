import type { Asset, Finding, Id } from '@engine/types';
import { pro } from '@content/copy/pro';

interface Props {
  findings: Finding[];
  assets: Asset[];
  selected: ReadonlySet<Id>;
  left: number;
  auditActive: boolean;
  /** Tags with an active likelihood boost this sprint, with their multiplier. */
  boosts: ReadonlyMap<string, number>;
  /** Playtest only: per-finding hidden odds. */
  debug?: (f: Finding) => string | undefined;
  onToggle: (f: Finding) => void;
}

export function FindingTable({ findings, assets, selected, left, auditActive, boosts, debug, onToggle }: Props) {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const c = pro.round.cols;
  return (
    <div class="tablewrap">
      <table class="ftable" aria-label={pro.a11y.table}>
        <thead>
          <tr>
            <th scope="col">{c.pick}</th>
            <th scope="col">{c.finding}</th>
            <th scope="col">{c.asset}</th>
            <th scope="col" class="num">{c.cvss}</th>
            <th scope="col" class="num">{c.epss}</th>
            <th scope="col">{c.kev}</th>
            <th scope="col">{c.exp}</th>
            <th scope="col" class="num">{c.crit}</th>
            <th scope="col" class="num">{c.cost}</th>
            <th scope="col">{c.comp}</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => {
            const a = assetById.get(f.assetId);
            const picked = selected.has(f.id);
            const fits = picked || f.fixCost <= left;
            const boost = f.tags.map((t) => boosts.get(t)).find((x) => x !== undefined);
            const dbg = debug?.(f);
            return (
              <tr key={f.id} class={`${picked ? 'is-picked' : ''}${fits ? '' : ' is-nofit'}`}>
                <td>
                  <input
                    type="checkbox"
                    id={`pick-${f.id}`}
                    checked={picked}
                    disabled={!fits}
                    aria-label={`${c.pick}: ${f.techTitle}`}
                    onChange={() => onToggle(f)}
                  />
                </td>
                <td>
                  <label for={`pick-${f.id}`} class="ftable__title" title={f.plainTitle}>
                    {f.techTitle}
                  </label>
                  {boost !== undefined && <span class="tag tag--warn">{pro.round.boostTag(boost)}</span>}
                  {dbg && <span class="tag tag--debug">{dbg}</span>}
                </td>
                <td class="ftable__asset">{a?.name ?? f.assetId}</td>
                <td class="num">{f.severity.toFixed(1)}</td>
                <td class="num">{f.likelihood.toFixed(2)}</td>
                <td>{f.knownExploited ? <span class="tag tag--bad">KEV</span> : <span class="muted">·</span>}</td>
                <td>{a?.internetExposed ? pro.round.exposed : <span class="muted">{pro.round.internal}</span>}</td>
                <td class="num">{a?.criticality ?? '·'}</td>
                <td class="num">{f.fixCost}</td>
                <td>{f.compliance ? <span class={`tag${auditActive ? ' tag--warn' : ''}`}>{c.comp}</span> : <span class="muted">·</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
