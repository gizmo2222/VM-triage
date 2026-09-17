import type { Finding, Scenario } from '@engine/types';

/**
 * A scenario pack is an engine Scenario plus the narrative that wraps it.
 * Everything a player reads about the business lives here, not in the engine
 * and not in the skins.
 */
export interface ScenarioMeta {
  /** "Bright Smile Family Dental" */
  name: string;
  /** "a dental office" */
  kind: string;
  /** One line under the name on the intro screen. */
  tagline: string;
  /** Intro paragraphs, plain language. Shown behind "the story" on the intro. */
  intro: string[];
  /** The person who hands you the list. */
  itPersonName: string;
  /** Singular noun for the people whose data the business holds: "patient", "customer". */
  people: string;
  /** How this business experiences the audit event. */
  audit: {
    /** Report card row label: "Insurance questionnaire". */
    label: string;
    /** Badge on findings it asks about: "On the insurance form". */
    badge: string;
    /** Instinct label: "What the insurance form asks about". */
    instinct: string;
    /** In a sentence: "the insurance questionnaire". */
    name: string;
    /** Follows a dollar figure: "premium increase". */
    penalty: string;
  };
  /** "Quarter" for smallbiz, "Sprint" for pro. Skins may override. */
  roundLabel: string;
  /** Short plain-language notes per asset, keyed by asset id. */
  assetNotes: Record<string, string>;
  /** One emoji per asset id, for the tile map. */
  assetIcons: Record<string, string>;
  /** Cash on hand at the start of the year. Incidents drain it on screen. */
  cashOnHand: number;
  /** Lines the IT person says. Picked deterministically by round, never randomly. */
  voice: {
    handover: string;
    quiet: string[];
    breach: string[];
    audit: string;
    emergency: string;
  };
}

export interface ScenarioPack extends Scenario {
  meta: ScenarioMeta;
  /** false while a pack is being written; the intro screen shows it as coming soon. */
  ready: boolean;
}

/** Attach short headlines to every finding in a pack, including event-added ones. */
export function applyHeadlines(pack: ScenarioPack, headlines: Record<string, string>): ScenarioPack {
  const h = (f: Finding): Finding => ({ ...f, headline: headlines[f.id] ?? f.headline });
  return {
    ...pack,
    findings: pack.findings.map(h),
    events: pack.events.map((e) => ({
      ...e,
      effects: e.effects.map((eff) => (eff.kind === 'addAsset' ? { ...eff, findings: eff.findings.map(h) } : eff)),
    })),
  };
}
