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
  /** Extra per-finding tags for this sprint's event: new KEV, new asset, now exposed. */
  rowTags: ReadonlyMap<Id, string[]>;
  /** Playtest only: per-finding hidden odds. */
  debug?: (f: Finding) => string | undefined;
  onToggle: (f: Finding) => void;
}

/**
 * Ten columns on a desktop. Below 700px the stylesheet turns each row into a
 * card: the checkbox and title on one line, then the numbers as labelled
 * chips. The data-label attributes feed those chips.
 */
export function FindingTable({ findings, assets, selected, left, auditActive, boosts, rowTags, debug, onToggle }: Props) {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const c = pro.round.cols;
  return (
    <>
      <div class="tablewrap">
        <table class="ftable ftable--findings" aria-label={pro.a11y.table}>
          <thead>
            <tr>
              <th scope="col">{c.pick}</th>
              <th scope="col">{c.finding}</th>
              <th scope="col">{c.asset}</th>
              <th scope="col" class="num">{c.cvss}</th>
              <th scope="col" class="num">{c.epss}</th>
              <th scope="col">{c.kev}</th>
              <th scope="col">
                <abbr title="Internet-facing or internal">{c.exp}</abbr>
              </th>
              <th scope="col" class="num">
                <abbr title="Asset criticality, 1 to 5">{c.crit}</abbr>
              </th>
              <th scope="col" class="num">{c.cost}</th>
              <th scope="col">
                <abbr title="Asked on the attestation">{c.comp}</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const a = assetById.get(f.assetId);
              const picked = selected.has(f.id);
              const fits = picked || f.fixCost <= left;
              const boost = f.tags.map((t) => boosts.get(t)).find((x) => x !== undefined);
              const extra = rowTags.get(f.id) ?? [];
              const dbg = debug?.(f);
              return (
                <tr key={f.id} class={`${picked ? 'is-picked' : ''}${fits ? '' : ' is-nofit'}`}>
                  <td class="cell-pick">
                    <input
                      type="checkbox"
                      id={`pick-${f.id}`}
                      checked={picked}
                      disabled={!fits}
                      aria-label={`${c.pick}: ${f.techTitle}`}
                      onChange={() => onToggle(f)}
                    />
                  </td>
                  <td class="cell-title">
                    <label for={`pick-${f.id}`} class="ftable__title" title={f.plainTitle}>
                      {f.techTitle}
                    </label>
                    {boost !== undefined && <span class="tag tag--warn">{pro.round.boostTag(boost)}</span>}
                    {extra.map((t) => (
                      <span key={t} class="tag tag--warn">
                        {t}
                      </span>
                    ))}
                    {dbg && <span class="tag tag--debug">{dbg}</span>}
                  </td>
                  <td class="cell-asset" data-label={c.asset}>
                    {a?.name ?? f.assetId}
                  </td>
                  <td class="num" data-label={c.cvss}>
                    {f.severity.toFixed(1)}
                  </td>
                  <td class="num" data-label={c.epss}>
                    {f.likelihood.toFixed(2)}
                  </td>
                  <td class={f.knownExploited ? 'cell-tagonly' : 'is-empty'} data-label={c.kev}>
                    {f.knownExploited ? <span class="tag tag--bad">KEV</span> : <span class="muted">·</span>}
                  </td>
                  <td data-label={c.exp}>{a?.internetExposed ? pro.round.exposed : <span class="muted">{pro.round.internal}</span>}</td>
                  <td class="num" data-label={c.crit}>
                    {a?.criticality ?? '·'}
                  </td>
                  <td class="num" data-label={c.cost}>
                    {f.fixCost}
                  </td>
                  <td class={f.compliance ? 'cell-tagonly' : 'is-empty'} data-label={c.comp}>
                    {f.compliance ? <span class={`tag${auditActive ? ' tag--warn' : ''}`}>{c.comp}</span> : <span class="muted">·</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="legend muted small">{pro.round.legend}</p>
    </>
  );
}
