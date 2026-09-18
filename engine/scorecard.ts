import type { Game, OutcomeSummary, Scenario, Scorecard, StrategyId } from './types';
import { STRATEGY_IDS } from './types';
import { runStrategy, summarize } from './game';

/**
 * Player outcome beside a counterfactual replay of every built-in strategy on
 * the same seed. Same dice, different choices.
 */
export function buildScorecard(game: Game, scenario: Scenario): Scorecard {
  if (game.state.phase !== 'finished') throw new Error('Scorecard needs a finished game');
  const player = summarize(game);
  const strategies = {} as Record<StrategyId, OutcomeSummary>;
  for (const id of STRATEGY_IDS) strategies[id] = runStrategy(scenario, game.state.seed, id);

  let playerRank = 1;
  let best: StrategyId = STRATEGY_IDS[0]!;
  let worst: StrategyId = STRATEGY_IDS[0]!;
  for (const id of STRATEGY_IDS) {
    const c = strategies[id].totalCost;
    if (c < player.totalCost) playerRank++;
    if (c < strategies[best].totalCost) best = id;
    if (c > strategies[worst].totalCost) worst = id;
  }
  return { player, strategies, playerRank, bestStrategy: best, worstStrategy: worst };
}

export interface LongRunRow {
  /** Mean total cost across the replayed seeds. */
  meanCost: number;
  /** Share of seeds this strategy had the lowest cost, ties split. */
  winShare: number;
}

/**
 * Replay every strategy across many seeds so a report can say what wins in
 * the long run, not just this year. Deterministic: seeds 1..n.
 * 200 seeds x 6 strategies runs in well under a second.
 */
export function longRun(scenario: Scenario, seeds = 200): Record<StrategyId, LongRunRow> {
  const rows = {} as Record<StrategyId, LongRunRow>;
  for (const id of STRATEGY_IDS) rows[id] = { meanCost: 0, winShare: 0 };
  for (let seed = 1; seed <= seeds; seed++) {
    const costs = STRATEGY_IDS.map((id) => runStrategy(scenario, seed, id).totalCost);
    const best = Math.min(...costs);
    const tied = STRATEGY_IDS.filter((_, i) => costs[i] === best);
    STRATEGY_IDS.forEach((id, i) => {
      rows[id].meanCost += costs[i]! / seeds;
      if (costs[i] === best) rows[id].winShare += 1 / tied.length / seeds;
    });
  }
  for (const id of STRATEGY_IDS) rows[id].meanCost = Math.round(rows[id].meanCost);
  return rows;
}

/** Strategy ids ordered by long-run mean cost, lowest first. */
export function longRunOrder(rows: Record<StrategyId, LongRunRow>): StrategyId[] {
  return [...STRATEGY_IDS].sort((a, b) => rows[a].meanCost - rows[b].meanCost);
}

/**
 * Winner of one seed: the strategy with the lowest cost. Ties return all tied ids.
 * Used by the balance test and by the pro skin's daily leaderboard.
 */
export function winnersForSeed(scenario: Scenario, seed: number): StrategyId[] {
  let bestCost = Number.POSITIVE_INFINITY;
  let winners: StrategyId[] = [];
  for (const id of STRATEGY_IDS) {
    const c = runStrategy(scenario, seed, id).totalCost;
    if (c < bestCost) {
      bestCost = c;
      winners = [id];
    } else if (c === bestCost) {
      winners.push(id);
    }
  }
  return winners;
}
