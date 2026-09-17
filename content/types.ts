import type { Scenario } from '@engine/types';

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
  /** Intro paragraphs, plain language. */
  intro: string[];
  /** The person who hands you the list. */
  itPersonName: string;
  /** "Month" for smallbiz, "Sprint" for pro. Skins may override. */
  roundLabel: string;
  /** Short plain-language notes per asset, keyed by asset id. Shown on hover / expand. */
  assetNotes: Record<string, string>;
}

export interface ScenarioPack extends Scenario {
  meta: ScenarioMeta;
  /** false while a pack is being written; the intro screen shows it as coming soon. */
  ready: boolean;
}
