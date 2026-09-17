/**
 * Seeded PRNG. The engine never calls Math.random.
 *
 * mulberry32: small, fast, good enough distribution for a game. 32-bit state.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Fisher-Yates, returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out;
    },
  };
}

/** FNV-1a 32-bit. "dental-tuesday" -> a stable uint32. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Normalise anything a URL or a user might hand us into a uint32 seed. */
export function normaliseSeed(input: string | number | undefined | null): number | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (typeof input === 'number') return Number.isFinite(input) ? input >>> 0 : undefined;
  const trimmed = input.trim();
  if (trimmed === '') return undefined;
  if (/^\d{1,10}$/.test(trimmed)) return Number(trimmed) >>> 0;
  return seedFromString(trimmed);
}
