import { describe, expect, it } from 'vitest';
import {
  autoPick,
  commitFixes,
  createGame,
  nextRound,
  runScript,
  runStrategy,
  summarize,
  validateScenario,
} from '../game';
import { exploitProbability, impactOf } from '../resolve';
import { TUNING } from '../tuning';
import { buildScorecard, longRun, longRunOrder, replayGrade, replayLuck } from '../scorecard';
import { STRATEGY_IDS } from '../types';
import { assets, findings, scenario, scenarioWithOnlyEvent } from './fixture';

describe('validateScenario', () => {
  it('accepts the fixture', () => {
    expect(() => validateScenario(scenario)).not.toThrow();
  });

  it('rejects a finding that can never be afforded', () => {
    const bad = { ...scenario, findings: [{ ...findings[0]!, fixCost: 99 }] };
    expect(() => validateScenario(bad)).toThrow(/never be afforded/);
  });

  it('rejects duplicate ids', () => {
    const bad = { ...scenario, findings: [findings[0]!, findings[0]!] };
    expect(() => validateScenario(bad)).toThrow(/duplicate finding/);
  });
});

describe('createGame', () => {
  it('rolls truth for every finding, including event-added ones', () => {
    const g = createGame(scenario, 1);
    for (const f of findings) {
      expect(g.truth.rolls[f.id]).toHaveLength(scenario.config.rounds);
      expect(g.truth.trueLikelihood[f.id]).toBeGreaterThanOrEqual(TUNING.likelihoodFloor);
      expect(g.truth.trueLikelihood[f.id]).toBeLessThanOrEqual(1);
    }
    expect(g.truth.deck.slice().sort()).toEqual(scenario.events.map((e) => e.id).sort());
  });

  it('starts in round 1 with full capacity and no event before firstEventRound', () => {
    const g = createGame(scenario, 1);
    expect(g.state.round).toBe(1);
    expect(g.state.phase).toBe('choose');
    expect(g.state.capacity).toBe(4);
    expect(g.state.currentEvent).toBeUndefined();
    expect(g.state.backlog).toHaveLength(findings.length);
  });

  it('does not mutate the scenario', () => {
    const snapshot = JSON.stringify(scenario);
    const g = createGame(scenario, 5);
    commitFixes(g, scenario, ['f-kev']);
    expect(JSON.stringify(scenario)).toBe(snapshot);
  });
});

describe('commitFixes', () => {
  it('rejects over-capacity and unknown ids', () => {
    const g = createGame(scenario, 1);
    expect(() => commitFixes(g, scenario, ['f-scary', 'f-kev'])).toThrow(/capacity/);
    expect(() => commitFixes(g, scenario, ['nope'])).toThrow(/not in the backlog/);
    expect(() => commitFixes(g, scenario, ['f-kev', 'f-kev'])).toThrow(/Duplicate/);
  });

  it('moves fixed findings out of the backlog and records the round', () => {
    const g = createGame(scenario, 1);
    const g2 = commitFixes(g, scenario, ['f-kev', 'f-cheap1']);
    expect(g2.state.fixed).toEqual(['f-kev', 'f-cheap1']);
    expect(g2.state.backlog.map((f) => f.id)).not.toContain('f-kev');
    expect(g2.state.history).toHaveLength(1);
    expect(g2.state.history[0]!.capacityUsed).toBe(3);
    expect(g2.state.phase).toBe('resolved');
    // original untouched
    expect(g.state.fixed).toEqual([]);
  });

  it('exploits exactly the findings whose roll is under their probability', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = createGame(scenario, seed);
      const g2 = commitFixes(g, scenario, []);
      const expected = findings
        .filter((f) => {
          const asset = assets.find((a) => a.id === f.assetId)!;
          const p = exploitProbability(f, asset, g.truth.trueLikelihood[f.id]!, []);
          return g.truth.rolls[f.id]![0]! < p;
        })
        .map((f) => f.id);
      expect(g2.state.exploited).toEqual(expected);
      expect(g2.state.incidents.map((i) => i.findingId)).toEqual(expected);
    }
  });

  it('charges emergency debt against next round capacity', () => {
    // find a seed where something burns in round 1
    let found = false;
    for (let seed = 1; seed <= 200 && !found; seed++) {
      const g = createGame(scenario, seed);
      const g2 = commitFixes(g, scenario, []);
      if (g2.state.exploited.length === 0) continue;
      found = true;
      const raw = g2.state.exploited.reduce((s, id) => s + findings.find((f) => f.id === id)!.fixCost, 0);
      const debt = Math.min(raw, TUNING.maxEmergencyDebt);
      expect(g2.state.emergencyDebt).toBe(debt);
      const g3 = nextRound(g2, scenario);
      const eventDelta = g3.state.modifiers
        .filter((m) => m.effect.kind === 'capacityDelta')
        .reduce((s, m) => s + (m.effect.kind === 'capacityDelta' ? m.effect.delta : 0), 0);
      expect(g3.state.capacity).toBe(Math.max(TUNING.minCapacity, 4 + eventDelta - debt));
      expect(g3.state.emergencyDebt).toBe(debt);
    }
    expect(found).toBe(true);
  });

  it('finishes after the configured rounds', () => {
    let g = createGame(scenario, 2);
    for (let r = 1; r <= 4; r++) {
      expect(g.state.round).toBe(r);
      g = commitFixes(g, scenario, []);
      if (r < 4) {
        expect(g.state.phase).toBe('resolved');
        g = nextRound(g, scenario);
      }
    }
    expect(g.state.phase).toBe('finished');
    expect(() => commitFixes(g, scenario, [])).toThrow(/phase/);
    expect(() => nextRound(g, scenario)).toThrow(/phase/);
  });
});

