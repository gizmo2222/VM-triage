interface Props {
  current: number;
  total: number;
  label: string;
}

/** Sprint progress. Filled pips are done, the ring is now. */
export function Pips({ current, total, label }: Props) {
  return (
    <ol class="pips" aria-label={`${label}: ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <li key={n} class={`pip${n < current ? ' pip--done' : n === current ? ' pip--now' : ''}`} aria-hidden="true">
          {n}
        </li>
      ))}
    </ol>
  );
}
