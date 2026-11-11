import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { autoPick, buildScorecard, commitFixes, createGame, nextRound } from '@engine/index';
import { allPacks } from '@content/index';
import { Intro } from './screens/Intro';
import { Round } from './screens/Round';
import { RoundResult } from './screens/RoundResult';
import { ReportCard } from './screens/ReportCard';
import { FindingCard } from './components/FindingCard';
import { SMALLBIZ_STRATEGY_IDS, strategyNamesFor, copy } from '@content/copy/smallbiz';
import { days } from '@skins/shared/format';

/**
 * Smoke tests: every screen renders for every pack without throwing, and the
 * jargon rule holds on what a player actually sees.
 */
const JARGON = /\b(CVE|CVSS|EPSS|KEV|RCE|SQL|SMB|TLS|MFA|VLAN|RDP|VPN|PSK|EOL|PII|PHI|PCI)\b/;
const noop = () => {};

// Just enough window for the screens: reduced motion (so the reveal renders
// its finished state without effects) and a location for the share link.
(globalThis as unknown as { window: unknown }).window = {
  matchMedia: () => ({ matches: true, addEventListener: noop, removeEventListener: noop }),
  location: { href: 'http://localhost/' },
};

describe.each(allPacks.map((p) => [p.id, p] as const))('screens render for %s', (_id, pack) => {
  it('intro', () => {
    const html = render(<Intro packs={allPacks} packId={pack.id} seed={7} onStart={noop} />);
    expect(html).toContain(pack.meta.name);
    expect(html).not.toMatch(JARGON);
  });

  it('round, reveal and report across a whole game', () => {
    let game = createGame(pack, 7);
    let cash = pack.meta.cashOnHand;
    while (game.state.phase !== 'finished') {
      const round = render(<Round game={game} pack={pack} cash={cash} cashPrev={cash} onCommit={noop} />);
      expect(round).toContain(`${pack.meta.roundLabel} ${game.state.round} of ${pack.config.rounds}`);
      expect(round).not.toMatch(JARGON);

      game = commitFixes(game, pack, autoPick(game, 'blended'));
      const reveal = render(<RoundResult game={game} pack={pack} cashBefore={cash} onNext={noop} />);
      expect(reveal).toContain(pack.meta.itPersonName);
      expect(reveal).not.toMatch(JARGON);
      cash = pack.meta.cashOnHand - game.state.incidents.reduce((s, i) => s + i.impact.dollars, 0);

      if (game.state.phase === 'resolved') game = nextRound(game, pack);
    }
    const card = buildScorecard(game, pack);
    const report = render(
      <ReportCard game={game} pack={pack} scorecard={card} onReplaySame={noop} onReplayNew={noop} onReplayOther={noop} />,
    );
    expect(report).toContain('You lost');
    expect(report).not.toContain('Grade');
    expect(report).toContain('class="luck"');
    expect(report.split('$').length).toBeGreaterThan(3);
    expect(report.lastIndexOf('class="card cta"')).toBeGreaterThan(report.lastIndexOf('class="after"'));
    expect(report).toContain(pack.meta.audit.label);
    expect(report).not.toMatch(JARGON);
  });
});

describe('ReportCard ledger', () => {
  it('counts break-ins only, not a failed audit', () => {
    // Find a year with a failed audit by fixing nothing, then check the Break-ins row.
    for (const pack of allPacks.filter((p) => p.ready)) {
      for (let seed = 1; seed <= 300; seed++) {
        let game = createGame(pack, seed);
        while (game.state.phase !== 'finished') {
          game = commitFixes(game, pack, []);
          if (game.state.phase === 'resolved') game = nextRound(game, pack);
        }
        const { incidents } = game.state;
        if (!incidents.some((i) => i.cause === 'audit')) continue;
        const breakIns = incidents.filter((i) => i.cause === 'exploited').length;
        expect(breakIns).toBeLessThan(incidents.length);
        const html = render(
          <ReportCard game={game} pack={pack} scorecard={buildScorecard(game, pack)} onReplaySame={noop} onReplayNew={noop} onReplayOther={noop} />,
        );
        expect(html).toContain(`<dt>Break-ins</dt><dd>${breakIns}</dd>`);
        return;
      }
    }
    throw new Error('no seed produced a failed audit');
  });
});

describe('FindingCard', () => {
  const finding = allPacks[0]!.findings[0]!;
  it("keeps a card that won't fit focusable, marked aria-disabled", () => {
    const html = render(<FindingCard finding={finding} picked={false} fits={false} onToggle={noop} />);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});

function finishedGame(pack: (typeof allPacks)[number]) {
  let game = createGame(pack, 7);
  while (game.state.phase !== 'finished') {
    game = commitFixes(game, pack, []);
    if (game.state.phase === 'resolved') game = nextRound(game, pack);
  }
  return game;
}
const reportOf = (pack: (typeof allPacks)[number], card: ReturnType<typeof buildScorecard>) =>
  render(<ReportCard game={finishedGame(pack)} pack={pack} scorecard={card} onReplaySame={noop} onReplayNew={noop} onReplayOther={noop} />);

describe('ReportCard ledger days closed', () => {
  it('shows the same label as the reveal for a 0.23-day closure', () => {
    const pack = allPacks.find((p) => p.ready)!;
    const card = buildScorecard(finishedGame(pack), pack);
    card.player = { ...card.player, totals: { ...card.player.totals, downtimeDays: 0.23 } };
    const html = reportOf(pack, card);
    expect(html).toContain(`<dt>${copy.report.totals.daysClosed}</dt><dd>${days(0.23)}</dd>`);
  });
});

describe('ReportCard row sort', () => {
  it('uses a consistent comparator and keeps tied rows in strategy order, you first', () => {
    const pack = allPacks.find((p) => p.ready)!;
    const card = buildScorecard(finishedGame(pack), pack);
    const strategies = { ...card.strategies };
    for (const id of SMALLBIZ_STRATEGY_IDS) strategies[id] = { ...strategies[id], totalCost: 1000 };
    const tied = { ...card, player: { ...card.player, totalCost: 1000 }, strategies };

    const cmps: ((a: unknown, b: unknown) => number)[] = [];
    const orig = Array.prototype.sort;
    Array.prototype.sort = function (this: unknown[], fn?: (a: never, b: never) => number) {
      if (fn && this.length === SMALLBIZ_STRATEGY_IDS.length + 1 && (this[0] as { cost?: number })?.cost === 1000) {
        cmps.push(fn as (a: unknown, b: unknown) => number);
      }
      return orig.call(this, fn as never);
    } as typeof Array.prototype.sort;
    let html = '';
    try {
      html = reportOf(pack, tied);
    } finally {
      Array.prototype.sort = orig;
    }
    expect(cmps).toHaveLength(1);
    const rows = ['you', ...SMALLBIZ_STRATEGY_IDS].map((id) => ({ id, cost: 1000 }));
    for (const a of rows) for (const b of rows) if (a !== b) expect(Math.sign(cmps[0]!(a, b))).toBe(-Math.sign(cmps[0]!(b, a)));

    const names = strategyNamesFor(pack.meta);
    const label = (id: (typeof SMALLBIZ_STRATEGY_IDS)[number]) => (id === 'blended' ? copy.report.flintscopeBar : names[id]);
    const order = [copy.report.you, ...SMALLBIZ_STRATEGY_IDS.map(label)].map((n) => html.indexOf(`>${n}`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });
});
