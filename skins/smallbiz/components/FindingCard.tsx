import { useState } from 'preact/hooks';
import type { Finding } from '@engine/types';
import { copy } from '@content/copy/smallbiz';

interface Props {
  finding: Finding;
  picked: boolean;
  fits: boolean;
  badge?: string;
  /** Playtest only: a short debug tag such as the hidden exploit odds. */
  debug?: string;
  onToggle: () => void;
}

export const findingTitle = (f: Finding): string => f.headline ?? f.plainTitle;

export function FindingCard({ finding, picked, fits, badge, debug, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const headline = findingTitle(finding);
  const disabled = !picked && !fits;
  const detailId = `detail-${finding.id}`;

  return (
    <li class={`fcard${picked ? ' fcard--picked' : ''}${disabled ? ' fcard--disabled' : ''}`}>
      {/* aria-disabled, not disabled: it stays in tab order so "Won't fit" is heard. */}
      <button
        type="button"
        class="fcard__main"
        aria-pressed={picked}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) onToggle();
        }}
      >
        <span class="fcard__check" aria-hidden="true">
          {picked ? '✓' : ''}
        </span>
        <span class="fcard__text">
          <span class="fcard__headline">{headline}</span>
          <span class="fcard__meta">
            <span class="fcard__cost">{copy.round.cost(finding.fixCost)}</span>
            {finding.compliance && badge && <span class="badge">{badge}</span>}
            {disabled && <span class="fcard__nofit">{copy.round.tooExpensive}</span>}
            {debug && <span class="fcard__debug">{debug}</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        class="fcard__more"
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        aria-label={copy.round.more(headline)}
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
