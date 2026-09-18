import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Game, Id } from '@engine/types';
import { buildScorecard, commitFixes, createGame, nextRound } from '@engine/index';
import type { ScenarioPack } from '@content/types';
import { pro } from '@content/copy/pro';
import { defaultProPackId, getProPack, proPacks } from '@content/pro';
import { dailySeed, randomSeed, readUrl, writeUrl } from '@skins/shared/seed';
import { applyPlaytest, hasPlaytest, readPlaytest } from '@skins/shared/playtest';
import { ProIntro } from './screens/ProIntro';
import { ProRound } from './screens/ProRound';
import { ProResult } from './screens/ProResult';
import { ProReport } from './screens/ProReport';

type Screen = 'intro' | 'round' | 'result' | 'report';

interface Session {
  pack: ScenarioPack;
  baseId: string;
  seed: number;
  game: Game;
}

/** The pro URL carries the base pack id (dental), not the -pro variant id. */
const baseIdOf = (pack: ScenarioPack) => pack.id.replace(/-pro$/, '');

export function App() {
  const initial = useMemo(() => readUrl(), []);
  const [baseId, setBaseId] = useState(() => (getProPack(initial.packId) ? initial.packId! : defaultProPackId));
  const [seed, setSeed] = useState<number>(() => initial.seed ?? dailySeed());
  const playtest = useMemo(() => readPlaytest(window.location.search), []);
  const [session, setSession] = useState<Session | null>(() => {
    if (!hasPlaytest(playtest)) return null;
    const p = getProPack(baseId);
    if (!p) return null;
    return { pack: p, baseId, seed, game: applyPlaytest(createGame(p, seed), p, playtest) };
  });
  const [screen, setScreen] = useState<Screen>(() =>
    session ? (session.game.state.phase === 'finished' ? 'report' : 'round') : 'intro',
  );

  useEffect(() => {
    writeUrl(baseId, seed);
  }, [baseId, seed]);

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
    window.scrollTo({ top: 0 });
  }, [screen, session?.game.state.round]);

  const start = useCallback((nextBaseId: string, nextSeed: number) => {
    const p = getProPack(nextBaseId);
    if (!p) return;
    setBaseId(nextBaseId);
    setSeed(nextSeed);
    setSession({ pack: p, baseId: nextBaseId, seed: nextSeed, game: createGame(p, nextSeed) });
    setScreen('round');
  }, []);

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

  const isDaily = seed === dailySeed();

  return (
    <>
      <a class="skip-link" href="#main">
        {pro.a11y.skip}
      </a>
      <div class="shell">
        <header class="masthead">
          <p class="masthead__title">
            {pro.title} <span class="masthead__edition">{pro.edition}</span>
          </p>
          <a class="masthead__back" href="../">{pro.intro.back}</a>
        </header>

        <main id="main" ref={mainRef}>
          {screen === 'intro' && (
            <ProIntro packs={proPacks} baseId={baseId} seed={seed} isDaily={isDaily} onStart={start} />
          )}
          {screen === 'round' && session && (
            <ProRound key={session.game.state.round} game={session.game} pack={session.pack} debug={playtest.debug} onCommit={commit} />
          )}
          {screen === 'result' && session && (
            <ProResult key={session.game.state.round} game={session.game} pack={session.pack} onNext={advance} />
          )}
          {screen === 'report' && session && scorecard && (
            <ProReport
              game={session.game}
              pack={session.pack}
              baseId={baseIdOf(session.pack)}
              isDaily={session.seed === dailySeed()}
              scorecard={scorecard}
              onAgain={() => start(session.baseId, session.seed)}
              onNew={() => start(session.baseId, randomSeed())}
              onOther={() => {
                setSession(null);
                setScreen('intro');
              }}
            />
          )}
        </main>
      </div>
    </>
  );
}
