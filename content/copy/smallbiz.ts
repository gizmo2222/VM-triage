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
    blended: 'Attacked, where it hurts most',
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
      'You get 5 points a quarter. Spend them, or tap a sort chip and let it pick.',
      'Press Fix. Whatever you leave open stays open, and some of it gets used against you.',
      "Cleanup after a break-in eats up to 2 of next quarter's points.",
      'Four quarters, then a report card and a look at how other orders would have done.',
    ],
    storyHeading: 'The story',
    seedHeading: 'Game number',
    seedHint: 'Same number, same luck. Share it to compare.',
  },

  round: {
    title: (n: number, total: number, label: string) => `${label} ${n} of ${total}`,
    cash: 'Cash on hand',
    points: (left: number, total: number) => `${left}/${total} points`,
    pointsLabel: 'Fix points left',
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
    commit: (count: number) => (count === 0 ? 'Fix nothing' : count === 1 ? 'Fix 1' : `Fix ${count}`),
    commitHint: (left: number) => (left > 0 ? `${left} ${left === 1 ? 'point' : 'points'} unspent` : 'All points spent'),
    eventKicker: 'This quarter',
    emergencyKicker: 'Cleanup',
    emergencyBody: (broke: number, points: number) =>
      `${broke === 1 ? 'One break-in' : `${broke} break-ins`} last quarter. Cleanup ate ${points} ${points === 1 ? 'point' : 'points'}.`,
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
      A: 'You beat every instinct. Good eye, or good luck. Same number again to find out which.',
      B: 'One order would have done better. It is in the chart.',
      C: 'Middle of the pack. The order cost you real money.',
      D: 'Most orders would have gone better. It was the order, not the budget.',
      F: 'Rough year. Same budget, same luck, a different order saves most of it.',
    } as Record<Grade, string>,
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
    lesson: "You can't fix everything. The order is the whole game.",
    lessonDetail:
      'Not the scariest problems. Not the cheapest. The ones being attacked right now, on the things you cannot run without.',
    shareHeading: 'Share this game',
    shareHint: 'Same list, same luck for anyone with the link.',
    copyLink: 'Copy link',
    copied: 'Copied',
    replayHeading: 'Play again',
    replaySame: 'Same number, beat your grade',
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

/** Rank against six strategies. 1 = beat them all. */
export function gradeForRank(rank: number): Grade {
  if (rank <= 1) return 'A';
  if (rank === 2) return 'B';
  if (rank === 3) return 'C';
  if (rank <= 5) return 'D';
  return 'F';
}
