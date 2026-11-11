// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedFromString } from '@engine/prng';
import { buildUrl, dailySeed, parseSeedParam, randomSeed, readUrl, seedToParam, writeUrl } from './seed';

beforeEach(() => {
  window.history.replaceState(null, '', '/play/index.html?old=1#frag');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildUrl', () => {
  it('replaces the query and hash, keeps the path, and writes b and s', () => {
    const u = new URL(buildUrl('dental', 255));
    expect(u.pathname).toBe('/play/index.html');
    expect(u.hash).toBe('');
    expect(u.searchParams.get('old')).toBeNull();
    expect(u.searchParams.get('b')).toBe('dental');
    expect(u.searchParams.get('s')).toBe(seedToParam(255));
  });

  it('uses an explicit base instead of the location', () => {
    expect(buildUrl('x', 36, 'https://example.com/game/?z=1#h')).toBe('https://example.com/game/?b=x&s=10');
  });
});

describe('writeUrl', () => {
  it('rewrites the live location without adding a history entry', () => {
    const before = window.history.length;
    writeUrl('manufacturer', 123456);
    expect(window.location.pathname).toBe('/play/index.html');
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe(`?b=manufacturer&s=${seedToParam(123456)}`);
    expect(window.history.length).toBe(before);
  });

  it('round-trips through readUrl on the real location', () => {
    for (const seed of [0, 1, 2026, 0x7fffffff, 0xffffffff]) {
      writeUrl('ecommerce', seed);
      expect(readUrl()).toEqual({ packId: 'ecommerce', seed });
    }
  });

  it('does not touch history when the url is already current', () => {
    writeUrl('dental', 99);
    const spy = vi.spyOn(window.history, 'replaceState');
    writeUrl('dental', 99);
    expect(spy).not.toHaveBeenCalled();
    writeUrl('dental', 100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('drops unrelated params and the hash when it rewrites', () => {
    writeUrl('dental', 5);
    expect(window.location.search).not.toContain('old');
    expect(window.location.href).not.toContain('#');
  });
});

describe('randomSeed', () => {
  it('returns what crypto produced, as an unsigned uint32 that round-trips', () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((buf: Uint32Array) => {
      buf[0] = 0xdeadbeef;
      return buf;
    }) as typeof crypto.getRandomValues);
    const s = randomSeed();
    expect(s).toBe(0xdeadbeef);
    expect(parseSeedParam(seedToParam(s))).toBe(s);
  });

  it('always yields a uint32 integer', () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('dailySeed', () => {
  it('is stable within one UTC day and differs across days', () => {
    const a = dailySeed(new Date('2026-03-04T00:00:00Z'));
    expect(dailySeed(new Date('2026-03-04T23:59:59Z'))).toBe(a);
    expect(dailySeed(new Date('2026-03-05T00:00:00Z'))).not.toBe(a);
  });

  it('hashes the unpadded, one-based UTC date', () => {
    expect(dailySeed(new Date(Date.UTC(2026, 0, 5)))).toBe(seedFromString('2026-1-5'));
    expect(dailySeed(new Date(Date.UTC(2026, 11, 31)))).toBe(seedFromString('2026-12-31'));
  });

  it('keeps month and day apart (Jan 11 is not Nov 1)', () => {
    expect(dailySeed(new Date(Date.UTC(2026, 0, 11)))).not.toBe(dailySeed(new Date(Date.UTC(2026, 10, 1))));
  });
});
