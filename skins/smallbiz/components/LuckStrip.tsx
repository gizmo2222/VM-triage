import { copy } from '@content/copy/smallbiz';
import { dollars } from '@skins/shared/format';

interface Props {
  /** Every replay's cost, sorted ascending. */
  costs: readonly number[];
  /** What the year actually cost. */
  actual: number;
  median: number;
  /** Spoken alternative for the whole strip. */
  label: string;
}

/**
 * One hairline from the luckiest replay to the unluckiest. A faint mark per
 * replay shows where the years pile up, a slate tick marks a typical year,
 * and a brass tick marks the one the player just lived through. The sentence
 * under it is the caption; this is the picture.
 */
export function LuckStrip({ costs, actual, median, label }: Props) {
  if (costs.length === 0) return null;
  const min = costs[0]!;
  const max = costs[costs.length - 1]!;
  const span = Math.max(1, max - min);
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / span) * 100)).toFixed(2)}%`;
  const youLeft = ((actual - min) / span) * 100;
  const typicalLeft = ((median - min) / span) * 100;
  // Keep the two labels from sitting on top of each other when the year is typical.
  const labelsClash = Math.abs(youLeft - typicalLeft) < 14;

  return (
    <figure class="luck" role="img" aria-label={label}>
      <div class="luck__track" aria-hidden="true">
        {costs.map((c, i) => (
          <span key={i} class="luck__mark" style={`left:${pct(c)}`} />
        ))}
        <span class={`luck__tick luck__tick--typical${labelsClash ? ' luck__tick--below' : ''}`} style={`left:${pct(median)}`}>
          <span class="luck__label">{copy.report.luckTypical}</span>
        </span>
        <span class="luck__tick luck__tick--you" style={`left:${pct(actual)}`}>
          <span class="luck__label">{copy.report.luckYou}</span>
        </span>
      </div>
      <div class="luck__ends" aria-hidden="true">
        <span>
          {copy.report.luckBest} {dollars(min)}
        </span>
        <span>
          {copy.report.luckWorst} {dollars(max)}
        </span>
      </div>
    </figure>
  );
}
