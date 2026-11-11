import { describe, expect, it } from 'vitest';
import { autoPick, commitFixes, createGame, validateScenario } from '../game';
import { exploitProbability, resolveRound } from '../resolve';
import { getStrategy, pickUnderCapacity, severityFirst, STRATEGIES } from '../strategies';
import { TUNING } from '../tuning';
import type { GameEvent, GroundTruth, Scenario, StrategyId } from '../types';
import { assets, findings, scenario, scenarioWithOnlyEvent } from './fixture';

const econ = scenario.config.economics;
const withEvent = (e: GameEvent): Scenario => ({ ...scenario, events: [...scenario.events, e] });
const ev = (id: string, effects: GameEvent['effects']): GameEvent => ({
  id,
  plainTitle: id,
  techTitle: id,
  plainBody: '',
  techBody: '',
  effects,
});

describe('validateScenario event effects', () => {
  it('rejects markKnownExploited naming an unknown finding', () => {
    const bad = withEvent(ev('e-bad', [{ kind: 'markKnownExploited', findingId: 'ghost' }]));
    expect(() => validateScenario(bad)).toThrow('event e-bad: markKnownExploited references unknown finding ghost');
  });
  it('accepts markKnownExploited naming a real finding', () => {
    const ok = withEvent(ev('e-ok', [{ kind: 'markKnownExploited', findingId: 'f-mid' }]));
    expect(() => validateScenario(ok)).not.toThrow();
  });
  it('rejects setExposure naming an unknown asset', () => {
    const bad = withEvent(ev('e-bad', [{ kind: 'setExposure', assetId: 'a-ghost', internetExposed: true }]));
    expect(() => validateScenario(bad)).toThrow('event e-bad: setExposure references unknown asset a-ghost');
  });
  it('accepts setExposure naming a real asset', () => {
    const ok = withEvent(ev('e-ok', [{ kind: 'setExposure', assetId: 'a-db', internetExposed: true }]));
    expect(() => validateScenario(ok)).not.toThrow();
  });
  it('rejects a duplicate event id', () => {
    const bad: Scenario = { ...scenario, events: [...scenario.events, scenario.events[0]!] };
    expect(() => validateScenario(bad)).toThrow(/duplicate event id e-zero/);
  });
  it('rejects bad config when there are no findings', () => {
    const base = { ...scenario, findings: [], events: [] };
    expect(() => validateScenario({ ...base, config: { ...scenario.config, rounds: 0 } })).toThrow('config.rounds must be >= 1');
    expect(() => validateScenario({ ...base, config: { ...scenario.config, capacityPerRound: 0 } })).toThrow(
      'config.capacityPerRound must be >= 1',
    );
  });
  it('rejects an audit allowance that is negative or not a whole number', () => {
    const withAllowance = (n: number) => ({
      ...scenario,
      config: { ...scenario.config, economics: { ...scenario.config.economics, auditAllowance: n } },
    });
    expect(() => validateScenario(withAllowance(-1))).toThrow('economics.auditAllowance must be an integer >= 0');
    expect(() => validateScenario(withAllowance(1.5))).toThrow('economics.auditAllowance must be an integer >= 0');
    expect(() => validateScenario(withAllowance(0))).not.toThrow();
  });
});

describe('commitFixes validation', () => {
  it('rejects over-budget picks with both numbers in the message', () => {
    const g = createGame(scenario, 3);
    expect(() => commitFixes(g, scenario, ['f-scary', 'f-kev'])).toThrow('Fixes cost 5 but capacity is 4');
  });
  it('accepts a pick that exactly fills capacity', () => {
    const g = createGame(scenario, 3);
    expect(() => commitFixes(g, scenario, ['f-scary', 'f-cheap1'])).not.toThrow();
  });
  it('rejects ids not in the backlog and does not mutate the game', () => {
    const g = createGame(scenario, 3);
    const before = JSON.stringify(g.state);
    expect(() => commitFixes(g, scenario, ['nope'])).toThrow('Finding nope is not in the backlog');
    expect(JSON.stringify(g.state)).toBe(before);
  });
  it('rejects a finding that was fixed in an earlier round', () => {
    const sc = { ...scenario, events: [] };
    let g = commitFixes(createGame(sc, 3), sc, ['f-cheap1']);
    g = { ...g, state: { ...g.state, phase: 'choose' } };
    expect(() => commitFixes(g, sc, ['f-cheap1'])).toThrow(/not in the backlog/);
  });
});

describe('state.currentEvent', () => {
  it('is undefined before firstEventRound and the drawn event after', () => {
    expect(createGame(scenario, 9).state.currentEvent).toBeUndefined();
    expect(createGame(scenarioWithOnlyEvent('e-cut'), 9).state.currentEvent?.id).toBe('e-cut');
  });
});

