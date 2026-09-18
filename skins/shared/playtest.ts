import type { Game, Id, Scenario, StrategyId } from '@engine/types';
import { STRATEGY_IDS } from '@engine/types';
import { autoPick, commitFixes, costOf, nextRound } from '@engine/index';

/**
 * Playtest hooks, all in the URL so a specific situation can be shared:
 *
 *   ?fix=q1:id,id;q2:id     fixes to commit in each quarter, in order
 *   ?auto=blended           play any remaining quarters with a strategy
 *   ?debug=1                show hidden exploit odds on cards
 *
 * Ids that are not in the backlog, or that no longer fit the capacity, are
 * skipped rather than failing, so a link keeps working after content edits.
 */
export interface PlaytestParams {
  fixes: Id[][];
  auto?: StrategyId;
  debug: boolean;
}

export function readPlaytest(search: string): PlaytestParams {
  const q = new URLSearchParams(search);
  const fixes: Id[][] = [];
  const raw = q.get('fix');
  if (raw) {
    for (const part of raw.split(';')) {
      const m = /^q(\d+):(.*)$/.exec(part.trim());
      if (!m) continue;
      const round = Number(m[1]);
      if (!Number.isInteger(round) || round < 1 || round > 20) continue;
      fixes[round - 1] = m[2]!.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  const autoRaw = q.get('auto');
  const auto = autoRaw && (STRATEGY_IDS as readonly string[]).includes(autoRaw) ? (autoRaw as StrategyId) : undefined;
  const debug = q.get('debug') === '1' || q.get('debug') === 'true';
  return { fixes, auto, debug };
}

export function hasPlaytest(p: PlaytestParams): boolean {
  return p.fixes.some((f) => f && f.length > 0) || p.auto !== undefined;
}

/** Apply the scripted rounds, then autoplay if asked. Stops at the first unscripted round otherwise. */
export function applyPlaytest(game: Game, scenario: Scenario, p: PlaytestParams): Game {
  let g = game;
  while (g.state.phase !== 'finished') {
    const round = g.state.round;
    const scripted = p.fixes[round - 1];
    let ids: Id[];
    if (scripted) {
      ids = [];
      for (const id of scripted) {
        if (!g.state.backlog.some((f) => f.id === id)) continue;
        const trial = [...ids, id];
        if (costOf(g.state, trial) <= g.state.capacity) ids = trial;
      }
    } else if (p.auto) {
      ids = autoPick(g, p.auto);
    } else {
      break;
    }
    g = commitFixes(g, scenario, ids);
    if (g.state.phase === 'resolved') g = nextRound(g, scenario);
  }
  return g;
}
