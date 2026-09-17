import { useState } from 'preact/hooks';
import type { Finding } from '@engine/types';
import { copy } from '@content/copy/smallbiz';

interface Props {
  finding: Finding;
  picked: boolean;
  fits: boolean;
  badge?: string;
  onToggle: () => void;
}

export function FindingCard({ finding, picked, fits, badge, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const headline = finding.headline ?? finding.plainTitle;
  const disabled = !picked && !fits;
  const detailId = `detail-${finding.id}`;

  return (
    <li class={`fcard${picked ? ' fcard--picked' : ''}${disabled ? ' fcard--disabled' : ''}`}>
      <button type="button" class="fcard__main" aria-pressed={picked} disabled={disabled} onClick={onToggle}>
        <span class="fcard__check" aria-hidden="true">
          {picked ? '✓' : ''}
        </span>
        <span class="fcard__text">
          <span class="fcard__headline">{headline}</span>
          <span class="fcard__meta">
            <span class="fcard__cost">{copy.round.cost(finding.fixCost)}</span>
            {finding.compliance && badge && <span class="badge">{badge}</span>}
            {disabled && <span class="fcard__nofit">{copy.round.tooExpensive}</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        class="fcard__more"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={copy.round.more}
        onClick={() => setOpen(!open)}
      >
        ?
      </button>
      {open && (
        <p id={detailId} class="fcard__detail">
          {finding.plainTitle}
        </p>
      )}
    </li>
  );
}
