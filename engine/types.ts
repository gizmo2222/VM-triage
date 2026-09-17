/**
 * Engine data model. Pure types, no DOM, no runtime code.
 *
 * Both skins read these. Skin 1 (smallbiz) only ever shows `plainTitle` /
 * `plainBody`; the technical fields exist so Skin 2 (pro) works unchanged.
 */

export type Id = string;

/** 'regulated' covers health records and payment cards. */
export type Sensitivity = 'none' | 'internal' | 'customer' | 'regulated';

export interface Asset {
  id: Id;
  name: string;
  criticality: 1 | 2 | 3 | 4 | 5;
  internetExposed: boolean;
  sensitivity: Sensitivity;
  /** Records held. Drives "notification letters" in incidents. 0 if none. */
  records: number;
}

export interface Finding {
  id: Id;
  /** Shown by smallbiz. No jargon. A full sentence. */
  plainTitle: string;
  /** Optional short form of plainTitle for card faces, about six words. Skins fall back to plainTitle. */
  headline?: string;
  /** Shown by pro. */
  techTitle: string;
  /** 0..10, CVSS-like. */
  severity: number;
  /** 0..1, EPSS-like. */
  likelihood: number;
  /** KEV-like. */
  knownExploited: boolean;
  assetId: Id;
  /** Capacity points, integer >= 1. */
  fixCost: number;
  /** Shows up on the insurance questionnaire. */
  compliance: boolean;
  /** Free-form tags so events can target groups: 'vendor:acme', 'wifi', 'email'. */
  tags: string[];
}

// ---- Events --------------------------------------------------------------

export type EventEffect =
  /** Vendor zero-day: findings carrying `tag` get their exploit odds multiplied. */
  | { kind: 'likelihoodBoost'; tag: string; multiplier: number }
  /** Budget cut or windfall while active. */
  | { kind: 'capacityDelta'; delta: number }
  /** A new laptop, a new SaaS tool, a new location. Immediate and permanent. */
  | { kind: 'addAsset'; asset: Asset; findings: Finding[] }
  /** A finding lands on the known-exploited list. Immediate and permanent. */
  | { kind: 'markKnownExploited'; findingId: Id }
  /** Someone opened a port, or closed one. Immediate and permanent. */
  | { kind: 'setExposure'; assetId: Id; internetExposed: boolean }
  /** Insurance questionnaire: any open compliance finding at end of round fails it. */
  | { kind: 'audit' };

export interface GameEvent {
  id: Id;
  plainTitle: string;
  techTitle: string;
  plainBody: string;
  techBody: string;
  effects: EventEffect[];
  /** Rounds a durational effect (likelihoodBoost, capacityDelta, audit) persists. Default 1. */
  duration?: number;
}

// ---- Scenario ------------------------------------------------------------

export interface Economics {
  /** Downtime days -> dollars. */
  dailyRevenue: number;
  /** Exposed records -> dollars (notification, credit monitoring, legal). */
  costPerRecord: number;
  /** Flat hit for a failed questionnaire, e.g. premium increase or lost coverage. */
  auditFailureCost: number;
}

export interface ScenarioConfig {
  /** smallbiz 4, pro 8-12. */
  rounds: number;
  /** smallbiz 5. */
  capacityPerRound: number;
  /** First round that draws an event. smallbiz 2, so round 1 teaches the loop. */
  firstEventRound: number;
  economics: Economics;
}

export interface Scenario {
  id: Id;
  assets: Asset[];
  findings: Finding[];
  /** The deck. Shuffled by seed at createGame. */
  events: GameEvent[];
  config: ScenarioConfig;
}

// ---- Strategies ----------------------------------------------------------

export type StrategyId =
  | 'severityFirst'
  | 'threatFirst'
  | 'assetFirst'
  | 'complianceFirst'
  | 'cheapestFirst'
  | 'blended';

export const STRATEGY_IDS: readonly StrategyId[] = [
  'severityFirst',
  'threatFirst',
  'assetFirst',
  'complianceFirst',
  'cheapestFirst',
  'blended',
];

/** Returns findings in fix-priority order. Must be pure and stable. */
export type Ranker = (findings: readonly Finding[], assets: readonly Asset[]) => Finding[];

export interface Strategy {
  id: StrategyId;
  rank: Ranker;
}

// ---- Hidden ground truth -------------------------------------------------

/**
 * Rolled once at createGame from the seed, then never touched.
 * Two consequences: (1) every counterfactual strategy faces the exact
 * same attacker dice, so comparisons are fair; (2) the visible scores
 * are estimates, not oracles, which is what keeps any one of them
 * from winning every game.
 */
export interface GroundTruth {
  /** Per finding, the real exploitability. Visible likelihood +/- noise, clamped. */
  trueLikelihood: Record<Id, number>;
  /** Per finding, one uniform roll per round. Exploited if roll < p. */
  rolls: Record<Id, number[]>;
  /** Event ids in draw order. */
  deck: Id[];
}

// ---- Run state -----------------------------------------------------------

export interface Impact {
  downtimeDays: number;
  /** All-in dollars: direct cost + downtime revenue + record costs + audit. */
  dollars: number;
  recordsExposed: number;
  auditFailure: boolean;
}

export interface Incident {
  round: number;
  findingId: Id;
  assetId: Id;
  cause: 'exploited' | 'audit';
  /** For audit incidents, every open compliance finding that caused the failure. */
  relatedFindingIds?: Id[];
  impact: Impact;
}

export interface ActiveModifier {
  effect: EventEffect;
  /** Inclusive. The modifier applies through this round. */
  expiresAfterRound: number;
}

export type Phase = 'choose' | 'resolved' | 'finished';

export interface RoundRecord {
  round: number;
  eventId?: Id;
  fixedIds: Id[];
  capacity: number;
  capacityUsed: number;
  incidents: Incident[];
}

export interface GameState {
  seed: number;
  scenarioId: Id;
  /** 1-based. */
  round: number;
  phase: Phase;
  /** This round, after events and emergency fixes. */
  capacity: number;
  /** Fix cost carried from last round's incidents; subtracted from next round's capacity. */
  emergencyDebt: number;
  /** Grows via addAsset. */
  assets: Asset[];
  /** Open findings only. */
  backlog: Finding[];
  fixed: Id[];
  /** Burned findings, removed from backlog. */
  exploited: Id[];
  modifiers: ActiveModifier[];
  /** Index into truth.deck of the next event to draw. */
  deckCursor: number;
  currentEvent?: GameEvent;
  history: RoundRecord[];
  incidents: Incident[];
}

/** UI code reads .state only. Keeping truth beside it is what makes replay trivial. */
export interface Game {
  state: GameState;
  truth: GroundTruth;
}

// ---- Scorecard -----------------------------------------------------------

export interface OutcomeTotals extends Impact {
  incidentCount: number;
  fixedCount: number;
}

export interface OutcomeSummary {
  totals: OutcomeTotals;
  /** Single comparable number. Equals totals.dollars today; kept separate so weighting can change. Lower is better. */
  totalCost: number;
  incidents: Incident[];
  /** Which findings were fixed, per round. */
  fixedByRound: Id[][];
}

export interface Scorecard {
  player: OutcomeSummary;
  strategies: Record<StrategyId, OutcomeSummary>;
  /** 1 = beat every built-in strategy. Ties share rank. */
  playerRank: number;
  bestStrategy: StrategyId;
  worstStrategy: StrategyId;
}
