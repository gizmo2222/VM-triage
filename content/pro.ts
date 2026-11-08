import type { ScenarioPack } from './types';
import { scenarios } from './index';

/**
 * The practitioner edition plays the same packs with a longer, harder
 * configuration: eight sprints and an event from sprint one. The engine
 * rolls dice for `rounds`, so the same seed gives different truth here than
 * in the four-round game; that is expected.
 */
export const PRO_CONFIG = { rounds: 8, capacityPerRound: 5, firstEventRound: 1 } as const;

export function toPro(pack: ScenarioPack): ScenarioPack {
  return {
    ...pack,
    id: `${pack.id}-pro`,
    config: { ...pack.config, ...PRO_CONFIG },
    meta: { ...pack.meta, roundLabel: 'Sprint' },
  };
}

export const proPacks: ScenarioPack[] = scenarios.map(toPro);

/** Map a base pack id (as in the URL) to its pro variant. */
export function getProPack(baseId: string | undefined): ScenarioPack | undefined {
  if (!baseId) return undefined;
  return proPacks.find((p) => p.id === `${baseId}-pro`);
}

/** Base pack id (as in the URL) of a pro variant: the inverse of toPro's id. */
export const baseIdOf = (pack: ScenarioPack) => pack.id.replace(/-pro$/, '');

/** Base id of the first ready pack, so the pro fallback always resolves. */
export const defaultProPackId = scenarios[0]!.id;
