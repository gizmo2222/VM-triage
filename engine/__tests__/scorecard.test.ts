import { describe, expect, it } from 'vitest';
import { autoPick, commitFixes, createGame, nextRound, runScript, runStrategy, summarize } from '../game';
import { buildScorecard, longRun, longRunOrder, replayGrade } from '../scorecard';
import { STRATEGY_IDS } from '../types';
import type { StrategyId } from '../types';
import { scenario } from './fixture';
import { dental } from '@content/scenarios/dental';

function play(sc: typeof scenario, seed: number, strategy: StrategyId) {
  let g = createGame(sc, seed);
  while (g.state.phase !== 'finished') {
    g = commitFixes(g, sc, autoPick(g, strategy));
    if (g.state.phase === 'resolved') g = nextRound(g, sc);
  }
  return g;
}

describe('buildScorecard', () => {
  it('replays each strategy on the game seed and ranks the player by strictly cheaper strategies', () => {
    const g = play(scenario, 8, 'cheapestFirst');
    const card = buildScorecard(g, scenario);
    for (const id of STRATEGY_IDS) expect(card.strategies[id]).toEqual(runStrategy(scenario, 8, id));
    const cheaper = STRATEGY_IDS.filter((id) => card.strategies[id].totalCost < card.player.totalCost).length;
    expect(card.playerRank).toBe(1 + cheaper);
  });

  it('ties with a strategy do not push the player down (same picks as that strategy)', () => {
    const g = play(scenario, 8, 'blended');
    const card = buildScorecard(g, scenario);
    expect(card.player.totalCost).toBe(card.strategies.blended.totalCost);
    const cheaper = STRATEGY_IDS.filter((id) => card.strategies[id].totalCost < card.player.totalCost).length;
    expect(card.playerRank).toBe(1 + cheaper);
    // blended itself is never counted as beating the player
    expect(card.playerRank).toBeLessThanOrEqual(STRATEGY_IDS.length);
  });

  it('best and worst are the true min and max cost, first listed id winning ties', () => {
    for (const seed of [1, 2, 3, 8, 21]) {
      const card = buildScorecard(play(scenario, seed, 'severityFirst'), scenario);
      const costs = STRATEGY_IDS.map((id) => card.strategies[id].totalCost);
      expect(card.strategies[card.bestStrategy].totalCost).toBe(Math.min(...costs));
      expect(card.strategies[card.worstStrategy].totalCost).toBe(Math.max(...costs));
      expect(card.bestStrategy).toBe(STRATEGY_IDS[costs.indexOf(Math.min(...costs))]);
      expect(card.worstStrategy).toBe(STRATEGY_IDS[costs.indexOf(Math.max(...costs))]);
    }
  });

  it('a player who does nothing is ranked behind every strategy that spends', () => {
    let g = createGame(scenario, 4);
    while (g.state.phase !== 'finished') {
      g = commitFixes(g, scenario, []);
      if (g.state.phase === 'resolved') g = nextRound(g, scenario);
    }
    const card = buildScorecard(g, scenario);
    const cheaper = STRATEGY_IDS.filter((id) => card.strategies[id].totalCost < card.player.totalCost).length;
    expect(card.playerRank).toBe(1 + cheaper);
    expect(card.player).toEqual(summarize(g));
  });
});

describe('longRun', () => {
  const ids: StrategyId[] = ['severityFirst', 'cheapestFirst', 'blended'];

  it('restricts rows to the requested ids and matches hand-computed means', () => {
    const seeds = 12;
    const rows = longRun(scenario, seeds, ids);
    expect(Object.keys(rows).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      let sum = 0;
      for (let s = 1; s <= seeds; s++) sum += runStrategy(scenario, s, id).totalCost;
      expect(rows[id].meanCost).toBe(Math.round(sum / seeds));
      expect(Number.isInteger(rows[id].meanCost)).toBe(true);
    }
  });

  it('win shares split ties and sum to one', () => {
    const seeds = 15;
    const rows = longRun(scenario, seeds, ids);
    const expected = { severityFirst: 0, cheapestFirst: 0, blended: 0 } as Record<string, number>;
    for (let s = 1; s <= seeds; s++) {
      const costs = ids.map((id) => runStrategy(scenario, s, id).totalCost);
      const best = Math.min(...costs);
      const tied = ids.filter((_, i) => costs[i] === best);
      for (const id of tied) expected[id]! += 1 / tied.length / seeds;
    }
    for (const id of ids) expect(rows[id].winShare).toBeCloseTo(expected[id]!, 9);
    expect(ids.reduce((s, id) => s + rows[id].winShare, 0)).toBeCloseTo(1, 9);
  });

  it('a single strategy wins every seed', () => {
    const rows = longRun(scenario, 5, ['blended']);
    expect(rows.blended.winShare).toBeCloseTo(1, 9);
  });

  it('defaults cover all strategies', () => {
    const rows = longRun(scenario, 3);
    expect(Object.keys(rows).sort()).toEqual([...STRATEGY_IDS].sort());
  });
});

describe('longRunOrder', () => {
  it('sorts only the ids present, lowest mean first', () => {
    const order = longRunOrder({
      blended: { meanCost: 50, winShare: 0 },
      severityFirst: { meanCost: 10, winShare: 0 },
      cheapestFirst: { meanCost: 30, winShare: 0 },
    });
    expect(order).toEqual(['severityFirst', 'cheapestFirst', 'blended']);
  });
});

describe('replayGrade', () => {
  it('excludes the played seed from the replay years (seed 100000)', () => {
    const years = 20;
    const g = play(dental, 100_000, 'blended');
    const script = g.state.history.map((r) => r.fixedIds);
    const deck = g.truth.deck;
    let sum = 0;
    for (let s = 100_001; s <= 100_000 + years; s++) sum += runScript(dental, s, script, { deck }).totalCost;
    const grade = replayGrade(dental, g, ['blended'], years);
    expect(grade.yourMean).toBe(Math.round(sum / years));
    expect(grade.years).toBe(years);
  });

  it('does not exclude anything when the played seed is outside the replay range', () => {
    const years = 15;
    const g = play(scenario, 5, 'severityFirst');
    const script = g.state.history.map((r) => r.fixedIds);
    let sum = 0;
    for (let i = 0; i < years; i++) sum += runScript(scenario, 100_000 + i, script, { deck: g.truth.deck }).totalCost;
    expect(replayGrade(scenario, g, ['severityFirst'], years).yourMean).toBe(Math.round(sum / years));
  });

  it('ratio is yourMean over the lowest mean among you and the strategies', () => {
    const years = 15;
    const ids: StrategyId[] = ['severityFirst', 'cheapestFirst', 'blended'];
    const g = play(scenario, 12, 'cheapestFirst');
    const r = replayGrade(scenario, g, ids, years);
    expect(Object.keys(r.strategyMeans).sort()).toEqual([...ids].sort());
    const best = Math.min(r.yourMean, ...ids.map((id) => r.strategyMeans[id]));
    if (best <= 0) expect(r.ratio).toBe(1);
    else expect(r.ratio).toBeCloseTo(r.yourMean / best, 9);
    expect(r.ratio).toBeGreaterThanOrEqual(1);
  });

  it('a player replaying a strategy exactly gets that strategy mean', () => {
    const years = 12;
    const g = play(scenario, 7, 'blended');
    const r = replayGrade(scenario, g, ['blended'], years);
    expect(r.yourMean).toBe(r.strategyMeans.blended);
    expect(r.ratio).toBe(1);
  });
});
