/**
 * Things the site owner changes without touching game code.
 * The CTA panel at the end of the report card reads from here.
 *
 * Facts below come from the FlintScope brief and the product pages. Prices,
 * file lists and credentials must match flintscope.com exactly.
 */
export const cta = {
  /** Small line above the heading. */
  kicker: 'From FlintScope',
  heading: 'The real list, for your real business',
  body:
    'The Security Starter is the eighteen-step version of what you just played: plain English, in the order that matters, with the free steps first. It comes with a printable wallchart, a progress tracker, and a tab of ready answers for the insurance questionnaire. One-time, no subscription.',
  buttonLabel: 'Get the Security Starter, $49',
  /** Configurable link. Opens in the same tab; no tracking parameters are added. */
  url: 'https://flintscope.gumroad.com/l/starter',
  /** A no-cost path under the button. Null hides it. */
  secondary: {
    text: 'Not ready to spend anything? Start with the Free Six: the six steps that stop the scams that actually hit small businesses.',
    linkLabel: 'Get the Free Six one-pager',
    url: 'https://flintscope.com/FlintScope-Free-The-Free-Six.pdf',
  } as { text: string; linkLabel: string; url: string } | null,
  /** Optional fine print under the button. Empty string hides it. */
  finePrint:
    'Written by Nick Strupp, CISSP, who built and ran vulnerability management for more than 5,000 applications at Accenture. Nothing about your game leaves your browser.',
};

/** Shown in the page footer. */
export const footer = {
  line: 'Built by FlintScope. No accounts, no tracking, nothing leaves your browser.',
  /** Set to a { label, href } once the practitioner skin exists. Null hides the link. */
  proLink: null as { label: string; href: string } | null,
};
