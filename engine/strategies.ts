import type { Asset, Finding, Id, Ranker, Strategy, StrategyId } from './types';
import { SENSITIVITY_WEIGHT } from './tuning';

type AssetMap = Map<Id, Asset>;

function assetMap(assets: readonly Asset[]): AssetMap {
  return new Map(assets.map((a) => [a.id, a]));
}

function assetOf(f: Finding, assets: AssetMap): Asset {
  const a = assets.get(f.assetId);
  if (!a) throw new Error(`Finding ${f.id} references unknown asset ${f.assetId}`);
  return a;
}

/** Compare by a list of keys, descending unless wrapped in asc(). Always ends with id ascending. */
type Key = { get: (f: Finding, a: Asset) => number; asc?: boolean };

function byKeys(...keys: Key[]): Ranker {
  return (findings, assets) => {
    const map = assetMap(assets);
    return findings.slice().sort((x, y) => {
      const ax = assetOf(x, map);
      const ay = assetOf(y, map);
      for (const k of keys) {
        const vx = k.get(x, ax);
        const vy = k.get(y, ay);
        if (vx !== vy) return k.asc ? vx - vy : vy - vx;
      }
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
    });
  };
}

const bool = (b: boolean) => (b ? 1 : 0);

/** Highest severity score first. The "scariest sounding" instinct. */
export const severityFirst: Ranker = byKeys(
  { get: (f) => f.severity },
  { get: (f) => f.likelihood },
);

/** Known-exploited first, then likelihood. The "what the vendor emailed about" instinct. */
export const threatFirst: Ranker = byKeys(
  { get: (f) => bool(f.knownExploited) },
  { get: (f) => f.likelihood },
  { get: (f) => f.severity },
);

/** Most critical, most exposed, most sensitive asset first. The "what touches customer data" instinct. */
export const assetFirst: Ranker = byKeys(
  { get: (_, a) => a.criticality },
  { get: (_, a) => bool(a.internetExposed) },
  { get: (_, a) => SENSITIVITY_WEIGHT[a.sensitivity] },
  { get: (f) => f.severity },
);

/** Whatever the questionnaire asks about, then severity. */
export const complianceFirst: Ranker = byKeys(
  { get: (f) => bool(f.compliance) },
  { get: (f) => f.severity },
);

/** Most fixes per point. */
export const cheapestFirst: Ranker = byKeys(
  { get: (f) => f.fixCost, asc: true },
  { get: (f) => f.severity },
);

/** Threat x exposure x impact. The FlintScope method. */
export function blendedScore(f: Finding, a: Asset): number {
  const threat = (f.knownExploited ? 1.0 : 0.45) * (0.15 + f.likelihood);
  const exposure = a.internetExposed ? 1.0 : 0.5;
  const impact = (a.criticality / 5) * (0.4 + (f.severity / 10) * 0.6) * (0.5 + 0.5 * SENSITIVITY_WEIGHT[a.sensitivity]);
  return threat * exposure * impact;
}

export const blended: Ranker = byKeys(
  { get: blendedScore },
  { get: (f) => f.severity },
);

export const STRATEGIES: Record<StrategyId, Strategy> = {
  severityFirst: { id: 'severityFirst', rank: severityFirst },
  threatFirst: { id: 'threatFirst', rank: threatFirst },
  assetFirst: { id: 'assetFirst', rank: assetFirst },
  complianceFirst: { id: 'complianceFirst', rank: complianceFirst },
  cheapestFirst: { id: 'cheapestFirst', rank: cheapestFirst },
  blended: { id: 'blended', rank: blended },
};

export function getStrategy(id: StrategyId): Strategy {
  const s = STRATEGIES[id];
  if (!s) throw new Error(`Unknown strategy ${id}`);
  return s;
}

/**
 * Greedy fill: walk the ranked list, take anything that fits the remaining
 * capacity. Not a knapsack on purpose; predictable and cheap.
 */
export function pickUnderCapacity(ranked: readonly Finding[], capacity: number): Id[] {
  const picked: Id[] = [];
  let remaining = capacity;
  for (const f of ranked) {
    if (f.fixCost <= remaining) {
      picked.push(f.id);
      remaining -= f.fixCost;
    }
    if (remaining <= 0) break;
  }
  return picked;
}
