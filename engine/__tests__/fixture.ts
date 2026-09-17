import type { Asset, Finding, GameEvent, Scenario } from '../types';

/** A tiny scenario for unit tests. Two assets, six findings, three events. */

export const assets: Asset[] = [
  { id: 'a-web', name: 'Website', criticality: 2, internetExposed: true, sensitivity: 'customer', records: 100 },
  { id: 'a-db', name: 'Records server', criticality: 5, internetExposed: false, sensitivity: 'regulated', records: 1000 },
];

const f = (
  id: string,
  assetId: string,
  severity: number,
  likelihood: number,
  fixCost: number,
  extra: Partial<Finding> = {},
): Finding => ({
  id,
  plainTitle: `Plain ${id}`,
  techTitle: `Tech ${id}`,
  severity,
  likelihood,
  knownExploited: false,
  assetId,
  fixCost,
  compliance: false,
  tags: [],
  ...extra,
});

export const findings: Finding[] = [
  f('f-kev', 'a-web', 7.5, 0.9, 2, { knownExploited: true, tags: ['vendor:acme'] }),
  f('f-scary', 'a-db', 9.8, 0.05, 3),
  f('f-cheap1', 'a-web', 3.0, 0.3, 1),
  f('f-cheap2', 'a-web', 4.0, 0.2, 1, { compliance: true }),
  f('f-mid', 'a-db', 6.0, 0.4, 2, { tags: ['vendor:acme'] }),
  f('f-comp', 'a-db', 5.0, 0.0, 1, { compliance: true }),
];

export const events: GameEvent[] = [
  {
    id: 'e-zero',
    plainTitle: 'Vendor zero-day',
    techTitle: 'Vendor zero-day',
    plainBody: '',
    techBody: '',
    effects: [{ kind: 'likelihoodBoost', tag: 'vendor:acme', multiplier: 3 }],
    duration: 2,
  },
  {
    id: 'e-cut',
    plainTitle: 'Budget cut',
    techTitle: 'Budget cut',
    plainBody: '',
    techBody: '',
    effects: [{ kind: 'capacityDelta', delta: -2 }],
  },
  {
    id: 'e-audit',
    plainTitle: 'Audit',
    techTitle: 'Audit',
    plainBody: '',
    techBody: '',
    effects: [{ kind: 'audit' }],
  },
];

export const scenario: Scenario = {
  id: 'fixture',
  assets,
  findings,
  events,
  config: {
    rounds: 4,
    capacityPerRound: 4,
    firstEventRound: 2,
    economics: { dailyRevenue: 1000, costPerRecord: 10, auditFailureCost: 5000 },
  },
};

/** Same fixture, but with a single named event so tests can force it on round 1. */
export function scenarioWithOnlyEvent(eventId: string, firstEventRound = 1): Scenario {
  const ev = events.find((e) => e.id === eventId);
  if (!ev) throw new Error(`no fixture event ${eventId}`);
  return { ...scenario, events: [ev], config: { ...scenario.config, firstEventRound } };
}
