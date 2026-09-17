import { useEffect, useRef, useState } from 'preact/hooks';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => setReduced(mq.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch {
      return undefined;
    }
  }, []);
  return reduced;
}

/** Eases a number toward `target` over `ms`. Jumps straight there when motion is reduced. */
export function useAnimatedNumber(target: number, ms = 700): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    if (reduced || ms <= 0) {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const begin = from.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = begin + (target - begin) * eased;
      setValue(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    // Background tabs throttle animation frames; make sure we still land on the target.
    const snap = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      setValue(target);
      from.current = target;
    }, ms + 50);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(snap);
    };
  }, [target, ms, reduced]);

  return value;
}
