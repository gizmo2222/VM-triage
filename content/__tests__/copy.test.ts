import { describe, expect, it } from 'vitest';
import { allPacks, getPack } from '@content/index';
import { dental } from '@content/scenarios/dental';
import { ecommerce } from '@content/scenarios/ecommerce';
import type { StrategyId } from '@engine/types';
import { STRATEGY_IDS } from '@engine/types';
import { applyHeadlines } from '@content/types';
import type { ScenarioPack } from '@content/types';
import { defaultProPackId, getProPack, proPacks, toPro, PRO_CONFIG } from '@content/pro';
import {
  copy,
  gradeForRatio,
  ordinal,
  SMALLBIZ_STRATEGY_IDS,
  sortChipsFor,
  strategyNamesFor,
} from '@content/copy/smallbiz';
import { pro, METHODS, methodById, gradeForRatio as proGrade } from '@content/copy/pro';

/** True when a generated string leaks a placeholder. */
function bad(s: string): boolean {
  return /undefined|NaN|\[object|null/.test(s);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

describe('sortChipsFor', () => {
  it.each(allPacks.map((p) => [p.id, p] as const))('pack %s: five chips, no blended, capitalised people', (_id, pack) => {
    const chips = sortChipsFor(pack.meta);
    expect(chips.map((c) => c.id)).toEqual(['severityFirst', 'cheapestFirst', 'threatFirst', 'assetFirst', 'complianceFirst']);
    expect(chips.map((c) => c.id)).not.toContain('blended');
    expect(chips.find((c) => c.id === 'assetFirst')!.label).toBe(`${cap(pack.meta.people)} data`);
    expect(chips.find((c) => c.id === 'complianceFirst')!.hint).toBe(pack.meta.audit.instinct);
    for (const c of chips) {
      expect(c.label).toBeTruthy();
      expect(c.hint).toBeTruthy();
      expect(bad(c.label + c.hint)).toBe(false);
    }
    expect(new Set(chips.map((c) => c.label)).size).toBe(chips.length);
  });
});

describe('strategyNamesFor', () => {
  it.each(allPacks.map((p) => [p.id, p] as const))('pack %s: names every engine strategy', (_id, pack) => {
    const names = strategyNamesFor(pack.meta);
    expect(Object.keys(names).sort()).toEqual([...STRATEGY_IDS].sort());
    for (const id of STRATEGY_IDS) {
      expect(names[id], id).toBeTruthy();
      expect(bad(names[id])).toBe(false);
    }
    expect(names.assetFirst).toBe(`${cap(pack.meta.people)} data first`);
  });

  it('chip labels and report names agree on the shared orders', () => {
    const names = strategyNamesFor(dental.meta);
    for (const chip of sortChipsFor(dental.meta)) {
      if (chip.id === 'complianceFirst') continue;
      expect(names[chip.id].toLowerCase().startsWith(chip.label.toLowerCase())).toBe(true);
    }
  });

  it('small-business report orders are all named and include blended', () => {
    const names = strategyNamesFor(dental.meta);
    for (const id of SMALLBIZ_STRATEGY_IDS) expect(names[id as StrategyId]).toBeTruthy();
    expect(SMALLBIZ_STRATEGY_IDS).toContain('blended');
  });

  it('capitalises the first letter and survives an empty noun', () => {
    const meta = { ...dental.meta, people: 'guest' };
    expect(strategyNamesFor(meta).assetFirst).toBe('Guest data first');
    expect(sortChipsFor(meta)[3]!.label).toBe('Guest data');
    expect(() => strategyNamesFor({ ...dental.meta, people: '' })).not.toThrow();
  });
});

describe('gradeForRatio', () => {
  it.each([
    [0.5, 'A'],
    [1, 'A'],
    [1.05, 'A'],
    [1.0501, 'B'],
    [1.15, 'B'],
    [1.1501, 'C'],
    [1.3, 'C'],
    [1.3001, 'D'],
    [1.5, 'D'],
    [1.5001, 'F'],
    [10, 'F'],
    [Number.POSITIVE_INFINITY, 'F'],
  ])('ratio %s grades %s', (ratio, grade) => {
    expect(gradeForRatio(ratio)).toBe(grade);
  });

  it('is re-exported unchanged by the pro copy', () => {
    expect(proGrade).toBe(gradeForRatio);
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [10, '10th'],
    [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'],
    [23, '23rd'], [101, '101st'], [111, '111th'], [112, '112th'], [113, '113th'],
  ])('%s is %s', (n, s) => {
    expect(ordinal(n)).toBe(s);
  });
});


describe('smallbiz copy builders', () => {
  const r = copy.round;

  it('singular and plural problem counts', () => {
    expect(r.tileOpen(0)).toBe('0 problems');
    expect(r.tileOpen(1)).toBe('1 problem');
    expect(r.tileOpen(2)).toBe('2 problems');
    expect(r.panelTitle('Front desk', 1)).toBe('Front desk · 1 problem');
    expect(r.panelTitle('Front desk', 3)).toBe('Front desk · 3 problems');
    expect(r.panelTitle('Front desk', 0)).toBe('Front desk · 0 problems');
  });

  it('hit and picked counts', () => {
    expect(r.tileHit(1)).toBe('hit once');
    expect(r.tileHit(2)).toBe('hit 2 times');
    expect(r.tilePicked(3)).toBe('3 picked');
  });

  it('point costs', () => {
    expect(r.cost(1)).toBe('1 pt');
    expect(r.cost(2)).toBe('2 pts');
    expect(r.cost(4)).toBe('4 pts');
  });

  it('picks heading and commit button', () => {
    expect(r.picksHeading(1)).toBe('Your pick');
    expect(r.picksHeading(2)).toBe('Your picks (2)');
    expect(r.commit(0)).toBe('Skip quarter');
    expect(r.commit(1)).toBe('Fix 1');
    expect(r.commit(3)).toBe('Fix 3');
  });

  it('commit hint', () => {
    expect(r.commitHint(0)).toBe('All points spent');
    expect(r.commitHint(1)).toBe('1 point unspent');
    expect(r.commitHint(4)).toBe('4 points unspent');
  });

  it('titles and counters', () => {
    expect(r.title(2, 4, 'Quarter')).toBe('Quarter 2 of 4');
    expect(r.points(3, 5)).toBe('3/5 points');
    expect(r.cleanupTag(2)).toBe('−2 cleanup');
    expect(copy.intro.premise('Sam', 30)).toBe('Sam just handed you 30 problems. You can fix five a quarter.');
  });

  it('reveal lines: audit, emergency, letters, months', () => {
    const v = copy.reveal;
    expect(v.auditFailed(1, 'the form')).toBe('You failed the form: 1 open item they asked about.');
    expect(v.auditFailed(0, 'the form')).toContain('0 open items');
    expect(v.auditFailed(3, 'the form')).toContain('3 open items');
    expect(v.emergencyNext(2)).toContain('eat 2 of next quarter');
    expect(v.letters('1,200', 'patient')).toBe('1,200 patient letters');
    expect(v.closedFor('3 days')).toBe('Closed 3 days');
    expect(v.auditCost('$5,000', 'premium increase')).toBe('$5,000 premium increase');
    expect(v.kicker('Quarter', 3)).toBe('Quarter 3');
    expect(v.months).toHaveLength(4);
    for (const q of v.months) expect(q).toHaveLength(3);
    expect(new Set(v.months.flat()).size).toBe(12);
  });

  it('report lines', () => {
    const p = copy.report;
    expect(p.outcomeBest('$10')).toContain('lost $10');
    expect(p.outcomeBest('$10')).toContain('No other order did better');
    expect(p.outcomeTie('$10', 'Cheapest first')).toBe('You lost $10, tied with Cheapest first for the least.');
    expect(p.outcomeBehind('$10', 'Blended', '$4')).toBe('You lost $10. Blended would have lost $4.');
    expect(p.rankLabel(1, 7)).toBe('1st of 7');
    expect(p.rankLabel(12, 12)).toBe('12th of 12');
    expect(p.sameAs('Scariest first')).toBe('same as Scariest first');
    expect(p.luckLead(200, '$7')).toContain('200 more times');
    expect(p.luckLucky(90)).toContain('better than 90 in 100');
    expect(p.luckRough(90)).toContain('worse than 90 in 100');
    expect(p.luckMiddle(50)).toContain('better than 50 in 100');
    expect(p.quarterShort(3)).toBe('Q3');
    expect(p.fixesToggle('Blended')).toBe('What Blended fixed');
    expect(p.luckAlt(100, '$1', '$9', '$5', '$6')).toBe(
      '100 replays of this year, from $1 at the luckiest to $9 at the unluckiest. A typical one loses $5. Yours lost $6.',
    );
    expect(p.imageAlt('Bright Smile', '2nd of 7')).toContain('Bright Smile: 2nd of 7');
    const lr = p.longRun(200, 'A', '$1', 'B', '$2', 'C', '$3');
    expect(lr).toContain('Across 200 years');
    expect(lr.indexOf('$1')).toBeLessThan(lr.indexOf('$2'));
    expect(lr.indexOf('$2')).toBeLessThan(lr.indexOf('$3'));
  });

  it('no generated or static string leaks undefined or NaN, or jargon', () => {
    const jargon = /\b(CVE|CVSS|EPSS|KEV)\b/;
    const out: string[] = [];
    for (const n of [0, 1, 2, 5]) {
      out.push(
        r.tileOpen(n), r.tilePicked(n), r.tileHit(n), r.panelTitle('Room', n), r.cost(n), r.picksHeading(n),
        r.commit(n), r.commitHint(n), r.cleanupTag(n), copy.reveal.auditFailed(n, 'x'), copy.reveal.emergencyNext(n),
        copy.report.rankLabel(n || 1, 7), copy.report.luckLucky(n), copy.report.luckRough(n), copy.report.luckMiddle(n),
        copy.report.quarterShort(n),
      );
    }
    out.push(
      copy.siteTitle, copy.siteSubtitle, ...copy.intro.howItWorks, copy.report.lesson, copy.report.lessonDetail,
      ...copy.reveal.months.flat(),
    );
    for (const s of out) {
      expect(bad(s), s).toBe(false);
      expect(s, s).not.toMatch(jargon);
    }
  });
});

describe('every pack feeds the copy builders cleanly', () => {
  it.each(allPacks.map((p) => [p.id, p] as const))('pack %s', (_id, pack) => {
    const m = pack.meta;
    const strings = [
      ...sortChipsFor(m).flatMap((c) => [c.label, c.hint]),
      ...Object.values(strategyNamesFor(m)),
      copy.intro.premise(m.itPersonName, 30),
      copy.reveal.letters('10', m.people),
      copy.reveal.auditFailed(2, m.audit.name),
      copy.reveal.auditCost('$1,000', m.audit.penalty),
      copy.report.imageAlt(m.name, copy.report.rankLabel(1, 7)),
    ];
    for (const s of strings) expect(bad(s), s).toBe(false);
    expect(copy.reveal.auditFailed(1, m.audit.name)).toContain(m.audit.name);
    expect(copy.reveal.letters('10', m.people)).toContain(m.people);
  });
});

describe('pro copy', () => {
  it('seed lines: daily and custom', () => {
    expect(pro.intro.seedDaily('abc')).toBe('Daily seed abc · resets at midnight UTC');
    expect(pro.intro.seedCustom('abc')).toBe('Seed abc');
    expect(pro.report.seedLine('x1', true)).toBe('Daily seed x1');
    expect(pro.report.seedLine('x1', false)).toBe('Seed x1');
  });

  it('sprint, commit and result builders', () => {
    expect(pro.round.sprint(3, 8)).toBe('Sprint 3 of 8');
    expect(pro.round.commit(0)).toBe('Skip sprint');
    expect(pro.round.commit(2)).toBe('Commit 2');
    expect(pro.round.capacity(1, 5)).toBe('1/5 pts');
    expect(pro.round.picked(3, 5)).toBe('3 of 5 points');
    expect(pro.round.debt(2)).toBe('−2 burn');
    expect(pro.round.boostTag(2.5)).toBe('×2.5 this sprint');
    expect(pro.result.heading(4)).toBe('Sprint 4 resolved');
    expect(pro.result.exploited(2)).toBe('2 exploited');
    expect(pro.result.burnNext(2)).toContain('2 points');
    expect(pro.report.outcomeFixed(3)).toBe('fixed S3');
    expect(pro.report.outcomeExploited(3)).toBe('exploited S3');
    expect(pro.report.longRunHeading(200)).toBe('Long run, 200 years');
  });

  it('replayBody: zero or negative percent says as good as any method, positive names the best', () => {
    const none = pro.report.replayBody(200, '$5', '$5', 0, 'Blended');
    expect(none).toContain('As good as any method.');
    expect(none).not.toContain('above');
    expect(pro.report.replayBody(200, '$5', '$5', -3, 'Blended')).toContain('As good as any method.');
    const some = pro.report.replayBody(200, '$6', '$5', 20, 'Blended');
    expect(some).toContain('20% above Blended at $5');
    expect(some).not.toContain('As good as any method');
    expect(some).toContain('average $6');
  });

  it('truthSummary: nothing exploited omits the under-0.5 clause', () => {
    const zero = pro.report.truthSummary(4, 30, 0, 0);
    expect(zero).toContain('4 of 30 findings');
    expect(zero).toContain('Nothing was exploited this year.');
    expect(zero).not.toContain('showed EPSS');
    const some = pro.report.truthSummary(4, 30, 2, 5);
    expect(some).toContain('2 of the 5 exploited showed EPSS under 0.5.');
    expect(some).not.toContain('Nothing was exploited');
  });

  it('no builder leaks undefined or NaN', () => {
    const out = [
      pro.report.replayBody(200, '$1', '$1', 0, 'X'), pro.report.replayBody(200, '$1', '$1', 5, 'X'),
      pro.report.truthSummary(0, 30, 0, 0), pro.report.truthSummary(1, 30, 1, 1),
      pro.intro.seedDaily('s'), pro.intro.seedCustom('s'), ...pro.intro.rules,
    ];
    for (const s of out) expect(bad(s), s).toBe(false);
  });

  it('METHODS cover every engine strategy once, five primary, and methodById indexes them', () => {
    expect(METHODS.map((m) => m.id).sort()).toEqual([...STRATEGY_IDS].sort());
    expect(METHODS.filter((m) => m.primary)).toHaveLength(5);
    for (const m of METHODS) expect(methodById[m.id]).toBe(m);
  });
});

describe('content/pro', () => {
  it('toPro overlays the pro config and Sprint label without touching the source pack', () => {
    const before = JSON.stringify(dental.config);
    const p = toPro(dental);
    expect(p.id).toBe(`${dental.id}-pro`);
    expect(p.config).toMatchObject(PRO_CONFIG);
    expect(p.meta.roundLabel).toBe('Sprint');
    expect(dental.meta.roundLabel).not.toBe('Sprint');
    expect(JSON.stringify(dental.config)).toBe(before);
    expect(p.findings).toBe(dental.findings);
  });

  it('proPacks has one pro pack per ready pack', () => {
    expect(proPacks.map((p) => p.id)).toEqual(allPacks.filter((p) => p.ready).map((p) => `${p.id}-pro`));
  });

  it('getProPack resolves base ids and returns undefined for empty, missing or unknown ids', () => {
    expect(getProPack(undefined)).toBeUndefined();
    expect(getProPack('')).toBeUndefined();
    expect(getProPack('nope')).toBeUndefined();
    expect(getProPack(`${dental.id}-pro`)).toBeUndefined();
    for (const p of allPacks.filter((x) => x.ready)) expect(getProPack(p.id)?.id).toBe(`${p.id}-pro`);
  });

  it('defaultProPackId is a base id that resolves', () => {
    expect(defaultProPackId.endsWith('-pro')).toBe(false);
    expect(getProPack(defaultProPackId)).toBeDefined();
    expect(getPack(defaultProPackId)).toBeDefined();
    expect(`${defaultProPackId}-pro`).toBe(proPacks[0]!.id);
  });
});

describe('applyHeadlines', () => {
  const pack: ScenarioPack = ecommerce;
  const addAssetEvents = pack.events.filter((e) => e.effects.some((x) => x.kind === 'addAsset'));

  it('overrides by id and keeps the existing headline when the id is absent', () => {
    const first = pack.findings[0]!;
    const second = pack.findings[1]!;
    const out = applyHeadlines(pack, { [first.id]: 'Brand new headline' });
    expect(out.findings[0]!.headline).toBe('Brand new headline');
    expect(out.findings[1]!.headline).toBe(second.headline);
    expect(out.findings).toHaveLength(pack.findings.length);
  });

  it('with an empty map every headline is unchanged', () => {
    const out = applyHeadlines(pack, {});
    expect(out.findings.map((f) => f.headline)).toEqual(pack.findings.map((f) => f.headline));
  });

  it('reaches findings added by events and leaves other effects alone', () => {
    expect(addAssetEvents.length).toBeGreaterThan(0);
    const ev = addAssetEvents[0]!;
    const eff = ev.effects.find((x) => x.kind === 'addAsset')!;
    if (eff.kind !== 'addAsset') throw new Error('unreachable');
    const target = eff.findings[0]!;
    const out = applyHeadlines(pack, { [target.id]: 'Event headline' });
    const outEv = out.events.find((e) => e.id === ev.id)!;
    const outEff = outEv.effects.find((x) => x.kind === 'addAsset')!;
    if (outEff.kind !== 'addAsset') throw new Error('unreachable');
    expect(outEff.findings[0]!.headline).toBe('Event headline');
    expect(outEff.asset).toEqual(eff.asset);
    const other = pack.events.find((e) => e.effects.some((x) => x.kind !== 'addAsset'))!;
    const outOther = out.events.find((e) => e.id === other.id)!;
    expect(outOther.effects.filter((x) => x.kind !== 'addAsset')).toEqual(other.effects.filter((x) => x.kind !== 'addAsset'));
  });

  it('does not mutate the input pack', () => {
    const snapshot = JSON.stringify(pack);
    applyHeadlines(pack, { [pack.findings[0]!.id]: 'x' });
    expect(JSON.stringify(pack)).toBe(snapshot);
  });

  it('every shipped pack has a headline on every finding including event findings', () => {
    for (const p of allPacks) {
      for (const f of p.findings) expect(f.headline, `${p.id}/${f.id}`).toBeTruthy();
      for (const e of p.events) {
        for (const x of e.effects) {
          if (x.kind === 'addAsset') for (const f of x.findings) expect(f.headline, `${p.id}/${f.id}`).toBeTruthy();
        }
      }
    }
  });
});
