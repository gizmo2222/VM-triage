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
