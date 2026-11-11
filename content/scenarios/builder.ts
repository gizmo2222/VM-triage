import type { Finding } from '@engine/types';

/** Builds a pack finding; kev, compliance and tags default to off/empty. */
export const f = (
  id: string,
  assetId: string,
  plainTitle: string,
  techTitle: string,
  severity: number,
  likelihood: number,
  fixCost: number,
  opts: { kev?: boolean; compliance?: boolean; tags?: string[] } = {},
): Finding => ({
  id,
  plainTitle,
  techTitle,
  severity,
  likelihood,
  knownExploited: opts.kev ?? false,
  assetId,
  fixCost,
  compliance: opts.compliance ?? false,
  tags: opts.tags ?? [],
});
