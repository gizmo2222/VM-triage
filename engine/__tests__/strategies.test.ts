import { describe, expect, it } from 'vitest';
import { STRATEGIES, pickUnderCapacity } from '../strategies';
import { STRATEGY_IDS } from '../types';
import { assets, findings } from './fixture';

const ids = (fs: { id: string }[]) => fs.map((f) => f.id);

describe('rankers', () => {
  it('severityFirst orders by severity desc', () => {
    expect(ids(STRATEGIES.severityFirst.rank(findings, assets))).toEqual([
      'f-scary', 'f-kev', 'f-mid', 'f-comp', 'f-cheap2', 'f-cheap1',
    ]);
  });

  it('threatFirst puts known-exploited first, then likelihood', () => {
    const r = ids(STRATEGIES.threatFirst.rank(findings, assets));
    expect(r[0]).toBe('f-kev');
    expect(r[1]).toBe('f-mid');
    expect(r[r.length - 1]).toBe('f-comp');
  });

  it('assetFirst groups by asset criticality then severity', () => {
    const r = ids(STRATEGIES.assetFirst.rank(findings, assets));
    expect(r.slice(0, 3)).toEqual(['f-scary', 'f-mid', 'f-comp']);
    expect(r.slice(3)).toEqual(['f-kev', 'f-cheap2', 'f-cheap1']);
  });

  it('complianceFirst puts compliance items first', () => {
    const r = ids(STRATEGIES.complianceFirst.rank(findings, assets));
    expect(r.slice(0, 2)).toEqual(['f-comp', 'f-cheap2']);
  });

  it('cheapestFirst orders by cost asc then severity desc', () => {
    const r = ids(STRATEGIES.cheapestFirst.rank(findings, assets));
    expect(r.slice(0, 3)).toEqual(['f-comp', 'f-cheap2', 'f-cheap1']);
    expect(r[r.length - 1]).toBe('f-scary');
  });

  it('blended puts the exposed known-exploited item ahead of the scary internal one', () => {
    const r = ids(STRATEGIES.blended.rank(findings, assets));
    expect(r.indexOf('f-kev')).toBeLessThan(r.indexOf('f-scary'));
  });

  it('every ranker is a pure permutation with a stable tie-break', () => {
    for (const id of STRATEGY_IDS) {
      const copy = findings.map((f) => ({ ...f }));
      const a = ids(STRATEGIES[id].rank(copy, assets));
      const b = ids(STRATEGIES[id].rank(copy.slice().reverse(), assets));
      expect(a).toEqual(b);
      expect(a.slice().sort()).toEqual(ids(findings).sort());
      expect(copy).toEqual(findings);
    }
  });

  it('throws on a finding with an unknown asset', () => {
    const bad = [{ ...findings[0]!, assetId: 'nope' }, findings[1]!];
    expect(() => STRATEGIES.severityFirst.rank(bad, assets)).toThrow(/unknown asset/);
  });
});

describe('pickUnderCapacity', () => {
  it('walks the list and takes what fits', () => {
    const ranked = STRATEGIES.severityFirst.rank(findings, assets);
    // scary(3), kev(2), mid(2), comp(1), cheap2(1), cheap1(1) with capacity 4 -> scary + comp
    expect(pickUnderCapacity(ranked, 4)).toEqual(['f-scary', 'f-comp']);
  });

  it('returns empty when nothing fits', () => {
    expect(pickUnderCapacity(findings, 0)).toEqual([]);
  });

  it('never exceeds capacity', () => {
    for (let cap = 0; cap <= 12; cap++) {
      const picks = pickUnderCapacity(findings, cap);
      const cost = picks.reduce((s, id) => s + findings.find((f) => f.id === id)!.fixCost, 0);
      expect(cost).toBeLessThanOrEqual(cap);
    }
  });
});
