# triage-game

A vulnerability triage sim. One engine, two skins.

You have a backlog of security problems, a budget that covers a fraction of them each round, and hidden dice that decide which of the rest get exploited. At the end you see how your year went and how it would have gone with a different order. The lesson: you can't fix everything, so the order is the whole game.

- **`/`** — smallbiz skin. Five minutes, four rounds, no jargon. The FlintScope lead magnet.
- **`/pro/`** — practitioner skin. Stub only; see [skins/pro/README.md](skins/pro/README.md).

Static site. No backend, no accounts, no analytics, no network calls at runtime. The only state that leaves the browser is the seed in the URL when someone shares a run.

## Run it

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Print the balance table while tuning:

```bash
BALANCE_REPORT=1 npm test
```

## Layout

```
engine/    pure TypeScript, no DOM, seeded PRNG, fully unit tested
content/   scenario packs and all player-facing copy
skins/     smallbiz (Preact), pro (stub), shared helpers
```

Read [engine/types.ts](engine/types.ts) first. Everything else follows from it.

## How the engine works

- **All randomness happens in `createGame`.** Ground truth is rolled once from the seed: a true exploitability per finding, one uniform roll per finding per round, and the event deck order. Play is then fully deterministic from truth plus choices. Every counterfactual strategy faces the same dice.
- **Visible scores are estimates.** True likelihood is the visible likelihood plus seeded noise. That is what keeps any single score from being an oracle.
- **Exploited findings burn.** An incident removes the finding from the backlog and charges its fix cost against next round's capacity. Bad early ordering compounds.
- **Strategies are pure rankers.** Six are built in. Greedy fill under capacity, not a knapsack.
- **The balance test is the gate.** 500 seeds per scenario. Fails if any strategy wins more than 70 percent overall or never wins a scenario. Every tuning constant lives in `engine/tuning.ts`.

## Things to change

- **CTA link and copy:** [skins/smallbiz/config.ts](skins/smallbiz/config.ts)
- **Brand colours and fonts:** [skins/smallbiz/theme.css](skins/smallbiz/theme.css)
- **Plain-language findings:** [content/scenarios/dental.ts](content/scenarios/dental.ts) and [content/scenarios/manufacturer.ts](content/scenarios/manufacturer.ts). Rewrite titles freely. Changing numbers or tags means re-running the balance test.
- **Adding a business:** copy a pack, give it a new `id`, set `meta.people` and `meta.audit` to the words that business would use, and add it to `allPacks` in [content/index.ts](content/index.ts). The balance test picks it up automatically.
- **UI strings:** [content/copy/smallbiz.ts](content/copy/smallbiz.ts)

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the tests, builds with `BASE_PATH=/<repo>/`, and publishes to GitHub Pages. Enable Pages with source "GitHub Actions" in the repo settings once.
