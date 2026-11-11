import { describe, expect, it } from 'vitest';
import { autoPick, commitFixes, commitScripted, createGame, nextRound, runScript, validateScenario } from '../game';
import { replayLuck } from '../scorecard';
import type { StrategyId } from '../types';
import { scenario as fixture } from './fixture';
import { dental } from '@content/scenarios/dental';

function play(sc: typeof dental, seed: number, strategy: StrategyId) {
  let g = createGame(sc, seed);
  while (g.state.phase !== 'finished') {
    g = commitFixes(g, sc, autoPick(g, strategy));
    if (g.state.phase === 'resolved') g = nextRound(g, sc);
  }
  return g;
}

describe('commitScripted duplicates', () => {
  it('fixes a repeated id once and does not throw', () => {
    const g = commitScripted(createGame(fixture, 1), fixture, ['f-cheap1', 'f-cheap1']);
    expect(g.state.history[0]!.fixedIds).toEqual(['f-cheap1']);
  });
});

describe('validateScenario NaN', () => {
  const bad = (patch: (s: typeof fixture) => typeof fixture) => () => validateScenario(patch(fixture));
  it('rejects NaN severity, likelihood, criticality and records', () => {
    expect(bad((s) => ({ ...s, findings: [{ ...s.findings[0]!, severity: NaN }, ...s.findings.slice(1)] }))).toThrow();
    expect(bad((s) => ({ ...s, findings: [{ ...s.findings[0]!, likelihood: NaN }, ...s.findings.slice(1)] }))).toThrow();
    expect(bad((s) => ({ ...s, assets: [{ ...s.assets[0]!, criticality: NaN as never }, ...s.assets.slice(1)] }))).toThrow();
    expect(bad((s) => ({ ...s, assets: [{ ...s.assets[0]!, records: NaN }, ...s.assets.slice(1)] }))).toThrow();
  });
});

describe('replayLuck', () => {
  it('counts ties as half-beaten (dental 279 cheapestFirst)', () => {
    const g = play(dental, 279, 'cheapestFirst');
    expect(replayLuck(dental, g).betterThan).toBeCloseTo(0.815, 5);
  });

  it('excludes the played seed from the fresh-dice replays', () => {
    const g = play(dental, 100_000, 'blended');
    const script = g.state.history.map((r) => r.fixedIds);
    const expected: number[] = [];
    for (let s = 100_001; s <= 100_100; s++) expected.push(runScript(dental, s, script, { deck: g.truth.deck }).totalCost);
    expected.sort((a, b) => a - b);
    expect(replayLuck(dental, g).costs).toEqual(expected);
  });
});
