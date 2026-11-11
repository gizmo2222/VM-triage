import { describe, expect, it } from 'vitest';
import { STRATEGY_IDS } from '@engine/types';
import { byCost } from './ProReport';

describe('ProReport byCost', () => {
  const [s1, s2] = STRATEGY_IDS;

  it('orders by cost first', () => {
    expect(byCost({ id: s2!, cost: 1 }, { id: s1!, cost: 2 })).toBeLessThan(0);
  });

  it('is consistent on ties: the player first, then strategy order, both ways round', () => {
    const you = { id: 'you' as const, cost: 5 };
    const a = { id: s1!, cost: 5 };
    const b = { id: s2!, cost: 5 };
    expect(byCost(you, a)).toBeLessThan(0);
    expect(byCost(a, you)).toBeGreaterThan(0);
    expect(byCost(a, b)).toBeLessThan(0);
    expect(byCost(b, a)).toBeGreaterThan(0);
    expect(byCost(a, a)).toBe(0);
  });

  it('gives the same order whatever the input order', () => {
    const rows = [...STRATEGY_IDS].map((id) => ({ id, cost: 3 }));
    const want = [...rows].sort(byCost).map((r) => r.id);
    expect([...rows].reverse().sort(byCost).map((r) => r.id)).toEqual(want);
    expect(want).toEqual([...STRATEGY_IDS]);
  });
});
