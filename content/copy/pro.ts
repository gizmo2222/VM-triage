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
  /** Shown as a pill while playing. The rest sit behind "More". */
  primary: boolean;
}

export const METHODS: Method[] = [
  { id: 'severityFirst', name: 'CVSS-first', short: 'CVSS', rule: 'Highest base score first. EPSS breaks ties.', primary: true },
  { id: 'likelihoodFirst', name: 'EPSS-first', short: 'EPSS', rule: 'Highest exploit probability first. Ignores the KEV flag.', primary: true },
  { id: 'threatFirst', name: 'KEV-first', short: 'KEV', rule: 'Known exploited first, then EPSS, then CVSS.', primary: true },
  {
    id: 'ssvc',
    name: 'SSVC-style',
    short: 'SSVC',
    rule: 'Decision tree: exploitation status, exposure, mission impact. Act, Attend, Track*, Track. An approximation of the published decision points, here for comparison.',
    primary: true,
  },
  { id: 'blended', name: 'Blended (FlintScope)', short: 'Blended', rule: "Threat x exposure x impact, re-weighted by this sprint's events. Formula below.", primary: true },
  { id: 'assetFirst', name: 'Asset-first', short: 'Asset', rule: 'Criticality, then exposure, then data sensitivity.', primary: false },
  { id: 'complianceFirst', name: 'Compliance-first', short: 'Compliance', rule: 'Attestation items first, then CVSS.', primary: false },
  { id: 'cheapestFirst', name: 'Cheapest-first', short: 'Cheapest', rule: 'Lowest remediation cost first.', primary: false },
];

export const methodById = Object.fromEntries(METHODS.map((m) => [m.id, m])) as Record<StrategyId, Method>;

/** The blended method, with its weights. These mirror engine/strategies.ts and are covered by a test. */
export const FORMULA = {
  heading: 'How Blended scores a finding',
  lines: [
    'threat = (KEV ? 1.0 : 0.45) × (0.15 + EPSS) × campaign multiplier on a matching tag, else 1',
    'exposure = internet-facing ? 1.0 : 0.5',
    'impact = (criticality ÷ 5) × (0.4 + 0.6 × CVSS ÷ 10) × (0.5 + 0.5 × sensitivity)',
    'sensitivity: none 0.2 · internal 0.5 · customer 0.8 · regulated 1.0',
    'score = threat × exposure × impact, plus 0.12 on attestation items while a questionnaire is open',
    'Fill: greedy in score order under capacity. Ties break on CVSS.',
  ],
  note: 'The visible EPSS is an estimate; the dice use a hidden true probability within ±0.3 of it. That is why no method wins every year.',
};

export const pro = {
  title: 'What First',
  edition: 'Practitioner edition',
  subtitle: 'Same engine as the five-minute version. Real numbers, eight sprints, a daily seed.',

  intro: {
    heading: 'Practitioner edition',
    pick: 'Pick a backlog',
    seedDaily: (seed: string) => `Daily seed ${seed} · resets at midnight UTC`,
    seedCustom: (seed: string) => `Seed ${seed}`,
    seedHint: 'Everyone on the daily seed gets the same backlog and dice. Compare cost. Or type your own seed.',
    custom: 'Seed',
    play: 'Start',
    rulesHeading: 'Rules',
    rules: [
      'Eight sprints. Five remediation points per sprint. Fix costs are 1 to 4 points.',
      'Every open finding rolls against its true exploit probability each sprint. The visible EPSS is an estimate with hidden noise.',
      'Exploited findings burn: they leave the backlog and their fix cost comes out of next sprint, capped at 2.',
      'Events arrive from sprint 1: zero-days that multiply exploit odds by tag, capacity changes, new assets, KEV additions, exposure changes, and an attestation that penalises every open compliance item.',
      'At the end: this year against every method on the same dice, a 200-year long run, and a replay grade that judges your picks rather than your luck.',
    ],
    methodsHeading: 'Methods and the formula',
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
    methodHint: 'Sorts the backlog and pre-selects a fill. Change anything.',
    more: 'More',
    less: 'Fewer',
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
    legend: 'Exp: internet-facing or internal. Crit: asset criticality 1 to 5. Attest: asked on the attestation. Cost: remediation points.',
    exposed: 'Internet',
    internal: 'Internal',
    commit: (n: number) => (n === 0 ? 'Skip sprint' : `Commit ${n}`),
    picked: (used: number, cap: number) => `${used} of ${cap} points`,
    boostTag: (x: number) => `×${x} this sprint`,
    newKevTag: 'new KEV',
    newAssetTag: 'new asset',
    nowExposedTag: 'now internet-facing',
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
    nav: { grade: 'Grade', year: 'This year', longRun: 'Long run', truth: 'Ground truth', share: 'Share' },
    thisYear: 'This year, same dice',
    cols: { method: 'Method', cost: 'Cost', delta: 'vs best', incidents: 'Incidents', fixes: 'Fixes' },
    you: 'You',
    best: 'Best',
    recommended: 'FlintScope method',
    fixesToggle: 'Picks by sprint',
    replayHeading: 'Replay grade',
    replayBody: (years: number, yours: string, best: string, pct: number, bestName: string) =>
      pct <= 0
        ? `Your picks, replayed through ${years} versions of this year with the same event order and fresh dice, average ${yours}. As good as any method.`
        : `Your picks, replayed through ${years} versions of this year with the same event order and fresh dice, average ${yours}: ${pct}% above ${bestName} at ${best}. Every method is replayed the same way, as the picks it made this year.`,
    longRunHeading: (years: number) => `Long run, ${years} years`,
    longRunCols: { method: 'Method', mean: 'Mean cost', win: 'Win share' },
    longRunNote: 'SSVC-style here is a coarse approximation of the published decision points, included for comparison rather than as a reference implementation.',
    truthHeading: 'Ground truth',
    truthHint: 'The visible EPSS is an estimate. This is the probability the dice used, sorted by how far off the estimate was.',
    truthSummary: (misses: number, total: number, under: number, exploited: number) =>
      exploited === 0
        ? `EPSS was off by more than 0.2 on ${misses} of ${total} findings. Nothing was exploited this year.`
        : `EPSS was off by more than 0.2 on ${misses} of ${total} findings. ${under} of the ${exploited} exploited showed EPSS under 0.5.`,
    truthCols: { finding: 'Finding', epss: 'EPSS shown', p: 'True p', delta: 'Δ', outcome: 'Outcome' },
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

  footer: {
    line: 'Built by FlintScope. No accounts, no tracking, nothing leaves your browser.',
    link: { label: 'flintscope.com', href: 'https://flintscope.com/' },
  },

  a11y: {
    skip: 'Skip to content',
    table: 'Open findings',
    nav: 'Debrief sections',
    progress: 'Sprint progress',
  },
} as const;

/** Practitioner grades use the same thresholds as the small-business skin. */
export { gradeForRatio } from './smallbiz';
