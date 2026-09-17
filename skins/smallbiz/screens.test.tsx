import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { autoPick, buildScorecard, commitFixes, createGame, nextRound } from '@engine/index';
import { allPacks } from '@content/index';
import { Intro } from './screens/Intro';
import { Round } from './screens/Round';
import { RoundResult } from './screens/RoundResult';
import { ReportCard } from './screens/ReportCard';

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
      const round = render(<Round game={game} pack={pack} cash={cash} onCommit={noop} />);
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
    expect(report).toContain('Grade:');
    expect(report).toContain(pack.meta.audit.label);
    expect(report).not.toMatch(JARGON);
  });
});
