import type { Asset, Finding, Id, RankContext, Ranker, Strategy, StrategyId } from './types';
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
type Key = { get: (f: Finding, a: Asset, ctx: RankContext) => number; asc?: boolean };

const NO_CONTEXT: RankContext = { modifiers: [] };

function byKeys(...keys: Key[]): Ranker {
  return (findings, assets, ctx = NO_CONTEXT) => {
    const map = assetMap(assets);
    return findings.slice().sort((x, y) => {
      const ax = assetOf(x, map);
      const ay = assetOf(y, map);
      for (const k of keys) {
        const vx = k.get(x, ax, ctx);
        const vy = k.get(y, ay, ctx);
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

/** Pure exploit probability, EPSS-style. Ignores the known-exploited flag on purpose. */
export const likelihoodFirst: Ranker = byKeys(
  { get: (f) => f.likelihood },
  { get: (f) => f.severity },
);

/**
 * SSVC-style decision tree, coarse on purpose: exploitation status, exposure
 * and mission impact each land in a bucket, and the buckets decide the tier.
 * Act > Attend > Track* > Track. Within a tier, severity breaks ties.
 */
export function ssvcTier(f: Finding, a: Asset): number {
  const exploitation = f.knownExploited ? 2 : f.likelihood >= 0.4 ? 1 : 0; // active / poc / none
  const exposure = a.internetExposed ? 1 : 0; // open / controlled
  const impact = a.criticality >= 4 ? 2 : a.criticality === 3 ? 1 : 0; // high / medium / low
  const score = exploitation * 3 + exposure * 2 + impact;
  if (score >= 7) return 3; // Act
  if (score >= 5) return 2; // Attend
  if (score >= 3) return 1; // Track*
  return 0; // Track
}

export const ssvc: Ranker = byKeys(
  { get: (f, a) => ssvcTier(f, a) },
  { get: (f) => f.severity },
  { get: (f) => f.likelihood },
);

/**
 * Threat x exposure x impact, updated with this quarter's news. The FlintScope
 * method. A live campaign against a tag raises that tag's threat; an open
 * questionnaire raises every item it asks about.
 */
export function blendedScore(f: Finding, a: Asset, ctx: RankContext = NO_CONTEXT): number {
  let threat = (f.knownExploited ? 1.0 : 0.45) * (0.15 + f.likelihood);
  let auditBonus = 0;
  for (const m of ctx.modifiers) {
    if (m.effect.kind === 'likelihoodBoost' && f.tags.includes(m.effect.tag)) threat *= m.effect.multiplier;
    if (m.effect.kind === 'audit' && f.compliance) auditBonus = BLENDED_AUDIT_BONUS;
  }
  const exposure = a.internetExposed ? 1.0 : 0.5;
  const impact = (a.criticality / 5) * (0.4 + (f.severity / 10) * 0.6) * (0.5 + 0.5 * SENSITIVITY_WEIGHT[a.sensitivity]);
  return threat * exposure * impact + auditBonus;
}

/** Added to a compliance finding's blended score while a questionnaire is open. Scores run roughly 0.02 to 0.8. */
export const BLENDED_AUDIT_BONUS = 0.12;

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
  likelihoodFirst: { id: 'likelihoodFirst', rank: likelihoodFirst },
  ssvc: { id: 'ssvc', rank: ssvc },
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