describe('events', () => {
  it('likelihoodBoost multiplies probability for tagged findings only', () => {
    const kev = findings.find((f) => f.id === 'f-kev')!;
    const cheap = findings.find((f) => f.id === 'f-cheap1')!;
    const web = assets[0]!;
    const mod = [{ effect: { kind: 'likelihoodBoost' as const, tag: 'vendor:acme', multiplier: 3 }, expiresAfterRound: 9 }];
    const base = exploitProbability(kev, web, 0.2, []);
    expect(exploitProbability(kev, web, 0.2, mod)).toBeCloseTo(Math.min(base * 3, TUNING.maxRoundProbability));
    expect(exploitProbability(cheap, web, 0.2, mod)).toBe(exploitProbability(cheap, web, 0.2, []));
  });

  it('capacityDelta reduces capacity for its duration and then expires', () => {
    const s = scenarioWithOnlyEvent('e-cut', 2);
    let g = createGame(s, 1);
    expect(g.state.capacity).toBe(4);
    g = nextRound(commitFixes(g, s, []), s);
    expect(g.state.currentEvent?.id).toBe('e-cut');
    expect(g.state.capacity).toBe(Math.max(TUNING.minCapacity, 2 - g.state.emergencyDebt));
    g = nextRound(commitFixes(g, s, []), s);
    expect(g.state.modifiers).toHaveLength(0);
    expect(g.state.capacity).toBe(Math.max(TUNING.minCapacity, 4 - g.state.emergencyDebt));
  });

  it('audit fails when a compliance finding is left open, passes when fixed', () => {
    const s = scenarioWithOnlyEvent('e-audit', 1);
    const open = createGame(s, 1);
    expect(open.state.currentEvent?.id).toBe('e-audit');
    const failed = commitFixes(open, s, []);
    const audit = failed.state.incidents.find((i) => i.cause === 'audit');
    expect(audit).toBeDefined();
    expect(audit!.impact.auditFailure).toBe(true);
    expect(audit!.impact.dollars).toBe(5000);
    expect(audit!.relatedFindingIds!.sort()).toEqual(['f-cheap2', 'f-comp']);

    const passed = commitFixes(createGame(s, 1), s, ['f-cheap2', 'f-comp']);
    expect(passed.state.incidents.some((i) => i.cause === 'audit')).toBe(false);
  });

  it('addAsset, markKnownExploited and setExposure apply immediately', () => {
    const newAsset = { id: 'a-laptop', name: 'Laptop', criticality: 2 as const, internetExposed: false, sensitivity: 'customer' as const, records: 10 };
    const newFinding = { ...findings[2]!, id: 'f-laptop', assetId: 'a-laptop' };
    const s = {
      ...scenario,
      events: [
        {
          id: 'e-multi',
          plainTitle: '',
          techTitle: '',
          plainBody: '',
          techBody: '',
          effects: [
            { kind: 'addAsset' as const, asset: newAsset, findings: [newFinding] },
            { kind: 'markKnownExploited' as const, findingId: 'f-scary' },
            { kind: 'setExposure' as const, assetId: 'a-db', internetExposed: true },
          ],
        },
      ],
      config: { ...scenario.config, firstEventRound: 1 },
    };
    const g = createGame(s, 1);
    expect(g.truth.rolls['f-laptop']).toHaveLength(4);
    expect(g.state.assets.map((a) => a.id)).toContain('a-laptop');
    expect(g.state.backlog.map((f) => f.id)).toContain('f-laptop');
    expect(g.state.backlog.find((f) => f.id === 'f-scary')!.knownExploited).toBe(true);
    expect(g.state.assets.find((a) => a.id === 'a-db')!.internetExposed).toBe(true);
  });
});

describe('impactOf', () => {
  it('scales with criticality, sensitivity and severity', () => {
    const econ = scenario.config.economics;
    const web = assets[0]!;
    const db = assets[1]!;
    const small = impactOf(findings[2]!, web, econ);
    const big = impactOf(findings[1]!, db, econ);
    expect(big.dollars).toBeGreaterThan(small.dollars);
    expect(big.downtimeDays).toBeGreaterThan(small.downtimeDays);
    expect(big.recordsExposed).toBeGreaterThan(small.recordsExposed);
    expect(small.auditFailure).toBe(false);
  });
});

