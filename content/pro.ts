import type { ScenarioPack } from './types';
import { allPacks } from './index';

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

export const proPacks: ScenarioPack[] = allPacks.filter((p) => p.ready).map(toPro);

/** Map a base pack id (as in the URL) to its pro variant. */
export function getProPack(baseId: string | undefined): ScenarioPack | undefined {
  if (!baseId) return undefined;
  return proPacks.find((p) => p.id === `${baseId}-pro`);
}

export const defaultProPackId = allPacks[0]!.id;