describe('durational events leave the backlog alone', () => {
  it('likelihoodBoost registers a modifier and does not touch findings', () => {
    const g = createGame(scenarioWithOnlyEvent('e-zero'), 4);
    expect(g.state.backlog).toHaveLength(findings.length);
    expect(g.state.modifiers).toHaveLength(1);
    expect(g.state.modifiers[0]!.expiresAfterRound).toBe(2);
    expect(g.state.assets).toEqual(assets);
  });
  it('audit registers a modifier and leaves capacity untouched', () => {
    const g = createGame(scenarioWithOnlyEvent('e-audit'), 4);
    expect(g.state.modifiers.map((m) => m.effect.kind)).toEqual(['audit']);
    expect(g.state.capacity).toBe(scenario.config.capacityPerRound);
  });
});

describe('resolveRound error branches', () => {
  const truth: GroundTruth = {
    trueLikelihood: { 'f-kev': 0.9 },
    rolls: { 'f-kev': [0.0, 0.99] },
    deck: [],
  };
  const base = { round: 1, backlog: [findings[0]!], assets, modifiers: [], truth, econ };

  it('burns a finding whose roll is below its probability', () => {
    const r = resolveRound(base);
    expect(r.burned).toEqual(['f-kev']);
    expect(r.emergencyDebt).toBe(2);
    expect(r.incidents[0]!.cause).toBe('exploited');
  });
  it('spares a finding whose roll is above its probability', () => {
    const r = resolveRound({ ...base, round: 2 });
    expect(r.burned).toEqual([]);
    expect(r.incidents).toEqual([]);
  });
  it('treats a roll exactly equal to p as a miss', () => {
    const p = exploitProbability(findings[0]!, assets[0]!, 0.9, []);
    const t: GroundTruth = { ...truth, rolls: { 'f-kev': [p] } };
    expect(resolveRound({ ...base, truth: t }).burned).toEqual([]);
  });
  it('throws for a finding on an unknown asset', () => {
    const orphan = { ...findings[0]!, assetId: 'a-ghost' };
    expect(() => resolveRound({ ...base, backlog: [orphan] })).toThrow('Finding f-kev references unknown asset a-ghost');
  });
  it('throws when the finding has no rolls', () => {
    const t: GroundTruth = { ...truth, rolls: {} };
    expect(() => resolveRound({ ...base, truth: t })).toThrow('No ground truth for finding f-kev');
  });
  it('throws when the finding has no true likelihood', () => {
    const t: GroundTruth = { ...truth, trueLikelihood: {} };
    expect(() => resolveRound({ ...base, truth: t })).toThrow('No ground truth for finding f-kev');
  });
  it('throws when the round is past the pre-rolled dice', () => {
    expect(() => resolveRound({ ...base, round: 3 })).toThrow('No roll for finding f-kev in round 3');
  });
  it('accepts a true likelihood of exactly 0 (not treated as missing)', () => {
    const t: GroundTruth = { ...truth, trueLikelihood: { 'f-kev': 0 } };
    expect(resolveRound({ ...base, truth: t }).burned).toEqual([]);
  });
});

describe('resolveRound audit', () => {
  const quiet = (ids: string[]): GroundTruth => ({
    trueLikelihood: Object.fromEntries(ids.map((i) => [i, 0.5])),
    rolls: Object.fromEntries(ids.map((i) => [i, [0.999]])),
    deck: [],
  });
  const audit = [{ effect: { kind: 'audit' as const }, expiresAfterRound: 1 }];
  const comp = (id: string, severity: number) => ({ ...findings[3]!, id, severity });

  it('charges one audit incident naming the worst open compliance finding', () => {
    const backlog = [comp('c-low', 3), comp('c-high', 8), comp('c-mid', 5)];
    const r = resolveRound({ round: 1, backlog, assets, modifiers: audit, truth: quiet(backlog.map((f) => f.id)), econ });
    expect(r.incidents).toHaveLength(1);
    const i = r.incidents[0]!;
    expect(i.cause).toBe('audit');
    expect(i.findingId).toBe('c-high');
    expect(i.relatedFindingIds).toEqual(['c-low', 'c-high', 'c-mid']);
    expect(i.impact.auditFailure).toBe(true);
    expect(i.impact.dollars).toBe(econ.auditFailureCost);
    expect(r.burned).toEqual([]);
  });
  it('breaks a severity tie by the lower id', () => {
    const backlog = [comp('c-b', 6), comp('c-a', 6)];
    const r = resolveRound({ round: 1, backlog, assets, modifiers: audit, truth: quiet(['c-a', 'c-b']), econ });
    expect(r.incidents[0]!.findingId).toBe('c-a');
  });
  it('adds the per-item cost for every open compliance finding', () => {
    const backlog = [comp('c-a', 6), comp('c-b', 2), comp('c-c', 1)];
    const e = { ...econ, auditFailureCostPerItem: 100 };
    const r = resolveRound({ round: 1, backlog, assets, modifiers: audit, truth: quiet(['c-a', 'c-b', 'c-c']), econ: e });
    expect(r.incidents[0]!.impact.dollars).toBe(e.auditFailureCost + 300);
  });
  it('passes while open compliance findings stay within the allowance, and charges every one past it', () => {
    const backlog = [comp('c-a', 6), comp('c-b', 2), comp('c-c', 1)];
    const ids = ['c-a', 'c-b', 'c-c'];
    const within = { ...econ, auditFailureCostPerItem: 100, auditAllowance: 3 };
    expect(resolveRound({ round: 1, backlog, assets, modifiers: audit, truth: quiet(ids), econ: within }).incidents).toEqual([]);
    const over = { ...within, auditAllowance: 2 };
    const r = resolveRound({ round: 1, backlog, assets, modifiers: audit, truth: quiet(ids), econ: over });
    expect(r.incidents).toHaveLength(1);
    expect(r.incidents[0]!.impact.dollars).toBe(over.auditFailureCost + 300);
  });
  it('does not charge an audit without open compliance findings or without the modifier', () => {
    expect(resolveRound({ round: 1, backlog: [findings[0]!], assets, modifiers: audit, truth: quiet(['f-kev']), econ }).incidents).toEqual([]);
    expect(resolveRound({ round: 1, backlog: [comp('c-a', 6)], assets, modifiers: [], truth: quiet(['c-a']), econ }).incidents).toEqual([]);
  });
  it('excludes a compliance finding that was exploited this round', () => {
    const t: GroundTruth = {
      trueLikelihood: { 'c-burn': 1, 'c-safe': 0.5 },
      rolls: { 'c-burn': [0], 'c-safe': [0.999] },
      deck: [],
    };
    const r = resolveRound({ round: 1, backlog: [comp('c-burn', 9), comp('c-safe', 2)], assets, modifiers: audit, truth: t, econ });
    expect(r.burned).toEqual(['c-burn']);
    const a = r.incidents.find((i) => i.cause === 'audit')!;
    expect(a.findingId).toBe('c-safe');
    expect(a.relatedFindingIds).toEqual(['c-safe']);
  });
});

