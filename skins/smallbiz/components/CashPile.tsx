import { copy } from '@content/copy/smallbiz';
import { dollars } from '@skins/shared/format';
import { useAnimatedNumber } from '../hooks';

interface Props {
  value: number;
  /** Animate toward value over this many ms. 0 = instant. */
  ms?: number;
  big?: boolean;
}

export function CashPile({ value, ms = 700, big }: Props) {
  const shown = useAnimatedNumber(value, ms);
  const negative = shown < 0;
  return (
    <div class={`cash${big ? ' cash--big' : ''}${negative ? ' cash--negative' : ''}`} role="status" aria-live="polite">
      <span class="cash__label">{copy.round.cash}</span>
      <span class="cash__value">{negative ? `−${dollars(-shown)}` : dollars(shown)}</span>
    </div>
  );
}
