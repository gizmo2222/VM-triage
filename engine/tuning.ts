/**
 * Every magic number in the engine lives here. The balance test is the gate
 * on changing any of them.
 */

export const TUNING = {
  /** Per-round exploitation probability = trueLikelihood * baseRate * exposure * kev * events, capped. */
  baseRate: 0.22,
  maxRoundProbability: 0.9,
  exposureFactor: { exposed: 1.0, internal: 0.25 },
  knownExploitedMultiplier: 1.8,

  /** trueLikelihood = clamp(likelihood + uniform(-noise, +noise), floor, 1). */
  likelihoodNoise: 0.3,
  likelihoodFloor: 0.02,

  minCapacity: 1,

  impact: {
    /** Indexed by asset criticality 1..5 (index 0 unused). Scaled by severity below. */
    downtimeDaysByCriticality: [0, 0.25, 0.5, 1, 2, 4] as const,
    /** downtime *= (min + severity/10 * span). */
    downtimeSeverityMin: 0.4,
    downtimeSeveritySpan: 0.8,
    /** Fraction of an asset's records exposed, by sensitivity, scaled by severity/10. */
    recordsFraction: { none: 0, internal: 0, customer: 0.35, regulated: 0.5 } as const,
    /** Direct recovery cost = severity * criticality * this. IT bill, replacement gear, cleanup. */
    dollarsPerSeverityPoint: 350,
  },
} as const;

export const SENSITIVITY_WEIGHT = { none: 0.2, internal: 0.5, customer: 0.8, regulated: 1.0 } as const;