describe('exploitProbability clamp', () => {
  it('never exceeds maxRoundProbability and never goes below 0', () => {
    const boost = [{ effect: { kind: 'likelihoodBoost' as const, tag: 'vendor:acme', multiplier: 100 }, expiresAfterRound: 1 }];
    expect(exploitProbability(findings[0]!, assets[0]!, 1, boost)).toBe(TUNING.maxRoundProbability);
    expect(exploitProbability(findings[0]!, assets[0]!, 0, [])).toBe(0);
  });
});

describe('strategy tie-breaks and lookup', () => {
  const twin = (id: string) => ({ ...findings[2]!, id });

  it('every strategy orders otherwise identical findings by id ascending, whatever the input order', () => {
    for (const id of Object.keys(STRATEGIES) as StrategyId[]) {
      const fwd = getStrategy(id).rank([twin('t-a'), twin('t-b'), twin('t-c')], assets);
      const rev = getStrategy(id).rank([twin('t-c'), twin('t-b'), twin('t-a')], assets);
      expect(fwd.map((f) => f.id), id).toEqual(['t-a', 't-b', 't-c']);
      expect(rev.map((f) => f.id), id).toEqual(['t-a', 't-b', 't-c']);
    }
  });
  it('does not mutate its input array', () => {
    const input = [twin('t-b'), twin('t-a')];
    severityFirst(input, assets);
    expect(input.map((f) => f.id)).toEqual(['t-b', 't-a']);
  });
  it('severityFirst ranks by severity, then likelihood, before id', () => {
    const a = { ...twin('z'), severity: 5, likelihood: 0.1 };
    const b = { ...twin('y'), severity: 5, likelihood: 0.9 };
    const c = { ...twin('x'), severity: 9, likelihood: 0 };
    expect(severityFirst([a, b, c], assets).map((f) => f.id)).toEqual(['x', 'y', 'z']);
  });
  it('throws a readable error for an unknown strategy id', () => {
    expect(() => getStrategy('nonsense' as StrategyId)).toThrow('Unknown strategy nonsense');
  });
  it('autoPick throws for an unknown strategy id', () => {
    expect(() => autoPick(createGame(scenario, 1), 'nonsense' as StrategyId)).toThrow(/Unknown strategy/);
  });
  it('rankers throw when a finding references an unknown asset', () => {
    const orphan = { ...findings[0]!, assetId: 'a-ghost' };
    expect(() => getStrategy('assetFirst').rank([orphan, findings[1]!], assets)).toThrow(/unknown asset a-ghost/);
  });
});

describe('pickUnderCapacity', () => {
  it('skips what does not fit and keeps filling (greedy, not stopping)', () => {
    const ranked = [findings[1]!, findings[0]!, findings[2]!]; // costs 3, 2, 1
    expect(pickUnderCapacity(ranked, 4)).toEqual(['f-scary', 'f-cheap1']);
  });
  it('returns nothing for zero capacity and for an empty list', () => {
    expect(pickUnderCapacity(findings, 0)).toEqual([]);
    expect(pickUnderCapacity([], 5)).toEqual([]);
  });
  it('stops once capacity is used exactly', () => {
    const ranked = [findings[0]!, findings[2]!, findings[3]!]; // costs 2, 1, 1
    expect(pickUnderCapacity(ranked, 3)).toEqual(['f-kev', 'f-cheap1']);
  });
});
