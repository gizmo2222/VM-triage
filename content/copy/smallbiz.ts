import type { StrategyId } from '@engine/types';
import type { ScenarioMeta } from '../types';

/**
 * Every string the smallbiz skin shows, except scenario narrative (that lives
 * in the scenario pack). No jargon anywhere in this file. Never CVE, CVSS,
 * EPSS or KEV. Short. The game is played, not read.
 */

/** The orders the small-business report compares. The engine knows more; the pro skin shows them. */
export const SMALLBIZ_STRATEGY_IDS: readonly StrategyId[] = [
  'severityFirst',
  'threatFirst',
  'assetFirst',
  'complianceFirst',
  'cheapestFirst',
  'blended',
];

export interface SortChip {
  id: StrategyId;
  label: string;
  hint: string;
}

/** Sort chips on the round screen. Blended is deliberately absent. */
export function sortChipsFor(meta: ScenarioMeta): SortChip[] {
  return [
    { id: 'severityFirst', label: 'Scariest', hint: 'Whatever sounds worst' },
    { id: 'cheapestFirst', label: 'Cheapest', hint: 'As many as possible' },
    { id: 'threatFirst', label: 'Attacked', hint: 'What criminals use right now' },
    { id: 'assetFirst', label: `${cap(meta.people)} data`, hint: 'The crown jewels' },
    { id: 'complianceFirst', label: 'The form', hint: meta.audit.instinct },
  ];
}

