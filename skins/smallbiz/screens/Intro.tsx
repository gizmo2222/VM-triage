import { useState } from 'preact/hooks';
import type { ScenarioPack } from '@content/types';
import { copy } from '@content/copy/smallbiz';
import { parseSeedParam, seedToParam } from '@skins/shared/seed';
import { Icon } from '../components/Icon';

interface Props {
  packs: ScenarioPack[];
  packId: string;
  seed: number;
  onStart: (packId: string, seed: number) => void;
}

const KIND_ICON: Record<string, string> = { dental: 'tooth', manufacturer: 'gear', ecommerce: 'cart' };

export function Intro({ packs, packId, seed, onStart }: Props) {
  const [chosen, setChosen] = useState(packId);
  const [seedText, setSeedText] = useState(seedToParam(seed));
  const pack = packs.find((p) => p.id === chosen) ?? packs[0]!;
  const resolveSeed = (): number => parseSeedParam(seedText) ?? seed;

  return (
    <div class="intro">
      <p class="eyebrow" id="pick-label">
        {copy.intro.pick}
      </p>
      <ul class="pickers" aria-labelledby="pick-label">
        {packs.map((p) => (
          <li key={p.id}>
            <button type="button" class="picker" aria-pressed={p.id === chosen} disabled={!p.ready} onClick={() => setChosen(p.id)}>
              <span class="picker__icon">
                <Icon name={KIND_ICON[p.id] ?? 'monitor'} size="1.9rem" />
              </span>
              <span class="picker__name">{p.meta.name}</span>
              <span class="picker__kind">{p.ready ? p.meta.kind : copy.intro.comingSoon}</span>
            </button>
          </li>
        ))}
      </ul>

      <section class="premise" aria-live="polite">
        <span class="kicker">{pack.meta.kind}</span>
        <h1 tabIndex={-1}>{pack.meta.name}</h1>
        <p class="premise__tagline">{pack.meta.tagline}</p>
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
        <p class="voice">
          <span class="voice__who">{pack.meta.itPersonName}</span> “{pack.meta.voice.handover}”
        </p>
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
