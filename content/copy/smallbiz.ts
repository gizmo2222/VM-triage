import type { StrategyId } from '@engine/types';
import type { ScenarioMeta } from '../types';

/**
 * Every string the smallbiz skin shows, except scenario narrative (that lives
 * in the scenario pack). No jargon anywhere in this file. Never CVE, CVSS,
 * EPSS or KEV.
 */

export interface Instinct {
  id: StrategyId;
  label: string;
  blurb: string;
}

/**
 * The instincts a player can pick from on the round screen. Blended is
 * deliberately absent. Labels borrow the pack's word for its people and its
 * name for the audit.
 */
export function instinctsFor(meta: ScenarioMeta): Instinct[] {
  return [
    { id: 'severityFirst', label: 'Scariest sounding', blurb: 'Fix whatever sounds worst.' },
    { id: 'cheapestFirst', label: 'Cheapest', blurb: 'Knock out as many as you can.' },
    { id: 'threatFirst', label: 'What the vendor emailed about', blurb: 'The ones criminals are using right now.' },
    { id: 'assetFirst', label: `What touches payments and ${meta.people} data`, blurb: 'Protect the crown jewels first.' },
    { id: 'complianceFirst', label: meta.audit.instinct, blurb: 'Keep the paperwork clean.' },
  ];
}

/** Names for every strategy on the report card, including the one we recommend. */
export function strategyNamesFor(meta: ScenarioMeta): Record<StrategyId, string> {
  return {
    severityFirst: 'Scariest sounding first',
    cheapestFirst: 'Cheapest first',
    threatFirst: 'What the vendor emailed about first',
    assetFirst: `What touches payments and ${meta.people} data first`,
    complianceFirst: `${meta.audit.instinct} first`,
    blended: "What's actually being attacked, where it hurts most",
  };
}

