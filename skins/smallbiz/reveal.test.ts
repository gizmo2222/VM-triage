import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '@engine/types';
import { startReveal } from './reveal';

const inc = (assetId: string) => ({ assetId }) as Incident;

function recorder() {
  const log: string[] = [];
  return {
    log,
    handlers: {
      month: (m: number) => log.push(`month ${m}`),
      hit: (n: number, a: string) => log.push(`hit ${n} ${a}`),
      finish: () => log.push('finish'),
    },
  };
}

describe('startReveal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays every month and hit, then finishes once', () => {
    const r = recorder();
    startReveal([[inc('a')], [], [inc('b')]], r.handlers);
    vi.runAllTimers();
    expect(r.log).toEqual(['month 0', 'hit 1 a', 'month 1', 'month 2', 'hit 2 b', 'finish']);
  });

  it('skip cancels everything still pending', () => {
    const r = recorder();
    const run = startReveal([[inc('a')], [inc('b')], [inc('c')]], r.handlers);
    vi.advanceTimersByTime(300);
    run.skip();
    const atSkip = [...r.log];
    vi.advanceTimersByTime(60_000);
    expect(atSkip).toEqual(['month 0', 'finish']);
    expect(r.log).toEqual(atSkip);
  });

  it('skip after the end, or twice, does not finish again', () => {
    const r = recorder();
    const run = startReveal([[], [], []], r.handlers);
    vi.runAllTimers();
    run.skip();
    run.skip();
    expect(r.log.filter((l) => l === 'finish')).toHaveLength(1);
  });

  it('stop cancels without finishing', () => {
    const r = recorder();
    const run = startReveal([[inc('a')], [], []], r.handlers);
    run.stop();
    vi.runAllTimers();
    expect(r.log).toEqual([]);
  });
});
