import type {
  ActiveModifier,
  Asset,
  EventEffect,
  Finding,
  Game,
  GameEvent,
  GameState,
  GroundTruth,
  Id,
  OutcomeSummary,
  OutcomeTotals,
  RoundRecord,
  Scenario,
  StrategyId,
} from './types';
import { createRng } from './prng';
import { TUNING } from './tuning';
import { resolveRound } from './resolve';
import { getStrategy, pickUnderCapacity } from './strategies';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- Validation ----------------------------------------------------------

/** Throws with a readable message if a scenario is internally inconsistent. Also used by content tests. */
export function validateScenario(s: Scenario): void {
  const assetIds = new Set<Id>();
  const findingIds = new Set<Id>();
  const eventIds = new Set<Id>();

  const checkAsset = (a: Asset, where: string) => {
    if (assetIds.has(a.id)) throw new Error(`${where}: duplicate asset id ${a.id}`);
    assetIds.add(a.id);
    if (a.criticality < 1 || a.criticality > 5) throw new Error(`${where}: asset ${a.id} criticality out of range`);
    if (a.records < 0) throw new Error(`${where}: asset ${a.id} negative records`);
  };
  const checkFinding = (f: Finding, where: string) => {
    if (findingIds.has(f.id)) throw new Error(`${where}: duplicate finding id ${f.id}`);
    findingIds.add(f.id);
    if (!assetIds.has(f.assetId)) throw new Error(`${where}: finding ${f.id} references unknown asset ${f.assetId}`);
    if (f.severity < 0 || f.severity > 10) throw new Error(`${where}: finding ${f.id} severity out of range`);
    if (f.likelihood < 0 || f.likelihood > 1) throw new Error(`${where}: finding ${f.id} likelihood out of range`);
    if (!Number.isInteger(f.fixCost) || f.fixCost < 1) throw new Error(`${where}: finding ${f.id} fixCost must be integer >= 1`);
    if (f.fixCost > s.config.capacityPerRound) throw new Error(`${where}: finding ${f.id} can never be afforded`);
    if (!f.plainTitle || !f.techTitle) throw new Error(`${where}: finding ${f.id} missing a title`);
  };

  s.assets.forEach((a) => checkAsset(a, 'assets'));
  s.findings.forEach((f) => checkFinding(f, 'findings'));

  for (const e of s.events) {
    if (eventIds.has(e.id)) throw new Error(`events: duplicate event id ${e.id}`);
    eventIds.add(e.id);
    for (const eff of e.effects) {
      if (eff.kind === 'addAsset') {
        checkAsset(eff.asset, `event ${e.id}`);
        eff.findings.forEach((f) => checkFinding(f, `event ${e.id}`));
      }
      if (eff.kind === 'markKnownExploited' && !findingIds.has(eff.findingId)) {
        throw new Error(`event ${e.id}: markKnownExploited references unknown finding ${eff.findingId}`);
      }
      if (eff.kind === 'setExposure' && !assetIds.has(eff.assetId)) {
        throw new Error(`event ${e.id}: setExposure references unknown asset ${eff.assetId}`);
      }
    }
  }

  if (s.config.rounds < 1) throw new Error('config.rounds must be >= 1');
  if (s.config.capacityPerRound < 1) throw new Error('config.capacityPerRound must be >= 1');
}

// ---- Ground truth --------------------------------------------------------

/** Every finding that can ever appear, in a stable order: scenario findings, then event-added findings. */
export function allFindings(s: Scenario): Finding[] {
  const out = s.findings.slice();
  for (const e of s.events) {
    for (const eff of e.effects) {
      if (eff.kind === 'addAsset') out.push(...eff.findings);
    }
  }
  return out;
}

function rollTruth(s: Scenario, seed: number, deckOverride?: readonly Id[]): GroundTruth {
  const rng = createRng(seed);
  const trueLikelihood: Record<Id, number> = {};
  const rolls: Record<Id, number[]> = {};

  for (const f of allFindings(s)) {
    const noise = (rng.next() * 2 - 1) * TUNING.likelihoodNoise;
    trueLikelihood[f.id] = clamp(f.likelihood + noise, TUNING.likelihoodFloor, 1);
    const r: number[] = [];
    for (let i = 0; i < s.config.rounds; i++) r.push(rng.next());
    rolls[f.id] = r;
  }

  const shuffled = rng.shuffle(s.events).map((e) => e.id);
  if (deckOverride) {
    const known = new Set(s.events.map((e) => e.id));
    for (const id of deckOverride) if (!known.has(id)) throw new Error(`Deck override names unknown event ${id}`);
  }
  return { trueLikelihood, rolls, deck: deckOverride ? deckOverride.slice() : shuffled };
}

