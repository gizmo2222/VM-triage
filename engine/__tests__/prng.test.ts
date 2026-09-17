import { describe, expect, it } from 'vitest';
import { createRng, mulberry32, normaliseSeed, seedFromString } from '../prng';

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('differs across seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('stays in [0, 1) with a sane mean', () => {
    const next = mulberry32(7);
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / n).toBeGreaterThan(0.48);
    expect(sum / n).toBeLessThan(0.52);
  });
});

describe('createRng', () => {
  it('int() stays in range', () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('shuffle() is a permutation and does not mutate input', () => {
    const rng = createRng(9);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
    expect(createRng(9).shuffle(input)).toEqual(out);
  });
});

describe('seedFromString', () => {
  it('is stable', () => {
    expect(seedFromString('dental-tuesday')).toBe(seedFromString('dental-tuesday'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
    expect(seedFromString('')).toBe(0x811c9dc5);
  });
});

describe('normaliseSeed', () => {
  it('handles numbers, numeric strings, words and junk', () => {
    expect(normaliseSeed(123)).toBe(123);
    expect(normaliseSeed('123')).toBe(123);
    expect(normaliseSeed(' 456 ')).toBe(456);
    expect(normaliseSeed('hello')).toBe(seedFromString('hello'));
    expect(normaliseSeed('')).toBeUndefined();
    expect(normaliseSeed(undefined)).toBeUndefined();
    expect(normaliseSeed(null)).toBeUndefined();
    expect(normaliseSeed(Number.NaN)).toBeUndefined();
    expect(normaliseSeed(-1)).toBe(0xffffffff);
  });
});
