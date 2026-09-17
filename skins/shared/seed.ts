import { seedFromString } from '@engine/prng';

/**
 * Seed and scenario live in the URL so a run can be shared:
 *   ?b=dental&s=1a2b3c   (s is base36 of a uint32)
 *
 * The rule is simple so it round-trips: anything that is valid base36 and at
 * most 7 characters is a base36 number. Anything else is a word and gets hashed.
 * seedToParam always emits at most 7 base36 characters, so what we write is
 * what we read back.
 */

export interface UrlParams {
  packId?: string;
  seed?: number;
}

export function parseSeedParam(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const t = raw.trim();
  if (t === '') return undefined;
  if (/^[0-9a-z]{1,7}$/i.test(t)) return parseInt(t.toLowerCase(), 36) >>> 0;
  return seedFromString(t);
}

export function readUrl(search: string = window.location.search): UrlParams {
  const q = new URLSearchParams(search);
  const seed = parseSeedParam(q.get('s') ?? q.get('seed'));
  const packId = q.get('b') ?? q.get('business') ?? undefined;
  return { packId, seed };
}

export function seedToParam(seed: number): string {
  return (seed >>> 0).toString(36);
}

export function buildUrl(packId: string, seed: number, base: string = window.location.href): string {
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  u.searchParams.set('b', packId);
  u.searchParams.set('s', seedToParam(seed));
  return u.toString();
}

export function writeUrl(packId: string, seed: number): void {
  const next = buildUrl(packId, seed);
  if (next !== window.location.href) window.history.replaceState(null, '', next);
}

/** Not the engine's PRNG. Only used to pick a fresh seed when the URL has none. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/** Same backlog for everyone on the same calendar day. Skin 2 uses this. */
export function dailySeed(date: Date = new Date()): number {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  return seedFromString(key);
}
