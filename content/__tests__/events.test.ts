import { describe, expect, it } from 'vitest';
import { allPacks } from '@content/index';

describe.each(allPacks.map((p) => [p.id, p] as const))('pack %s event copy', (_id, pack) => {
  it('states the same multiplier in techBody as the likelihoodBoost effect', () => {
    for (const e of pack.events) {
      for (const fx of e.effects) {
        if (fx.kind !== 'likelihoodBoost') continue;
        const m = /(\d+(?:\.\d+)?)x/.exec(e.techBody);
        if (m) expect(Number(m[1]), e.id).toBe(fx.multiplier);
      }
    }
  });

  it('does not call a multi-round event a one-quarter window', () => {
    for (const e of pack.events) {
      if ((e.duration ?? 1) > 1) expect(e.plainBody, e.id).not.toMatch(/this (quarter|week|round)/i);
    }
  });

  it('does not hard-code a fix count in capacity-cut events', () => {
    for (const e of pack.events) {
      if (!e.effects.some((fx) => fx.kind === 'capacityDelta')) continue;
      expect(e.plainBody, e.id).not.toMatch(/\b(one|two|three|four|five|\d+) fix(es)?\b/i);
    }
  });
});
