import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Game, Id } from '@engine/types';
import { buildScorecard, commitFixes, createGame, nextRound } from '@engine/index';
import { allPacks, defaultPackId, getPack } from '@content/index';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { randomSeed, readUrl, writeUrl } from '@skins/shared/seed';
import { footer } from './config';
import { Intro } from './screens/Intro';
import { Round } from './screens/Round';
import { RoundResult } from './screens/RoundResult';
import { ReportCard } from './screens/ReportCard';

type Screen = 'intro' | 'round' | 'result' | 'report';

interface Session {
  pack: ScenarioPack;
  seed: number;
  game: Game;
}

export function App() {
  const initial = useMemo(() => readUrl(), []);
  const [packId, setPackId] = useState(() => {
    const p = initial.packId ? getPack(initial.packId) : undefined;
    return p?.ready ? p.id : defaultPackId;
  });
  const [seed, setSeed] = useState<number>(() => initial.seed ?? randomSeed());
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('intro');

  // Keep the URL shareable at all times.
  useEffect(() => {
    writeUrl(packId, seed);
  }, [packId, seed]);

  // Move focus to the new screen's heading so keyboard and screen-reader users land somewhere sensible.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const h = mainRef.current?.querySelector<HTMLElement>('h1');
    h?.focus();
    window.scrollTo({ top: 0 });
  }, [screen, session?.game.state.round]);

  const start = useCallback(
    (nextPackId: string, nextSeed: number) => {
      const pack = getPack(nextPackId);
      if (!pack || !pack.ready) return;
      setPackId(nextPackId);
      setSeed(nextSeed);
      setSession({ pack, seed: nextSeed, game: createGame(pack, nextSeed) });
      setScreen('round');
    },
    [],
  );

  const commit = useCallback(
    (ids: Id[]) => {
      if (!session) return;
      setSession({ ...session, game: commitFixes(session.game, session.pack, ids) });
      setScreen('result');
    },
    [session],
  );

  const advance = useCallback(() => {
    if (!session) return;
    if (session.game.state.phase === 'finished') {
      setScreen('report');
      return;
    }
    setSession({ ...session, game: nextRound(session.game, session.pack) });
    setScreen('round');
  }, [session]);

  const scorecard = useMemo(
    () => (session && session.game.state.phase === 'finished' ? buildScorecard(session.game, session.pack) : null),
    [session],
  );

  const backToIntro = useCallback(() => {
    setSession(null);
    setScreen('intro');
  }, []);

  return (
    <>
      <a class="skip-link" href="#main">
        {copy.a11y.skipToContent}
      </a>
      <div class="shell">
        <header class="masthead">
          <p class="masthead__title">{copy.siteTitle}</p>
          <p class="masthead__sub">{copy.siteSubtitle}</p>
        </header>

        <main id="main" ref={mainRef}>
          {screen === 'intro' && (
            <Intro packs={allPacks} packId={packId} seed={seed} onStart={start} />
          )}
          {screen === 'round' && session && (
            <Round key={session.game.state.round} game={session.game} pack={session.pack} onCommit={commit} />
          )}
          {screen === 'result' && session && (
            <RoundResult game={session.game} pack={session.pack} onNext={advance} />
          )}
          {screen === 'report' && session && scorecard && (
            <ReportCard
              game={session.game}
              pack={session.pack}
              scorecard={scorecard}
              onReplaySame={() => start(session.pack.id, session.seed)}
              onReplayNew={() => start(session.pack.id, randomSeed())}
              onReplayOther={backToIntro}
            />
          )}
        </main>

        <footer class="site-footer">
          <p>
            {footer.line} <a href={footer.proLink.href}>{footer.proLink.label}</a>
          </p>
        </footer>
      </div>
    </>
  );
}