describe('autoPick and runStrategy', () => {
  it('autoPick respects capacity', () => {
    const g = createGame(scenario, 4);
    for (const id of STRATEGY_IDS) {
      const picks = autoPick(g, id);
      const cost = picks.reduce((s, fid) => s + findings.find((f) => f.id === fid)!.fixCost, 0);
      expect(cost).toBeLessThanOrEqual(g.state.capacity);
    }
  });

  it('runStrategy plays to the end and is deterministic', () => {
    const a = runStrategy(scenario, 11, 'blended');
    const b = runStrategy(scenario, 11, 'blended');
    expect(a).toEqual(b);
    expect(a.fixedByRound).toHaveLength(4);
    expect(a.totalCost).toBe(a.totals.dollars);
  });
});

describe('buildScorecard', () => {
  it('requires a finished game', () => {
    expect(() => buildScorecard(createGame(scenario, 1), scenario)).toThrow(/finished/);
  });

  it('ranks the player against every strategy', () => {
    let g = createGame(scenario, 8);
    while (g.state.phase !== 'finished') {
      g = commitFixes(g, scenario, autoPick(g, 'blended'));
      if (g.state.phase === 'resolved') g = nextRound(g, scenario);
    }
    const card = buildScorecard(g, scenario);
    expect(Object.keys(card.strategies).sort()).toEqual([...STRATEGY_IDS].sort());
    expect(card.player).toEqual(summarize(g));
    expect(card.player.totalCost).toBe(card.strategies.blended.totalCost);
    expect(card.playerRank).toBeGreaterThanOrEqual(1);
    expect(card.playerRank).toBeLessThanOrEqual(STRATEGY_IDS.length + 1);
    expect(card.strategies[card.bestStrategy].totalCost).toBeLessThanOrEqual(card.strategies[card.worstStrategy].totalCost);
  });
});

describe('deck override, scripts and replayGrade', () => {
  it('createGame honours a deck override and keeps the same dice', () => {
    const a = createGame(scenario, 5);
    const deck = a.truth.deck.slice().reverse();
    const b = createGame(scenario, 5, { deck });
    expect(b.truth.deck).toEqual(deck);
    expect(b.truth.rolls).toEqual(a.truth.rolls);
    expect(() => createGame(scenario, 5, { deck: ['nope'] })).toThrow(/unknown event/);
  });

  it('a script replayed on its own seed reproduces the original cost', () => {
    let g = createGame(scenario, 9);
    while (g.state.phase !== 'finished') {
      g = commitFixes(g, scenario, autoPick(g, 'severityFirst'));
      if (g.state.phase === 'resolved') g = nextRound(g, scenario);
    }
    const script = g.state.history.map((r) => r.fixedIds);
    expect(runScript(scenario, 9, script, { deck: g.truth.deck }).totalCost).toBe(summarize(g).totalCost);
  });

  it('replayGrade is deterministic and never rates you below 1', () => {
    let g = createGame(scenario, 12);
    while (g.state.phase !== 'finished') {
      g = commitFixes(g, scenario, autoPick(g, 'cheapestFirst'));
      if (g.state.phase === 'resolved') g = nextRound(g, scenario);
    }
    const r1 = replayGrade(scenario, g, STRATEGY_IDS, 30);
    const r2 = replayGrade(scenario, g, STRATEGY_IDS, 30);
    expect(r1).toEqual(r2);
    expect(r1.ratio).toBeGreaterThanOrEqual(1);
    expect(r1.years).toBe(30);
    expect(() => replayGrade(scenario, createGame(scenario, 1))).toThrow(/finished/);
  });

  it('replayLuck places the real year inside the replay distribution', () => {
    let g = createGame(scenario, 12);
    while (g.state.phase !== 'finished') {
      g = commitFixes(g, scenario, autoPick(g, 'blended'));
      if (g.state.phase === 'resolved') g = nextRound(g, scenario);
    }
    const luck = replayLuck(scenario, g, 40);
    expect(luck.years).toBe(40);
    expect(luck.costs).toHaveLength(40);
    expect([...luck.costs].sort((a, b) => a - b)).toEqual(luck.costs);
    expect(luck.median).toBeGreaterThanOrEqual(luck.costs[0]!);
    expect(luck.median).toBeLessThanOrEqual(luck.costs[39]!);
    expect(luck.betterThan).toBeGreaterThanOrEqual(0);
    expect(luck.betterThan).toBeLessThanOrEqual(1);
    expect(replayLuck(scenario, g, 40)).toEqual(luck);
    expect(() => replayLuck(scenario, createGame(scenario, 1))).toThrow(/finished/);
  });
});

describe('longRun', () => {
  it('is deterministic, sums win shares to one, and orders by mean cost', () => {
    const a = longRun(scenario, 40);
    const b = longRun(scenario, 40);
    expect(a).toEqual(b);
    const shares = STRATEGY_IDS.reduce((s, id) => s + a[id].winShare, 0);
    expect(shares).toBeCloseTo(1, 6);
    const order = longRunOrder(a);
    for (let i = 1; i < order.length; i++) {
      expect(a[order[i]!].meanCost).toBeGreaterThanOrEqual(a[order[i - 1]!].meanCost);
    }
  });
});
