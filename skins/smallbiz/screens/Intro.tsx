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

const KIND_ICON: Record<string, string> = { dental: '🦷', manufacturer: '⚙️', ecommerce: '🛒' };

export function Intro({ packs, packId, seed, onStart }: Props) {
  const [chosen, setChosen] = useState(packId);
  const [seedText, setSeedText] = useState(seedToParam(seed));
  const pack = packs.find((p) => p.id === chosen) ?? packs[0]!;
  const resolveSeed = (): number => parseSeedParam(seedText) ?? seed;

  return (
    <div class="intro">
      <h1 tabIndex={-1} class="intro__title">
        {copy.intro.pick}
      </h1>
      <ul class="pickers">
        {packs.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              class="picker"
              aria-pressed={p.id === chosen}
              disabled={!p.ready}
              onClick={() => setChosen(p.id)}
            >
              <span class="picker__icon" aria-hidden="true">
                {KIND_ICON[p.id] ?? '🏢'}
              </span>
              <span class="picker__name">{p.meta.name}</span>
              <span class="picker__kind">{p.ready ? p.meta.kind : copy.intro.comingSoon}</span>
            </button>
          </li>
        ))}
      </ul>

      <section class="card card--brass intro__premise" aria-live="polite">
        <span class="kicker">{pack.meta.kind}</span>
        <h2>{pack.meta.name}</h2>
        <p class="intro__tagline">{pack.meta.tagline}</p>
        <p>{copy.intro.premise(pack.meta.itPersonName, pack.findings.length)}</p>
        <button type="button" class="btn btn--brass btn--big btn--block" onClick={() => onStart(pack.id, resolveSeed())}>
          {copy.intro.start}
        </button>
      </section>

      <details class="fold">
        <summary>{copy.intro.howHeading}</summary>
        <ol class="how">
          {copy.intro.howItWorks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </details>

      <details class="fold">
        <summary>{copy.intro.storyHeading}</summary>
        {pack.meta.intro.map((para) => (
          <p key={para}>{para}</p>
        ))}
        <p class="muted">{pack.meta.itPersonName}: “{pack.meta.voice.handover}”</p>
      </details>

      <details class="fold">
        <summary>{copy.intro.seedHeading}</summary>
        <p class="small muted">{copy.intro.seedHint}</p>
        <div class="seed-row">
          <input
            id="seed"
            type="text"
            inputMode="text"
            autoComplete="off"
            aria-label={copy.intro.seedHeading}
            value={seedText}
            onInput={(e) => setSeedText((e.target as HTMLInputElement).value)}
          />
        </div>
      </details>
    </div>
  );
}
