import type { ScenarioPack } from './types';
import { dental } from './scenarios/dental';

export type { ScenarioPack, ScenarioMeta } from './types';

/** Every pack, ready or not. The intro screen greys out the unready ones. */
export const allPacks: ScenarioPack[] = [dental];

/** Only packs that are playable. The balance test runs over these. */
export const scenarios: ScenarioPack[] = allPacks.filter((p) => p.ready);

export function getPack(id: string): ScenarioPack | undefined {
  return allPacks.find((p) => p.id === id);
}

export const defaultPackId = dental.id;
