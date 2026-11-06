import type { Incident } from '@engine/types';

export const MONTH_MS = 650;
export const BREAK_MS = 550;
const LEAD_MS = 200;

export interface RevealHandlers {
  /** A month (0..2) starts. */
  month: (m: number) => void;
  /** The nth break-in (1-based) lands on this asset. */
  hit: (n: number, assetId: string) => void;
  /** The reveal is over, either played out or skipped. Called once. */
  finish: () => void;
}

export interface RevealRun {
  /** Jump to the end: cancels every pending step, then finishes. */
  skip: () => void;
  /** Cancel every pending step without finishing (unmount). */
  stop: () => void;
}

/**
 * Plays the quarter month by month on timers. Skip and stop cancel what is
 * still pending, so nothing from the played-out schedule fires afterwards.
 */
export function startReveal(byMonth: readonly (readonly Incident[])[], h: RevealHandlers): RevealRun {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let live = true;
  const at = (ms: number, fn: () => void) =>
    timers.push(
      setTimeout(() => {
        if (live) fn();
      }, ms),
    );
  const stop = () => {
    live = false;
    timers.forEach(clearTimeout);
    timers.length = 0;
  };
  let t = LEAD_MS;
  let shown = 0;
  for (let m = 0; m < 3; m++) {
    at(t, () => h.month(m));
    t += MONTH_MS;
    for (const inc of byMonth[m] ?? []) {
      shown += 1;
      const n = shown;
      at(t, () => h.hit(n, inc.assetId));
      t += BREAK_MS;
    }
  }
  at(t, () => {
    live = false;
    h.finish();
  });
  return {
    skip: () => {
      if (!live) return;
      stop();
      h.finish();
    },
    stop,
  };
}
