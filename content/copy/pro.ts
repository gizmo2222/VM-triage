import type { StrategyId } from '@engine/types';

/**
 * Strings for the practitioner skin. Real terminology is fine here.
 */

export interface Method {
  id: StrategyId;
  name: string;
  short: string;
  /** One line on what it ranks by. */
  rule: string;
  /** Offered in the round picker. The rest still appear on the report. */
  pick: boolean;
}

export const METHODS: Method[] = [
  { id: 'severityFirst', name: 'CVSS-first', short: 'CVSS', rule: 'Highest base score first. EPSS breaks ties.', pick: true },
  { id: 'likelihoodFirst', name: 'EPSS-first', short: 'EPSS', rule: 'Highest exploit probability first. Ignores the KEV flag.', pick: true },
  { id: 'threatFirst', name: 'KEV-first', short: 'KEV', rule: 'Known exploited first, then EPSS, then CVSS.', pick: true },
  { id: 'ssvc', name: 'SSVC-style', short: 'SSVC', rule: 'Decision tree: exploitation status, exposure, mission impact. Act, Attend, Track*, Track.', pick: true },
  { id: 'blended', name: 'Blended (FlintScope)', short: 'Blended', rule: 'Threat x exposure x impact, re-weighted by this sprint\'s events.', pick: true },
  { id: 'assetFirst', name: 'Asset-first', short: 'Asset', rule: 'Criticality, then exposure, then data sensitivity.', pick: true },
  { id: 'complianceFirst', name: 'Compliance-first', short: 'Compliance', rule: 'Attestation items first, then CVSS.', pick: true },
  { id: 'cheapestFirst', name: 'Cheapest-first', short: 'Cheapest', rule: 'Lowest remediation cost first.', pick: true },
];

export const methodById = Object.fromEntries(METHODS.map((m) => [m.id, m])) as Record<StrategyId, Method>;

export const pro = {
  title: 'What First',
  edition: 'Practitioner edition',
  subtitle: 'Same engine as the five-minute version. Real numbers, eight sprints, a daily seed.',

  intro: {
    heading: 'Pick a backlog',
    daily: (seed: string) => `Daily seed ${seed}`,
    dailyHint: 'Everyone who plays today gets this backlog and these dice. Compare cost, not grades.',
    custom: 'Custom seed',
    customHint: 'Any word or number. The URL carries it.',
    play: 'Start',
    rules: [
      'Eight sprints. Five remediation points per sprint. Fix costs are 1 to 4 points.',
      'Every open finding rolls against its true exploit probability each sprint. The visible EPSS is an estimate with hidden noise.',
      'Exploited findings burn: they leave the backlog and their fix cost comes out of next sprint, capped at 2.',
      'Events arrive from sprint 1: zero-days that multiply exploit odds by tag, capacity changes, new assets, KEV additions, exposure changes, and an attestation that penalises every open compliance item.',
      'At the end: this year against every method on the same dice, a 200-year long run, and a replay grade that judges your picks rather than your luck.',
    ],
    methodsHeading: 'Methods on offer',
    back: 'Five-minute version',
  },

  round: {
    sprint: (n: number, total: number) => `Sprint ${n} of ${total}`,
    capacity: (left: number, total: number) => `${left}/${total} pts`,
    capacityLabel: 'Remediation capacity',
    debt: (n: number) => `−${n} burn`,
    lossToDate: 'Loss to date',
    event: 'Event',
    method: 'Method',
    methodNone: 'Manual',
    methodHint: 'Picking a method sorts the backlog and pre-selects a fill. Change anything.',
    clear: 'Clear',
    cols: {
      pick: 'Fix',
      finding: 'Finding',
      asset: 'Asset',
      cvss: 'CVSS',
      epss: 'EPSS',
      kev: 'KEV',
      exp: 'Exp',
      crit: 'Crit',
      cost: 'Cost',
      comp: 'Attest',
    },
    exposed: 'Internet',
    internal: 'Internal',
    commit: (n: number) => (n === 0 ? 'Skip sprint' : `Commit ${n}`),
    picked: (used: number, cap: number) => `${used} of ${cap} points`,
    burnTag: 'burned',
    boostTag: (x: number) => `×${x} this sprint`,
  },

  result: {
    heading: (n: number) => `Sprint ${n} resolved`,
    quiet: 'No exploitation this sprint.',
    exploited: (n: number) => `${n} exploited`,
    audit: 'Attestation failed',
    auditDetail: (n: number) => `${n} open compliance items at the deadline.`,
    burnNext: (n: number) => `Emergency remediation consumes ${n} points next sprint.`,
    next: 'Next sprint',
    finish: 'Debrief',
    downtime: (d: string) => `${d} downtime`,
    records: (n: string) => `${n} records`,
  },

  report: {
    heading: 'Debrief',
    seedLine: (seed: string, daily: boolean) => (daily ? `Daily seed ${seed}` : `Seed ${seed}`),
    thisYear: 'This year, same dice',
    cols: { method: 'Method', cost: 'Cost', incidents: 'Incidents', fixes: 'Fixes' },
    you: 'You',
    best: 'Best',
    fixesToggle: 'Show picks by sprint',
    replayHeading: 'Replay grade',
    replayBody: (years: number, yours: string, best: string, pct: number, bestName: string) =>
      pct <= 0
        ? `Your picks, replayed through ${years} versions of this year with the same event order and fresh dice, average ${yours}. As good as any method.`
        : `Your picks, replayed through ${years} versions of this year with the same event order and fresh dice, average ${yours}: ${pct}% above ${bestName} at ${best}. Every method is replayed the same way, as the picks it made this year.`,
    longRunHeading: (years: number) => `Long run, ${years} years`,
    longRunCols: { method: 'Method', mean: 'Mean cost', win: 'Win share' },
    truthHeading: 'Ground truth',
    truthHint: 'The visible EPSS is an estimate. This is what the dice actually used, and what happened.',
    truthCols: { finding: 'Finding', epss: 'EPSS shown', p: 'True p', outcome: 'Outcome' },
    outcomeFixed: (n: number) => `fixed S${n}`,
    outcomeExploited: (n: number) => `exploited S${n}`,
    outcomeOpen: 'open all year',
    shareHeading: 'Share this run',
    shareHint: 'Same backlog, same dice for anyone with the link. Compare cost.',
    copy: 'Copy link',
    copied: 'Copied',
    again: 'Same seed again',
    tomorrow: 'New seed',
    other: 'Different backlog',
  },

  a11y: {
    skip: 'Skip to content',
    table: 'Open findings',
  },
} as const;

/** Practitioner grades use the same thresholds as the small-business skin. */
export { gradeForRatio } from './smallbiz';
