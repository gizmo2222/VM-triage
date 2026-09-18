import { useState } from 'preact/hooks';
import type { ScenarioPack } from '@content/types';
import { FORMULA, METHODS, pro } from '@content/copy/pro';
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
  const seedNow = parseSeedParam(seedText) ?? seed;
  const daily = isDaily && seedNow === seed;

  return (
    <div class="intro">
      <h1 tabIndex={-1}>{pro.intro.heading}</h1>
      <p class="lede">{pro.subtitle}</p>

      <section class="panel" aria-labelledby="pack-title">
        <h2 id="pack-title">{pro.intro.pick}</h2>
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
        <p class="seedline">
          <span class="seedline__now">{daily ? pro.intro.seedDaily(seedToParam(seedNow)) : pro.intro.seedCustom(seedToParam(seedNow))}</span>
          <span class="muted small">{pro.intro.seedHint}</span>
        </p>
        <div class="startrow">
          <label class="field field--inline">
            <span class="field__label">{pro.intro.custom}</span>
            <input type="text" value={seedText} autoComplete="off" onInput={(e) => setSeedText((e.target as HTMLInputElement).value)} />
          </label>
          <button type="button" class="btn btn--brass btn--big" onClick={() => onStart(chosen, resolveSeed())}>
            {pro.intro.play}
          </button>
        </div>
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
        <h3 class="formula__heading">{FORMULA.heading}</h3>
        <ol class="formula">
          {FORMULA.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
        <p class="muted small">{FORMULA.note}</p>
      </details>

      <details class="fold">
        <summary>{pro.intro.rulesHeading}</summary>
        <ol class="rules">
          {pro.intro.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
