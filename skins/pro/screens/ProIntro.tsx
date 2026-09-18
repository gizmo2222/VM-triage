import { useState } from 'preact/hooks';
import type { ScenarioPack } from '@content/types';
import { METHODS, pro } from '@content/copy/pro';
import { parseSeedParam, seedToParam } from '@skins/shared/seed';

interface Props {
  packs: ScenarioPack[];
  baseId: string;
  seed: number;
  isDaily: boolean;
  onStart: (baseId: string, seed: number) => void;
}

export function ProIntro({ packs, baseId, seed, isDaily, onStart }: Props) {
  const [chosen, setChosen] = useState(baseId);
  const [seedText, setSeedText] = useState(seedToParam(seed));
  const resolveSeed = () => parseSeedParam(seedText) ?? seed;

  return (
    <div class="intro">
      <p class="lede">{pro.subtitle}</p>

      <section class="panel" aria-labelledby="seed-title">
        <h1 id="seed-title" tabIndex={-1}>
          {isDaily ? pro.intro.daily(seedToParam(seed)) : pro.intro.custom}
        </h1>
        <p class="muted small">{pro.intro.dailyHint}</p>
        <label class="field">
          <span class="field__label">{pro.intro.custom}</span>
          <input type="text" value={seedText} autoComplete="off" onInput={(e) => setSeedText((e.target as HTMLInputElement).value)} />
          <span class="muted small">{pro.intro.customHint}</span>
        </label>
      </section>

      <section class="panel" aria-labelledby="pack-title">
        <h2 id="pack-title">{pro.intro.heading}</h2>
        <div class="pickrow" role="group" aria-labelledby="pack-title">
          {packs.map((p) => {
            const id = p.id.replace(/-pro$/, '');
            return (
              <button key={p.id} type="button" class="pickbtn" aria-pressed={id === chosen} onClick={() => setChosen(id)}>
                <span class="pickbtn__name">{p.meta.name}</span>
                <span class="pickbtn__meta">
                  {p.findings.length} findings · {p.assets.length} assets · {p.events.length} events
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" class="btn btn--brass btn--big" onClick={() => onStart(chosen, resolveSeed())}>
          {pro.intro.play}
        </button>
      </section>

      <details class="fold">
        <summary>{pro.intro.methodsHeading}</summary>
        <dl class="methods">
          {METHODS.map((m) => (
            <div key={m.id} class="methods__row">
              <dt>{m.name}</dt>
              <dd>{m.rule}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details class="fold">
        <summary>Rules</summary>
        <ol class="rules">
          {pro.intro.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
