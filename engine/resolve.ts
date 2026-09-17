import type {
  ActiveModifier,
  Asset,
  Economics,
  Finding,
  GroundTruth,
  Id,
  Impact,
  Incident,
} from './types';
import { TUNING } from './tuning';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Per-round probability that an open finding gets exploited. Pure. */
export function exploitProbability(
  f: Finding,
  asset: Asset,
  trueLikelihood: number,
  modifiers: readonly ActiveModifier[],
): number {
  let p = trueLikelihood * TUNING.baseRate;
  p *= asset.internetExposed ? TUNING.exposureFactor.exposed : TUNING.exposureFactor.internal;
  if (f.knownExploited) p *= TUNING.knownExploitedMultiplier;
  for (const m of modifiers) {
    if (m.effect.kind === 'likelihoodBoost' && f.tags.includes(m.effect.tag)) {
      p *= m.effect.multiplier;
    }
  }
  return clamp(p, 0, TUNING.maxRoundProbability);
}

/** Business impact of one exploited finding. Pure. */
export function impactOf(f: Finding, asset: Asset, econ: Economics): Impact {
  const t = TUNING.impact;
  const sev = clamp(f.severity, 0, 10) / 10;

  const downtimeDays =
    round2(t.downtimeDaysByCriticality[asset.criticality] * (t.downtimeSeverityMin + sev * t.downtimeSeveritySpan));

  const recordsExposed = Math.round(asset.records * t.recordsFraction[asset.sensitivity] * sev);

  const direct = f.severity * asset.criticality * t.dollarsPerSeverityPoint;
  const dollars = Math.round(direct + downtimeDays * econ.dailyRevenue + recordsExposed * econ.costPerRecord);

  return { downtimeDays, dollars, recordsExposed, auditFailure: false };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ResolveInput {
  round: number;
  backlog: readonly Finding[];
  assets: readonly Asset[];
  modifiers: readonly ActiveModifier[];
  truth: GroundTruth;
  econ: Economics;
}

export interface ResolveResult {
  incidents: Incident[];
  /** Findings that were exploited this round and leave the backlog. */
  burned: Id[];
  /** Fix cost of burned findings, charged against next round. */
  emergencyDebt: number;
}

/**
 * Decide which open findings get exploited this round, using the pre-rolled
 * dice in `truth`. Also handles the audit modifier. Pure.
 */
export function resolveRound(input: ResolveInput): ResolveResult {
  const { round, backlog, assets, modifiers, truth, econ } = input;
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const incidents: Incident[] = [];
  const burned: Id[] = [];
  let emergencyDebt = 0;

  for (const f of backlog) {
    const asset = assetById.get(f.assetId);
    if (!asset) throw new Error(`Finding ${f.id} references unknown asset ${f.assetId}`);
    const rolls = truth.rolls[f.id];
    const tl = truth.trueLikelihood[f.id];
    if (!rolls || tl === undefined) throw new Error(`No ground truth for finding ${f.id}`);
    const roll = rolls[round - 1];
    if (roll === undefined) throw new Error(`No roll for finding ${f.id} in round ${round}`);

    const p = exploitProbability(f, asset, tl, modifiers);
    if (roll < p) {
      incidents.push({
        round,
        findingId: f.id,
        assetId: f.assetId,
        cause: 'exploited',
        impact: impactOf(f, asset, econ),
      });
      burned.push(f.id);
      emergencyDebt += f.fixCost;
    }
  }

  const auditActive = modifiers.some((m) => m.effect.kind === 'audit');
  if (auditActive) {
    const openCompliance = backlog.filter((f) => f.compliance && !burned.includes(f.id));
    if (openCompliance.length > 0) {
      const worst = openCompliance.slice().sort((a, b) => b.severity - a.severity || (a.id < b.id ? -1 : 1))[0]!;
      incidents.push({
        round,
        findingId: worst.id,
        assetId: worst.assetId,
        cause: 'audit',
        relatedFindingIds: openCompliance.map((f) => f.id),
        impact: { downtimeDays: 0, dollars: econ.auditFailureCost, recordsExposed: 0, auditFailure: true },
      });
    }
  }

  return { incidents, burned, emergencyDebt };
}