export const copy = {
  siteTitle: 'What First',
  siteSubtitle: 'Thirty problems. Five fixes a quarter. Choose.',

  intro: {
    chooseBusiness: 'Pick your business',
    comingSoon: 'Coming soon',
    start: 'Start',
    seedLabel: 'Game number',
    seedHint: 'Same number, same luck. Share it to compare with someone.',
    howHeading: 'How it works',
    howItWorks: [
      'Your IT person hands you a list of about thirty problems. Each one costs 1 to 4 fix points to sort out.',
      'Every quarter you get 5 fix points. Spend them on whichever problems you want, or tap an instinct and let it pick for you.',
      'Press Fix. Everything you left open stays open, and some of it gets used against you: days closed, money lost, letters to the people whose data leaked.',
      "When something breaks, your IT person drops everything to clean it up. That eats up to 2 of next quarter's points.",
      'After four quarters you get a report card, and a look at how the same year would have gone if you had picked in a different order.',
    ],
    howFooter: 'There is no way to fix everything. The whole game is choosing the order.',
  },

  round: {
    monthOf: (n: number, total: number, label: string) => `${label} ${n} of ${total}`,
    pointsLeft: (left: number, total: number) => `${left} of ${total} fix ${total === 1 ? 'point' : 'points'} left`,
    pointsOver: (over: number) => `${over} over budget`,
    emergencyHeading: 'Emergency cleanup',
    emergencyBody: (broke: number, points: number, total: number) =>
      `${broke === 1 ? 'One thing' : `${broke} things`} you left open got used against you last quarter. Cleaning up ate ${points} of this quarter's ${total} fix points.`,
    firstMonthHeading: 'What to do',
    firstMonthSteps: [
      'You have 5 fix points this quarter. Each problem on the list shows what it costs.',
      'Tap problems to pick them, or tap an instinct below and it will pick for you.',
      'Press Fix at the bottom. Then see what happens to everything you left open.',
      'If something breaks, cleaning it up costs you up to 2 points next quarter. Bad quarters compound.',
    ],
    laterMonthHint: (points: number) =>
      `Pick what gets fixed this quarter. ${points} ${points === 1 ? 'point' : 'points'} to spend.`,
    instinctsHeading: 'Not sure? Let an instinct pick',
    instinctsHint: 'It picks for you and sorts the list to match. You can still change anything.',
    clearPicks: 'Clear picks',
    listHeading: 'The list',
    listHint: (count: number) => `${count} open problems. Tap any of them to add it to this quarter's fixes.`,
    cost: (points: number) => (points === 1 ? '1 point' : `${points} points`),
    tooExpensive: "Won't fit this quarter",
    commit: (count: number) => (count === 0 ? 'Fix nothing this quarter' : count === 1 ? 'Fix this one' : `Fix these ${count}`),
    commitHint: 'Everything you leave open stays open.',
    eventHeading: 'This quarter',
  },

  result: {
    heading: (n: number, label: string) => `${label} ${n}: what happened`,
    quiet: 'A quiet quarter. Nothing broke.',
    quietHint: "That doesn't mean nothing was wrong. It means nobody tried the door.",
    fixedLine: (count: number) => (count === 0 ? 'You fixed nothing.' : count === 1 ? 'You fixed one thing.' : `You fixed ${count} things.`),
    incidentIntro: (count: number) => (count === 1 ? 'One thing went wrong.' : `${count} things went wrong.`),
    howTheyGotIn: 'How they got in',
    closedFor: (days: string) => `Closed for ${days}.`,
    cost: (dollars: string) => `${dollars} in costs.`,
    letters: (n: string, people: string) => `${n} ${people} notification letters.`,
    auditFailed: (n: number, auditName: string) =>
      `You failed ${auditName}. ${n} ${n === 1 ? 'item' : 'items'} they asked about ${n === 1 ? 'was' : 'were'} still open.`,
    auditCost: (dollars: string, penalty: string) => `${dollars} ${penalty}.`,
    emergencyNext: (points: number, itPerson: string) =>
      `${itPerson} has to drop everything to clean this up. It will eat ${points} of next quarter's fix ${points === 1 ? 'point' : 'points'}.`,
    next: 'Next quarter',
    finish: 'See your report card',
  },

  report: {
    heading: 'Your year',
    gradeLabel: 'Grade',
    gradeBlurb: {
      A: 'You beat every instinct. That takes a good eye or good luck. Play the same number again to find out which.',
      B: 'One approach would have done better. See the comparison below.',
      C: 'Middle of the pack. The order you picked cost you real money.',
      D: 'Most approaches would have gone better. The good news: it was the order, not the budget.',
      F: 'Rough year. Same budget, same luck, a different order would have saved most of it.',
    } as Record<Grade, string>,
    totals: {
      daysClosed: 'Days closed',
      dollarsLost: 'Money lost',
      letters: 'Notification letters',
      insurancePassed: 'Passed',
      insuranceFailed: 'Failed',
      insuranceNone: 'Not this year',
      incidents: 'Things that went wrong',
    },
    counterfactualHeading: 'Same problems. Same luck. Same budget. Different order.',
    counterfactualHint: "Here's how your year would have gone if you'd fixed things in a different order.",
    colOrder: 'Order',
    colIncidents: 'Went wrong',
    colCost: 'Lost',
    you: 'You',
    lesson: "You can't fix everything. The order is the whole game.",
    lessonDetail:
      'The best order is not the scariest-sounding problems and not the cheapest ones. It is the problems that are being attacked right now, on the things your business cannot run without.',
    shareHeading: 'Share this game',
    shareHint: 'Anyone with this link gets the same list and the same luck.',
    copyLink: 'Copy link',
    copied: 'Copied',
    replayHeading: 'Play again',
    replaySame: 'Same number, beat your grade',
    replayNew: 'New year, new luck',
    replayOther: 'Try a different business',
  },

  a11y: {
    skipToContent: 'Skip to content',
    pointsMeter: 'Fix points',
    selected: 'selected',
    findingList: 'Open problems',
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
