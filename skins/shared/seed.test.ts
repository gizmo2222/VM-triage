import { describe, expect, it } from 'vitest';
import { parseSeedParam, seedToParam } from './seed';

describe('seed params', () => {
  it('round-trips every kind of uint32, including ones whose base36 is all digits', () => {
    for (const seed of [0, 1, 35, 36, 1296, 46655, 12345678, 0xffffffff, 2 ** 31, 2026]) {
      expect(parseSeedParam(seedToParam(seed))).toBe(seed);
    }
  });

  it('hashes words that are not valid base36', () => {
    expect(parseSeedParam('wednesday-morning')).toBeDefined();
    expect(parseSeedParam('wednesday-morning')).toBe(parseSeedParam(' wednesday-morning '));
    expect(parseSeedParam('a b')).not.toBe(parseSeedParam('ab'));
  });

  it('treats short words as base36, case-insensitively', () => {
    expect(parseSeedParam('TEST1')).toBe(parseSeedParam('test1'));
  });

  it('returns undefined for nothing', () => {
    expect(parseSeedParam(null)).toBeUndefined();
    expect(parseSeedParam('')).toBeUndefined();
    expect(parseSeedParam('   ')).toBeUndefined();
  });
});
