import type { Game, Id, OutcomeSummary, Scenario, Scorecard, StrategyId } from './types';
import { STRATEGY_IDS } from './types';
import { runScript, runStrategy, summarize } from './game';

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
export function longRun(
  scenario: Scenario,
  seeds = 200,
  ids: readonly StrategyId[] = STRATEGY_IDS,
): Record<StrategyId, LongRunRow> {
  const rows = {} as Record<StrategyId, LongRunRow>;
  for (const id of ids) rows[id] = { meanCost: 0, winShare: 0 };
  for (let seed = 1; seed <= seeds; seed++) {
    const costs = ids.map((id) => runStrategy(scenario, seed, id).totalCost);
    const best = Math.min(...costs);
    const tied = ids.filter((_, i) => costs[i] === best);
    ids.forEach((id, i) => {
      rows[id]!.meanCost += costs[i]! / seeds;
      if (costs[i] === best) rows[id]!.winShare += 1 / tied.length / seeds;
    });
  }
  for (const id of ids) rows[id]!.meanCost = Math.round(rows[id]!.meanCost);
  return rows;
}

/** Strategy ids present in `rows`, ordered by long-run mean cost, lowest first. */
export function longRunOrder(rows: Partial<Record<StrategyId, LongRunRow>>): StrategyId[] {
  return (Object.keys(rows) as StrategyId[]).sort((a, b) => rows[a]!.meanCost - rows[b]!.meanCost);
}

export interface ReplayGrade {
  /** Mean cost of the player's exact picks across the replays. */
  yourMean: number;
  /** Mean cost of each strategy across the same replays: same news, same dice. */
  strategyMeans: Record<StrategyId, number>;
  /** yourMean divided by the lowest strategy mean. 1 = as good as the best order. */
  ratio: number;
  years: number;
}

/**
 * Grade the choices, not the dice. Replay the player's picks, round by round,
 * through `years` versions of this year with the same event order and fresh
 * dice. Every strategy is judged the same way: the picks it actually made
 * this year, replayed as a fixed script on the same years. Nobody gets to
 * re-decide, so a lucky year cannot hand out an A and an unlucky one cannot
 * take it away.
 */
export function replayGrade(
  scenario: Scenario,
  game: Game,
  ids: readonly StrategyId[] = STRATEGY_IDS,
  years = 100,
): ReplayGrade {
  if (game.state.phase !== 'finished') throw new Error('replayGrade needs a finished game');
  const script = game.state.history.map((r) => r.fixedIds);
  const deck = game.truth.deck;
  const strategyScripts = {} as Record<StrategyId, readonly (readonly Id[])[]>;
  for (const id of ids) strategyScripts[id] = runStrategy(scenario, game.state.seed, id, { deck }).fixedByRound;
  const strategyMeans = {} as Record<StrategyId, number>;
  for (const id of ids) strategyMeans[id] = 0;
  let yourMean = 0;
  for (let i = 0; i < years; i++) {
    const seed = 100_000 + i;
    yourMean += runScript(scenario, seed, script, { deck }).totalCost / years;
    for (const id of ids) strategyMeans[id]! += runScript(scenario, seed, strategyScripts[id]!, { deck }).totalCost / years;
  }
  yourMean = Math.round(yourMean);
  for (const id of ids) strategyMeans[id] = Math.round(strategyMeans[id]!);
  const best = Math.min(yourMean, ...ids.map((id) => strategyMeans[id]!));
  const ratio = best <= 0 ? 1 : yourMean / best;
  return { yourMean, strategyMeans, ratio, years };
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

export interface ReplayLuck {
  /** Cost of the player's exact picks in each replay, sorted ascending. */
  costs: number[];
  median: number;
  mean: number;
  /** Share of replays that cost more than the year actually played. 1 = the luckiest year of them all. */
  betterThan: number;
  years: number;
}

/**
 * How lucky was the year the player actually saw? Replay the same picks
 * through `years` versions of this year (same event order, fresh dice) and
 * place the real outcome in that distribution. Feedback only: no grade.
 */
export function replayLuck(scenario: Scenario, game: Game, years = 100): ReplayLuck {
  if (game.state.phase !== 'finished') throw new Error('replayLuck needs a finished game');
  const script = game.state.history.map((r) => r.fixedIds);
  const deck = game.truth.deck;
  const actual = summarize(game).totalCost;
  const costs: number[] = [];
  for (let i = 0; i < years; i++) costs.push(runScript(scenario, 100_000 + i, script, { deck }).totalCost);
  costs.sort((a, b) => a - b);
  const mid = Math.floor(costs.length / 2);
  const median = costs.length % 2 ? costs[mid]! : Math.round((costs[mid - 1]! + costs[mid]!) / 2);
  const mean = Math.round(costs.reduce((s, c) => s + c, 0) / costs.length);
  const betterThan = costs.filter((c) => c > actual).length / costs.length;
  return { costs, median, mean, betterThan, years };
}
