import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STRATEGY_IDS, type Scenario, type StrategyId } from '../types';
import { runStrategy } from '../game';
import { scenarios } from '@content/index';

/**
 * Design rules, checked on every scenario across SEEDS seeds:
 *
 * 1. No strategy wins more than MAX_SHARE of seeds overall (ties split).
 * 2. Every strategy wins at least one seed in every scenario.
 * 3. The blended order has the lowest mean cost in every scenario. It is
 *    the method the game recommends, so it must earn that in the long run.
 * 4. No instinct (any strategy but blended) finishes top or tied-top in more
 *    than MAX_TOP_SHARE of seeds. Otherwise a player can tap one chip every
 *    quarter and collect an A most of the time.
 *
 * Set BALANCE_REPORT=1 to write balance-report-<scenario>.txt while tuning.
 */
const SEEDS = 500;
const MAX_SHARE = 0.7;
const MAX_TOP_SHARE = 0.4;

interface Row {
  wins: number;
  /** Seeds where this strategy's cost was <= every other strategy's. Ties count in full. */
  top: number;
  meanCost: number;
  meanIncidents: number;
}

function analyse(scenario: Scenario): Record<StrategyId, Row> {
  const rows = Object.fromEntries(
    STRATEGY_IDS.map((id) => [id, { wins: 0, top: 0, meanCost: 0, meanIncidents: 0 }]),
  ) as Record<StrategyId, Row>;

  for (let seed = 1; seed <= SEEDS; seed++) {
    const costs = STRATEGY_IDS.map((id) => {
      const r = runStrategy(scenario, seed, id);
      rows[id].meanCost += r.totalCost / SEEDS;
      rows[id].meanIncidents += r.totals.incidentCount / SEEDS;
      return r.totalCost;
    });
    const best = Math.min(...costs);
    const tied = STRATEGY_IDS.filter((_, i) => costs[i] === best);
    for (const id of tied) {
      rows[id].wins += 1 / tied.length;
      rows[id].top += 1;
    }
  }
  return rows;
}

describe('balance', () => {
  const perScenario = scenarios.map((s) => ({ id: s.id, rows: analyse(s) }));

  it('prints a report when BALANCE_REPORT is set', () => {
    if (!process.env.BALANCE_REPORT) return;
    for (const { id, rows } of perScenario) {
      const lines = [`== ${id} (${SEEDS} seeds) ==`];
      lines.push('strategy         winShare  topShare  meanCost  meanIncidents');
      for (const sid of STRATEGY_IDS) {
        lines.push(
          `${sid.padEnd(16)} ${(rows[sid].wins / SEEDS).toFixed(3).padStart(8)}  ${(rows[sid].top / SEEDS).toFixed(3).padStart(8)}  ${String(Math.round(rows[sid].meanCost)).padStart(8)}  ${rows[sid].meanIncidents.toFixed(2).padStart(13)}`,
        );
      }
      writeFileSync(`balance-report-${id}.txt`, lines.join('\n') + '\n');
    }
  });

  it('has at least one scenario', () => {
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('no strategy wins more than 70% overall', () => {
    const totalSeeds = SEEDS * perScenario.length;
    for (const sid of STRATEGY_IDS) {
      const wins = perScenario.reduce((s, p) => s + p.rows[sid].wins, 0);
      expect(wins / totalSeeds, `${sid} win share`).toBeLessThanOrEqual(MAX_SHARE);
    }
  });

  it('every strategy wins at least one seed in every scenario', () => {
    for (const { id, rows } of perScenario) {
      for (const sid of STRATEGY_IDS) {
        expect(rows[sid].wins, `${sid} never wins ${id}`).toBeGreaterThan(0);
      }
    }
  });

  it('the blended order has the lowest mean cost in every scenario', () => {
    for (const { id, rows } of perScenario) {
      const others = STRATEGY_IDS.filter((s) => s !== 'blended');
      for (const sid of others) {
        expect(rows.blended.meanCost, `${id}: blended vs ${sid}`).toBeLessThan(rows[sid].meanCost);
      }
    }
  });

  it('no instinct chip is top or tied-top in more than 40% of seeds', () => {
    for (const { id, rows } of perScenario) {
      for (const sid of STRATEGY_IDS.filter((s) => s !== 'blended')) {
        expect(rows[sid].top / SEEDS, `${id}: ${sid} top share`).toBeLessThanOrEqual(MAX_TOP_SHARE);
      }
    }
  });
});
