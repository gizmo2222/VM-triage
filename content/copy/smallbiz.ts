import type { StrategyId } from '@engine/types';
import type { ScenarioMeta } from '../types';

/**
 * Every string the smallbiz skin shows, except scenario narrative (that lives
 * in the scenario pack). No jargon anywhere in this file. Never CVE, CVSS,
 * EPSS or KEV. Short. The game is played, not read.
 */

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
      'Four quarters, then a report card and a look at how other orders would have done.',
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
    finish: 'Report card',
    months: [
      ['Jan', 'Feb', 'Mar'],
      ['Apr', 'May', 'Jun'],
      ['Jul', 'Aug', 'Sep'],
      ['Oct', 'Nov', 'Dec'],
    ],
  },

  report: {
    heading: 'Your year',
    gradeLabel: 'Grade',
    gradeBlurb: {
      A: 'You matched the best order this year, or came within a few percent of it. Same code again to see whether that was judgment or luck.',
      B: 'Close. The best order this year lost noticeably less. It is in the chart.',
      C: 'Middle of the pack. The order you picked cost real money against the best one.',
      D: 'Well behind the best order. It was the order, not the budget.',
      F: 'Rough year. Same budget, same luck, a different order saves most of it.',
    } as Record<Grade, string>,
    vsBest: (pct: number) => (pct <= 0 ? 'You matched the best order this year.' : `You lost ${pct}% more than the best order this year.`),
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
    shareHeading: 'Share this game',
    shareHint: 'Same list, same luck for anyone with the link.',
    copyLink: 'Copy link',
    copied: 'Copied',
    replayHeading: 'Play again',
    replaySame: 'Same code, beat your grade',
    replayNew: 'New year, new luck',
    replayOther: 'Different business',
  },

  a11y: {
    skipToContent: 'Skip to content',
    map: 'Rooms in your business',
    picked: 'you',
  },
} as const;

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Grade by how far above the year's best order you landed. ratio = your cost
 * divided by the lowest cost among you and every built-in order. Within 5%
 * is an A; a tie with a lucky chip still earns it, but a bad order cannot.
 */
export function gradeForRatio(ratio: number): Grade {
  if (ratio <= 1.05) return 'A';
  if (ratio <= 1.2) return 'B';
  if (ratio <= 1.45) return 'C';
  if (ratio <= 1.8) return 'D';
  return 'F';
}

/** Your cost against the best of the year, as a ratio >= 1. */
export function ratioToBest(playerCost: number, strategyCosts: number[]): number {
  const best = Math.min(playerCost, ...strategyCosts);
  if (best <= 0) return playerCost <= 0 ? 1 : Number.POSITIVE_INFINITY;
  return playerCost / best;
}
