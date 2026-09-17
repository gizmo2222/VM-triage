import { describe, expect, it } from 'vitest';
import { autoPick, commitFixes, createGame, nextRound, runStrategy } from '../game';
import { STRATEGY_IDS } from '../types';
import { dental } from '@content/scenarios/dental';

/** Same seed + same choices = same everything. Different seed = different dice. */
describe('replay', () => {
  it('reproduces a full game from seed and choices', () => {
    const play = () => {
      let g = createGame(dental, 20260917);
      const choices: string[][] = [];
      while (g.state.phase !== 'finished') {
        const picks = autoPick(g, 'severityFirst');
        choices.push(picks);
        g = commitFixes(g, dental, picks);
        if (g.state.phase === 'resolved') g = nextRound(g, dental);
      }
      return { g, choices };
    };
    const a = play();
    const b = play();
    expect(a.choices).toEqual(b.choices);
    expect(a.g.state).toEqual(b.g.state);
    expect(a.g.truth).toEqual(b.g.truth);
  });

  it('gives different truth for different seeds', () => {
    const a = createGame(dental, 1).truth;
    const b = createGame(dental, 2).truth;
    expect(a.rolls).not.toEqual(b.rolls);
    expect(a.trueLikelihood).not.toEqual(b.trueLikelihood);
  });

  it('every strategy is deterministic on the dental pack', () => {
    for (const id of STRATEGY_IDS) {
      expect(runStrategy(dental, 99, id)).toEqual(runStrategy(dental, 99, id));
    }
  });

  it('strategies actually differ on the same seed', () => {
    const costs = STRATEGY_IDS.map((id) => runStrategy(dental, 7, id).totalCost);
    expect(new Set(costs).size).toBeGreaterThan(1);
  });
});
