import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { autoPick, buildScorecard, commitFixes, createGame, nextRound } from '@engine/index';
import { proPacks } from '@content/pro';
import { ProIntro } from './screens/ProIntro';
import { ProRound } from './screens/ProRound';
import { ProResult } from './screens/ProResult';
import { ProReport } from './screens/ProReport';

const noop = () => {};
(globalThis as unknown as { window: unknown }).window = {
  matchMedia: () => ({ matches: true, addEventListener: noop, removeEventListener: noop }),
  location: { href: 'http://localhost/pro/' },
};

describe.each(proPacks.map((p) => [p.id, p] as const))('pro screens render for %s', (_id, pack) => {
  it('intro', () => {
    const html = render(<ProIntro packs={proPacks} baseId={pack.id.replace(/-pro$/, '')} seed={7} isDaily={false} onStart={noop} />);
    expect(html).toContain(pack.meta.name);
    expect(html).toContain('CVSS-first');
  });

  it('round, result and report across eight sprints', () => {
    let game = createGame(pack, 7);
    expect(pack.config.rounds).toBe(8);
    while (game.state.phase !== 'finished') {
      const round = render(<ProRound game={game} pack={pack} onCommit={noop} />);
      expect(round).toContain(`Sprint ${game.state.round} of 8`);
      expect(round).toContain('EPSS');
      expect(round).toContain('Manual');
      game = commitFixes(game, pack, autoPick(game, 'ssvc'));
      const result = render(<ProResult game={game} pack={pack} onNext={noop} />);
      expect(result).toContain('Sprint');
      if (game.state.phase === 'resolved') game = nextRound(game, pack);
    }
    const card = buildScorecard(game, pack);
    const report = render(
      <ProReport game={game} pack={pack} baseId="dental" isDaily scorecard={card} onAgain={noop} onNew={noop} onOther={noop} />,
    );
    expect(report).toContain('SSVC-style');
    expect(report).toContain('Ground truth');
    expect(report).toContain('Long run');
  });
});
