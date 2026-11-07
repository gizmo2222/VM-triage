import { describe, expect, it } from 'vitest';
import { dailySeed } from '@skins/shared/seed';
import { resolveStart } from './App';

describe('pro daily seed', () => {
  it('resolves an untouched daily start at press time, not at mount', () => {
    const before = new Date('2026-11-07T23:59:59Z');
    const after = new Date('2026-11-08T00:00:01Z');
    expect(resolveStart(undefined, undefined, before).seed).toBe(dailySeed(before));
    const r = resolveStart(undefined, undefined, after);
    expect(r.seed).toBe(dailySeed(after));
    expect(r.isDaily).toBe(true);
    expect(resolveStart(5, undefined, after)).toEqual({ seed: 5, isDaily: false });
    expect(resolveStart(5, true, after)).toEqual({ seed: 5, isDaily: true });
  });
});
