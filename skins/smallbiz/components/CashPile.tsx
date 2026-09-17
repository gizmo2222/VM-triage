import { useEffect, useRef, useState } from 'preact/hooks';
import { copy } from '@content/copy/smallbiz';
import { dollars } from '@skins/shared/format';
import { usePrefersReducedMotion } from '../hooks';

interface Props {
  value: number;
  /** Where to animate from on mount. Defaults to value (no entry animation). */
  from?: number;
  /** Animate toward value over this many ms. 0 = instant. */
  ms?: number;
  big?: boolean;
}

export function CashPile({ value, from, ms = 700, big }: Props) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? value : (from ?? value));
  const current = useRef(reduced ? value : (from ?? value));
  const raf = useRef(0);

  useEffect(() => {
    if (reduced || ms <= 0 || current.current === value) {
      current.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const begin = current.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 4);
      const v = begin + (value - begin) * eased;
      current.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // Background tabs throttle frames; always land on the target.
    const snap = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      current.current = value;
      setShown(value);
    }, ms + 60);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(snap);
    };
  }, [value, ms, reduced]);

  const negative = shown < 0;
  return (
    <div class={`cash${big ? ' cash--big' : ''}${negative ? ' cash--negative' : ''}`} role="status" aria-live="polite">
      <span class="cash__label">{copy.round.cash}</span>
      <span class="cash__value">{negative ? `−${dollars(-shown)}` : dollars(shown)}</span>
    </div>
  );
}
