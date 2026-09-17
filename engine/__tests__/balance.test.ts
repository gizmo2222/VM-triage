import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STRATEGY_IDS, type Scenario, type StrategyId } from '../types';
import { runStrategy } from '../game';
import { scenarios } from '@content/index';

/**
 * Design rule: no strategy wins every scenario.
 *
 * For each scenario, run every strategy across SEEDS seeds. Winner of a seed
 * is the lowest total cost; ties split credit. Fail if any strategy's overall
 * win share exceeds MAX_SHARE, or if any strategy never wins a seed in some
 * scenario.
 *
 * Set BALANCE_REPORT=1 to print the table while tuning.
 */
const SEEDS = 500;
const MAX_SHARE = 0.7;

interface Row {
  wins: number;
  meanCost: number;
  meanIncidents: number;
}

function analyse(scenario: Scenario): Record<StrategyId, Row> {
  const rows = Object.fromEntries(
    STRATEGY_IDS.map((id) => [id, { wins: 0, meanCost: 0, meanIncidents: 0 }]),
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
    for (const id of tied) rows[id].wins += 1 / tied.length;
  }
  return rows;
}

describe('balance', () => {
  const perScenario = scenarios.map((s) => ({ id: s.id, rows: analyse(s) }));

  it('prints a report when BALANCE_REPORT is set', () => {
    if (!process.env.BALANCE_REPORT) return;
    for (const { id, rows } of perScenario) {
      const lines = [`== ${id} (${SEEDS} seeds) ==`];
      lines.push('strategy         winShare  meanCost  meanIncidents');
      for (const sid of STRATEGY_IDS) {
        lines.push(
          `${sid.padEnd(16)} ${(rows[sid].wins / SEEDS).toFixed(3).padStart(8)}  ${String(Math.round(rows[sid].meanCost)).padStart(8)}  ${rows[sid].meanIncidents.toFixed(2).padStart(13)}`,
        );
      }
      const text = lines.join('\n');
      console.log(text);
      writeFileSync(`balance-report-${id}.txt`, text + '\n');
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
});