/** Names for every strategy on the report card, including the one we recommend. */
export function strategyNamesFor(meta: ScenarioMeta): Record<StrategyId, string> {
  return {
    severityFirst: 'Scariest first',
    cheapestFirst: 'Cheapest first',
    threatFirst: 'Attacked first',
    assetFirst: `${cap(meta.people)} data first`,
    complianceFirst: 'The form first',
    likelihoodFirst: 'Most likely to be hit first',
    ssvc: 'Attacked, exposed, critical: a decision tree',
    blended: 'Attacked, where it hurts most, this quarter',
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const copy = {
  siteTitle: 'What First',
  siteSubtitle: 'Thirty problems. Five fixes a quarter.',

  intro: {
    pick: 'Pick a business',
    comingSoon: 'Coming soon',
    premise: (itPerson: string, count: number) => `${itPerson} just handed you ${count} problems. You can fix five a quarter.`,
    start: 'Play',
    howHeading: 'How it works',
    howItWorks: [
      'Tap a room to see what is wrong in it. Each problem costs 1 to 4 points to fix.',
      'You get 5 points a quarter. Spend them, or tap a sort chip and let it pick. The chips ignore the news at the top of each quarter. You do not have to.',
      'Press Fix. Whatever you leave open stays open, and some of it gets used against you.',
      "Cleanup after a break-in eats up to 2 of next quarter's points.",
      'Four quarters, then your year beside six other orders, same luck.',
    ],
    storyHeading: 'The story',
    seedHeading: 'Share code',
    seedHint: 'Same code, same luck. Send it to someone to compare.',
  },

  round: {
    title: (n: number, total: number, label: string) => `${label} ${n} of ${total}`,
    cash: 'Cash on hand',
    points: (left: number, total: number) => `${left}/${total} points`,
    pointsLabel: 'Fix points left',
    cleanupTag: (n: number) => `−${n} cleanup`,
    panelEmpty: 'Tap a room to see what is wrong in it.',
    sortLabel: 'Pick for me',
    clear: 'Clear',
    tileOpen: (n: number) => (n === 1 ? '1 problem' : `${n} problems`),
    tilePicked: (n: number) => `${n} picked`,
    tileHit: (n: number) => (n === 1 ? 'hit once' : `hit ${n} times`),
    tileClean: 'all clear',
    panelTitle: (name: string, n: number) => `${name} · ${n === 1 ? '1 problem' : `${n} problems`}`,
    close: 'Close',
    cost: (points: number) => (points === 1 ? '1 pt' : `${points} pts`),
    tooExpensive: "Won't fit",
    more: 'What does this mean?',
    picksHeading: (n: number) => (n === 1 ? 'Your pick' : `Your picks (${n})`),
    remove: 'Remove',
    commit: (count: number) => (count === 0 ? 'Skip quarter' : count === 1 ? 'Fix 1' : `Fix ${count}`),
    commitHint: (left: number) => (left > 0 ? `${left} ${left === 1 ? 'point' : 'points'} unspent` : 'All points spent'),
    eventKicker: 'This quarter',
    coach: {
      tapRoom: 'Tap a room to see what is wrong in it.',
      tapProblem: 'Tap a problem to pick it. Watch your points.',
      pressFix: 'Press Fix when you are done.',
    },
  },

  reveal: {
    kicker: (label: string, n: number) => `${label} ${n}`,
    probing: 'Someone is trying the doors.',
    quiet: 'Nothing broke.',
    quietHint: 'Nobody tried the right door. This time.',
    breakIn: 'Break-in',
    auditFail: 'Failed',
    skip: 'Skip',
    closedFor: (days: string) => `Closed ${days}`,
    letters: (n: string, people: string) => `${n} ${people} letters`,
    auditFailed: (n: number, auditName: string) =>
      `You failed ${auditName}: ${n} open ${n === 1 ? 'item' : 'items'} they asked about.`,
    auditCost: (dollars: string, penalty: string) => `${dollars} ${penalty}`,
    emergencyNext: (points: number) => `Cleanup will eat ${points} of next quarter's points.`,
    next: 'Next quarter',
    finish: 'See your year',
    months: [
      ['Jan', 'Feb', 'Mar'],
      ['Apr', 'May', 'Jun'],
      ['Jul', 'Aug', 'Sep'],
      ['Oct', 'Nov', 'Dec'],
    ],
  },

  report: {
    heading: 'Your year',
    /** Outcome first. The player just watched this year; say what happened before anything else. */
    outcomeBest: (lost: string) => `You lost ${lost}. No other order did better this year.`,
    outcomeTie: (lost: string, name: string) => `You lost ${lost}, tied with ${name} for the least.`,
    outcomeBehind: (lost: string, name: string, theirs: string) => `You lost ${lost}. ${name} would have lost ${theirs}.`,
    rankLabel: (rank: number, of: number) => `${ordinal(rank)} of ${of}`,
    /** How lucky the dice were, so a good year is not mistaken for a good order, or a bad one for a bad order. */
    luckLead: (years: number, median: string) => `Same picks, ${years} more tries at this year: a typical run loses ${median}.`,
    luckLucky: (pct: number) => `Yours was one of the lucky ones, better than ${pct} in 100.`,
    luckRough: (pct: number) => `Yours was one of the rough ones, worse than ${pct} in 100.`,
    luckMiddle: (pct: number) => `Yours landed in the middle, better than ${pct} in 100.`,
    fixesToggle: 'What it fixed',
    fixesNone: 'Nothing',
    quarterShort: (n: number) => `Q${n}`,
    totals: {
      lost: 'Lost',
      daysClosed: 'Days closed',
      letters: 'Letters sent',
      passed: 'Passed',
      failed: 'Failed',
      none: 'Not this year',
      breakIns: 'Break-ins',
    },
    compareHeading: 'Same problems. Same luck. Different order.',
    compareHint: 'How the year would have gone with each order. Shorter bar is better.',
    you: 'You',
    recommendedTag: 'FlintScope order',
    bestTag: 'Best',
    tiedBestTag: 'Tied best',
    longRunHeading: 'One year is luck',
    thisYearYou: 'This year, your order came out on top.',
    thisYearTie: (name: string) => `This year, you tied with ${name}.`,
    thisYear: (name: string) => `This year, luck favoured ${name}.`,
    longRun: (years: number, best: string, bestAvg: string, second: string, secondAvg: string, worst: string, worstAvg: string) =>
      `Across ${years} years with different luck, ${best} loses the least: ${bestAvg} a year on average, against ${secondAvg} for ${second} and ${worstAvg} for ${worst}.`,
    flintscopeOrder: 'the FlintScope order',
    lesson: "You can't fix everything. The order is the whole game.",
    lessonDetail:
      'Any single year can go either way. Over many years, the order that wins fixes what is being attacked right now, on the things you cannot run without, and changes its mind when the news changes. The chips never read the news. You can.',
    imageHeading: 'Post your year',
    imageMake: 'Make the picture',
    imageBusy: 'Drawing',
    imageSave: 'Save or share the picture',
    imageHint: 'On a phone, you can also press and hold the picture to save it.',
    imageFailed: 'The picture could not be drawn in this browser.',
    imageAlt: (business: string, rank: string) => `Your year at ${business}: ${rank}, with the cost of each order as a bar chart.`,
    shareHeading: 'Share this game',
    shareHint: 'Same list, same luck for anyone with the link.',
    copyLink: 'Copy link',
    copied: 'Copied',
    replayHeading: 'Play again',
    replaySame: 'Same code, lose less',
    replayNew: 'New year, new luck',
    replayOther: 'Different business',
  },

  a11y: {
    skipToContent: 'Skip to content',
    map: 'Rooms in your business',
    picked: 'you',
  },
} as const;

/** 1st, 2nd, 3rd, 4th ... for the rank line and the share image. */
export function ordinal(n: number): string {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Grade by ratio to the best order, where both are averaged over many replays
 * of the same year (see engine replayGrade). Within 5% is an A. The
 * small-business report stopped showing a letter on 2026-09-18: a player who
 * won the year and saw a C read it as the house cheating. Kept for the
 * practitioner edition, which is parked.
 */
export function gradeForRatio(ratio: number): Grade {
  if (ratio <= 1.05) return 'A';
  if (ratio <= 1.15) return 'B';
  if (ratio <= 1.3) return 'C';
  if (ratio <= 1.5) return 'D';
  return 'F';
}

/** Your cost against the best of the year, as a ratio >= 1. */
export function ratioToBest(playerCost: number, strategyCosts: number[]): number {
  const best = Math.min(playerCost, ...strategyCosts);
  if (best <= 0) return playerCost <= 0 ? 1 : Number.POSITIVE_INFINITY;
  return playerCost / best;
}
