import { useState } from 'preact/hooks';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { parseSeedParam, seedToParam } from '@skins/shared/seed';

interface Props {
  packs: ScenarioPack[];
  packId: string;
  seed: number;
  onStart: (packId: string, seed: number) => void;
}

export function Intro({ packs, packId, seed, onStart }: Props) {
  const [chosen, setChosen] = useState(packId);
  const [seedText, setSeedText] = useState(seedToParam(seed));
  const pack = packs.find((p) => p.id === chosen) ?? packs[0]!;

  const resolveSeed = (): number => parseSeedParam(seedText) ?? seed;

  return (
    <div>
      <section class="hero card card--brass">
        <span class="kicker">{pack.meta.kind}</span>
        <h1 tabIndex={-1}>{pack.meta.name}</h1>
        <p class="hero__lede">{pack.meta.tagline}</p>
        {pack.meta.intro.map((para) => (
          <p key={para}>{para}</p>
        ))}
      </section>

      <section class="card">
        <h2>{copy.intro.chooseBusiness}</h2>
        <ul class="biz-list">
          {packs.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                class="biz"
                aria-pressed={p.id === chosen}
                disabled={!p.ready}
                onClick={() => setChosen(p.id)}
              >
                <span class="biz__name">
                  {p.meta.name}
                  {!p.ready && <span class="muted"> · {copy.intro.comingSoon}</span>}
                </span>
                <span class="biz__tag">{p.meta.kind}</span>
              </button>
            </li>
          ))}
        </ul>

        <label for="seed" class="small">
          <strong>{copy.intro.seedLabel}</strong> <span class="muted">{copy.intro.seedHint}</span>
        </label>
        <div class="seed-row">
          <input
            id="seed"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={seedText}
            onInput={(e) => setSeedText((e.target as HTMLInputElement).value)}
          />
          <button type="button" class="btn btn--brass" onClick={() => onStart(pack.id, resolveSeed())}>
            {copy.intro.start}
          </button>
        </div>
      </section>

      <section class="card card--quiet">
        <ol class="how">
          {copy.intro.howItWorks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
