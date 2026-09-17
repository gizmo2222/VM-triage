/**
 * Things the site owner changes without touching game code.
 * The CTA panel at the end of the report card reads from here.
 */
export const cta = {
  /** Small line above the heading. */
  kicker: 'From FlintScope',
  heading: 'Want the real list for your business?',
  body:
    'Placeholder copy. Describe the offer here: what they get, how long it takes, what it costs. Two sentences is plenty.',
  buttonLabel: 'Placeholder button',
  /** Configurable link. Opens in the same tab; no tracking parameters are added. */
  url: 'https://flintscope.com/',
  /** Optional fine print under the button. Empty string hides it. */
  finePrint: 'No email required to play. Nothing about your game is sent anywhere.',
};

/** Shown in the page footer. */
export const footer = {
  line: 'Built by FlintScope. No accounts, no tracking, nothing leaves your browser.',
  /** Set to a { label, href } once the practitioner skin exists. Null hides the link. */
  proLink: null as { label: string; href: string } | null,
};