// ---- Round setup ---------------------------------------------------------

function computeCapacity(s: Scenario, modifiers: readonly ActiveModifier[], emergencyDebt: number): number {
  let cap = s.config.capacityPerRound;
  for (const m of modifiers) {
    if (m.effect.kind === 'capacityDelta') cap += m.effect.delta;
  }
  cap -= emergencyDebt;
  return Math.max(TUNING.minCapacity, cap);
}

function applyImmediate(state: GameState, effect: EventEffect): GameState {
  switch (effect.kind) {
    case 'addAsset': {
      if (state.assets.some((a) => a.id === effect.asset.id)) return state;
      return {
        ...state,
        assets: [...state.assets, { ...effect.asset }],
        backlog: [...state.backlog, ...effect.findings.map((f) => ({ ...f, tags: f.tags.slice() }))],
      };
    }
    case 'markKnownExploited':
      return {
        ...state,
        backlog: state.backlog.map((f) => (f.id === effect.findingId ? { ...f, knownExploited: true } : f)),
      };
    case 'setExposure':
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === effect.assetId ? { ...a, internetExposed: effect.internetExposed } : a,
        ),
      };
    case 'likelihoodBoost':
    case 'capacityDelta':
    case 'audit':
      return state;
  }
}

function isDurational(effect: EventEffect): boolean {
  return effect.kind === 'likelihoodBoost' || effect.kind === 'capacityDelta' || effect.kind === 'audit';
}

