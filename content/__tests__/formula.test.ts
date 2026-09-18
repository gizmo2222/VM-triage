import { describe, expect, it } from 'vitest';
import { BLENDED_AUDIT_BONUS, SENSITIVITY_WEIGHT, blendedScore } from '@engine/index';
import type { Asset, Finding } from '@engine/types';
import { FORMULA } from '@content/copy/pro';

/**
 * The practitioner edition publishes the blended formula. This pins the
 * published text to the engine so the two cannot drift apart silently.
 */
const asset: Asset = { id: 'a', name: 'A', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 10 };
const finding: Finding = {
  id: 'f',
  plainTitle: 'p',
  techTitle: 't',
  severity: 7.5,
  likelihood: 0.6,
  knownExploited: false,
  assetId: 'a',
  fixCost: 1,
  compliance: true,
  tags: ['x'],
};

describe('published formula matches the engine', () => {
  it('reproduces blendedScore from the published weights', () => {
    const threat = 0.45 * (0.15 + 0.6);
    const exposure = 1.0;
    const impact = (4 / 5) * (0.4 + (0.6 * 7.5) / 10) * (0.5 + 0.5 * SENSITIVITY_WEIGHT.customer);
    expect(blendedScore(finding, asset)).toBeCloseTo(threat * exposure * impact, 10);

    const kev = blendedScore({ ...finding, knownExploited: true }, asset);
    expect(kev).toBeCloseTo(1.0 * (0.15 + 0.6) * exposure * impact, 10);

    const internal = blendedScore(finding, { ...asset, internetExposed: false });
    expect(internal).toBeCloseTo(threat * 0.5 * impact, 10);

    const boosted = blendedScore(finding, asset, {
      modifiers: [{ effect: { kind: 'likelihoodBoost', tag: 'x', multiplier: 4 }, expiresAfterRound: 9 }],
    });
    expect(boosted).toBeCloseTo(threat * 4 * exposure * impact, 10);

    const audited = blendedScore(finding, asset, { modifiers: [{ effect: { kind: 'audit' }, expiresAfterRound: 9 }] });
    expect(audited).toBeCloseTo(threat * exposure * impact + BLENDED_AUDIT_BONUS, 10);
  });

  it('states the same constants in the copy', () => {
    const text = FORMULA.lines.join('\n');
    for (const needle of ['1.0 : 0.45', '0.15 + EPSS', '? 1.0 : 0.5', 'criticality ÷ 5', '0.4 + 0.6', String(BLENDED_AUDIT_BONUS)]) {
      expect(text, needle).toContain(needle);
    }
    for (const [k, v] of Object.entries(SENSITIVITY_WEIGHT)) expect(text).toContain(`${k} ${v}`);
  });
});