/** Draw this round's event (if any), apply it, compute capacity. */
function beginRound(state: GameState, truth: GroundTruth, s: Scenario): GameState {
  let next: GameState = { ...state, currentEvent: undefined, phase: 'choose' };

  if (next.round >= s.config.firstEventRound && next.deckCursor < truth.deck.length) {
    const eventId = truth.deck[next.deckCursor]!;
    const event = s.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Deck references unknown event ${eventId}`);
    next = { ...next, currentEvent: event, deckCursor: next.deckCursor + 1 };
    const duration = event.duration ?? 1;
    const added: ActiveModifier[] = [];
    for (const eff of event.effects) {
      if (isDurational(eff)) added.push({ effect: eff, expiresAfterRound: next.round + duration - 1 });
      else next = applyImmediate(next, eff);
    }
    if (added.length) next = { ...next, modifiers: [...next.modifiers, ...added] };
  }

  return { ...next, capacity: computeCapacity(s, next.modifiers, next.emergencyDebt) };
}

// ---- Public API ----------------------------------------------------------

export interface CreateOptions {
  /**
   * Use this event order instead of the seed's shuffle. Lets a report replay
   * "the same year, different luck": same news, fresh dice.
   */
  deck?: readonly Id[];
}

export function createGame(scenario: Scenario, seed: number, opts: CreateOptions = {}): Game {
  validateScenario(scenario);
  const truth = rollTruth(scenario, seed >>> 0, opts.deck);
  const initial: GameState = {
    seed: seed >>> 0,
    scenarioId: scenario.id,
    round: 1,
    phase: 'choose',
    capacity: scenario.config.capacityPerRound,
    emergencyDebt: 0,
    assets: scenario.assets.map((a) => ({ ...a })),
    backlog: scenario.findings.map((f) => ({ ...f, tags: f.tags.slice() })),
    fixed: [],
    exploited: [],
    modifiers: [],
    deckCursor: 0,
    currentEvent: undefined,
    history: [],
    incidents: [],
  };
  return { state: beginRound(initial, truth, scenario), truth };
}

/** Cost of a set of fixes against the current backlog. Throws on unknown ids. */
export function costOf(state: GameState, findingIds: readonly Id[]): number {
  let total = 0;
  for (const id of findingIds) {
    const f = state.backlog.find((b) => b.id === id);
    if (!f) throw new Error(`Finding ${id} is not in the backlog`);
    total += f.fixCost;
  }
  return total;
}

/**
 * Player commits fixes for this round. Validates, resolves exploitation of
 * everything left open, records the round. Returns a new Game; never mutates.
 */
export function commitFixes(game: Game, scenario: Scenario, findingIds: readonly Id[]): Game {
  const { state, truth } = game;
  if (state.phase !== 'choose') throw new Error(`Cannot commit fixes in phase ${state.phase}`);
  if (new Set(findingIds).size !== findingIds.length) throw new Error('Duplicate finding ids');
  const used = costOf(state, findingIds);
  if (used > state.capacity) throw new Error(`Fixes cost ${used} but capacity is ${state.capacity}`);

  const chosen = new Set(findingIds);
  const remaining = state.backlog.filter((f) => !chosen.has(f.id));

  const result = resolveRound({
    round: state.round,
    backlog: remaining,
    assets: state.assets,
    modifiers: state.modifiers,
    truth,
    econ: scenario.config.economics,
  });

  const burned = new Set(result.burned);
  const record: RoundRecord = {
    round: state.round,
    eventId: state.currentEvent?.id,
    fixedIds: findingIds.slice(),
    capacity: state.capacity,
    capacityUsed: used,
    incidents: result.incidents,
  };

  const finished = state.round >= scenario.config.rounds;
  const next: GameState = {
    ...state,
    phase: finished ? 'finished' : 'resolved',
    backlog: remaining.filter((f) => !burned.has(f.id)),
    fixed: [...state.fixed, ...findingIds],
    exploited: [...state.exploited, ...result.burned],
    emergencyDebt: Math.min(result.emergencyDebt, TUNING.maxEmergencyDebt),
    history: [...state.history, record],
    incidents: [...state.incidents, ...result.incidents],
  };
  return { state: next, truth };
}

/** Advance from 'resolved' to the next round's 'choose'. Expires modifiers, draws the next event. */
export function nextRound(game: Game, scenario: Scenario): Game {
  const { state, truth } = game;
  if (state.phase !== 'resolved') throw new Error(`Cannot advance in phase ${state.phase}`);
  const round = state.round + 1;
  const advanced: GameState = {
    ...state,
    round,
    modifiers: state.modifiers.filter((m) => m.expiresAfterRound >= round),
  };
  return { state: beginRound(advanced, truth, scenario), truth };
}

/** What a strategy would fix this round, under the current capacity. */
export function autoPick(game: Game, strategyId: StrategyId): Id[] {
  return pickUnderCapacity(rankBacklog(game, strategyId), game.state.capacity);
}

/** The ranked backlog for a strategy, given this round's events. */
export function rankBacklog(game: Game, strategyId: StrategyId): Finding[] {
  return getStrategy(strategyId).rank(game.state.backlog, game.state.assets, { modifiers: game.state.modifiers });
}

/**
 * Commit whatever subset of `ids` is still open and affordable, in the given
 * order. Forgiving on purpose: used to replay a script against a different
 * year, where some of those findings may already have burned.
 */
export function commitScripted(game: Game, scenario: Scenario, ids: readonly Id[]): Game {
  let picked: Id[] = [];
  for (const id of ids) {
    if (!game.state.backlog.some((f) => f.id === id)) continue;
    const trial = [...picked, id];
    if (costOf(game.state, trial) <= game.state.capacity) picked = trial;
  }
  return commitFixes(game, scenario, picked);
}

/** Play a whole game from a fixed script of picks per round. Rounds beyond the script fix nothing. */
export function runScript(
  scenario: Scenario,
  seed: number,
  script: readonly (readonly Id[])[],
  opts: CreateOptions = {},
): OutcomeSummary {
  let game = createGame(scenario, seed, opts);
  while (game.state.phase !== 'finished') {
    game = commitScripted(game, scenario, script[game.state.round - 1] ?? []);
    if (game.state.phase === 'resolved') game = nextRound(game, scenario);
  }
  return summarize(game);
}

/** Play a whole game with one strategy. The counterfactual. */
export function runStrategy(scenario: Scenario, seed: number, strategyId: StrategyId, opts: CreateOptions = {}): OutcomeSummary {
  let game = createGame(scenario, seed, opts);
  while (game.state.phase !== 'finished') {
    game = commitFixes(game, scenario, autoPick(game, strategyId));
    if (game.state.phase === 'resolved') game = nextRound(game, scenario);
  }
  return summarize(game);
}

export function summarize(game: Game): OutcomeSummary {
  const totals: OutcomeTotals = {
    downtimeDays: 0,
    dollars: 0,
    recordsExposed: 0,
    auditFailure: false,
    incidentCount: game.state.incidents.length,
    fixedCount: game.state.fixed.length,
  };
  for (const i of game.state.incidents) {
    totals.downtimeDays += i.impact.downtimeDays;
    totals.dollars += i.impact.dollars;
    totals.recordsExposed += i.impact.recordsExposed;
    totals.auditFailure = totals.auditFailure || i.impact.auditFailure;
  }
  totals.downtimeDays = Math.round(totals.downtimeDays * 100) / 100;
  return {
    totals,
    totalCost: totals.dollars,
    incidents: game.state.incidents.slice(),
    fixedByRound: game.state.history.map((r) => r.fixedIds.slice()),
  };
}

/** Convenience for UIs: the event drawn for the current round, if any. */
export function currentEvent(game: Game): GameEvent | undefined {
  return game.state.currentEvent;
}
