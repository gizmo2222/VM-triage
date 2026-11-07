# triage-game

A vulnerability triage simulation: a backlog of security problems, a budget that covers a fraction of them each round, and seeded hidden dice that decide which of the rest get exploited. One pure TypeScript engine, two Preact skins. The small-business skin ("What First") is the published one, a five-minute lead magnet for FlintScope at https://flintscope.com/game/. The practitioner skin at `/pro/` is parked: it runs in dev but is left out of builds unless `GAME_PRO=1`. Static site: no backend, no accounts, no analytics, no network calls at runtime. README.md explains the engine's design; `.impeccable.md` holds the design context.

## Build, run, test (Windows PowerShell 5.1)

Node 22 or newer (CI uses 22). Each block is one command.

```powershell
npm install
```
```powershell
npm run dev
```
Dev server on http://localhost:5173 (`.claude/launch.json` config `dev` pins the port). `/` is the small-business skin, `/pro/` the practitioner skin.

```powershell
npm test
```
Vitest, 13 files and 116 tests, about 15 seconds. The balance test (500 seeds per scenario, all strategies, both configurations) is the slow part and is the gate on any change to findings, events or `engine/tuning.ts`. One file:
```powershell
npx vitest run engine/__tests__/game.test.ts
```
Balance tables (writes `balance-report-<scenario>.txt` to the repo root, git-ignored):
```powershell
$env:BALANCE_REPORT = '1'; npm test; Remove-Item Env:BALANCE_REPORT
```
Typecheck only, and the production build (typecheck then Vite into `dist/`):
```powershell
npm run typecheck
```
```powershell
npm run build
```
Build with the pro skin, or at the deploy base path:
```powershell
$env:GAME_PRO = '1'; npm run build; Remove-Item Env:GAME_PRO
```
```powershell
$env:BASE_PATH = '/game/'; npm run build; Remove-Item Env:BASE_PATH
```
There is no deploy step here. The FlintScope site repo checks out `main`, runs the tests, builds with `BASE_PATH=/game/` and syncs `dist/` to the server.

Playtest links (both skins): `?b=<pack>&s=<seed>&fix=q1:id,id;q2:id&auto=<strategy>&debug=1`. `fix` scripts quarters and stops at the first unscripted one, `auto` plays the rest with a strategy, `debug` prints each card's hidden exploit odds. Finding ids are the first argument of each `f(...)` in a pack file.

## Rules of the codebase

- All randomness happens once in `createGame`; play is deterministic from truth plus choices, and every counterfactual strategy faces the same dice.
- Every tuning constant lives in `engine/tuning.ts`. Changing numbers or tags in a pack means re-running the balance test.
- Every player-facing string lives in `content/`, never in components. The small-business skin must never show CVE, CVSS, EPSS, KEV or similar jargon; `content/__tests__/packs.test.ts` and `skins/smallbiz/screens.test.tsx` fail on it.
- Brand tokens live in `skins/smallbiz/theme.css`; `theme.test.ts` fails if a text pairing drops under 4.5:1.
- Mobile first, keyboard playable, nothing carried by colour alone, reduced motion respected. No state library.
- Imports use the aliases `@engine`, `@content`, `@skins` (set in both Vite configs and tsconfig).

## Doc map (short)

The full map with every symbol is [docs/doc-map.md](docs/doc-map.md). Line numbers are as of 2026-11-07; confirm with `grep -n` before relying on one.

### Engine, `engine/` (pure TS, no DOM; about 1,180 lines plus 730 of tests)
- `types.ts` (254): all shared types. `Finding` L23-44, `EventEffect` L48-60, `GameEvent` L62-71, `Scenario` L96-103, `StrategyId`/`STRATEGY_IDS` L107-131, `GroundTruth` L154-161, `GameState` L200-223, `Game` L226-229, `Scorecard` L247-254.
- `game.ts` (353): lifecycle. `validateScenario` L27-71, `rollTruth` L86-105, `createGame` L182-203, `commitFixes` L220-261, `nextRound` L264-274, `autoPick` L277, `rankBacklog` L282, `commitScripted` L291-299, `runScript` L302-314, `runStrategy` L317-324, `summarize` L326-348.
- `resolve.ts` (126): `exploitProbability` L16-31, `impactOf` L34-47, `resolveRound` L74-126.
- `strategies.ts` (157): eight rankers L40-123 (`severityFirst`, `threatFirst`, `assetFirst`, `complianceFirst`, `cheapestFirst`, `likelihoodFirst`, `ssvc`, `blended`), `blendedScore` L105-115, `STRATEGIES` L125-134, `pickUnderCapacity` L146-157 (greedy, not a knapsack).
- `scorecard.ts` (155): `buildScorecard` L9-25, `longRun` L39-57, `replayGrade` L82-106, `winnersForSeed` L112-125, `replayLuck` L142-155.
- `prng.ts` (65): `mulberry32` L16-25, `createRng` L27-45, `seedFromString` L48-55 (FNV-1a), `normaliseSeed` L58-65.
- `tuning.ts` (34): `TUNING` L6-32 (baseRate 0.22, maxRoundProbability 0.9, exposure factors, KEV multiplier 1.8, likelihood noise 0.3, impact table), `SENSITIVITY_WEIGHT` L34.
- `index.ts` (39): barrel for everything above.
- Tests: `game.test.ts` (322) lifecycle and scoring; `balance.test.ts` (110) the gate: 500 seeds, no strategy wins over 70% overall, every strategy wins somewhere, blended has the lowest mean cost in every scenario, no instinct tops over 40% of seeds; `strategies.test.ts` (92); `prng.test.ts` (75); `replay.test.ts` (44); `fixture.ts` (86) shared scenario fixture.

### Content, `content/` (packs and copy; about 1,700 lines plus 100 of tests)
- `types.ts` (69): `ScenarioMeta` L8-50, `ScenarioPack` L52-57, `applyHeadlines` L59-69.
- `index.ts` (18): `allPacks` L9, `scenarios` L12, `getPack` L14, `defaultPackId` L18 (dental).
- `pro.ts` (29): `PRO_CONFIG` L10 (8 rounds, 5 points, event from round 1), `toPro` L12-19, `proPacks` L21.
- `scenarios/dental.ts`, `manufacturer.ts`, `ecommerce.ts` (386-387 each, identical shape): `assets` ~L15-26, builder `f(...)` ~L27-49, 30 `findings` ~L49-188, event-added asset ~L190-197, 7 `events` ~L198-279 (the `new-*` event adds 2 findings), `base` with config and `meta` ~L280-350, `headlines` ~L351-385, export on the last line.
- `copy/smallbiz.ts` (234): `SMALLBIZ_STRATEGY_IDS` L11-18, `sortChipsFor` L20-36, `strategyNamesFor` L38-49, `copy` L55-204 (intro L59, round L77, reveal L107, report L131), `gradeForRatio` L221.
- `copy/pro.ts` (175): `METHODS` L17-32, `FORMULA` L37-48 (published blended weights, checked by `formula.test.ts`), `pro` L50-173.
- Tests: `packs.test.ts` (45) validation, jargon regex L7, headline length, icon ids, voice and cash; `formula.test.ts` (53) published formula equals `blendedScore`.

### Small-business skin, `skins/smallbiz/` (served at `/`; about 1,900 lines of TSX plus 1,600 of CSS)
- `main.tsx` (15) mounts; `App.tsx` (172): state and URL sync, `start` L55, `commit` L67, `advance` L76, screens rendered L~110-172. Screen order Intro, Round, RoundResult, ReportCard.
- `config.ts` (35): CTA L8-26 and footer L29-35. `hooks.ts` (62): `usePrefersReducedMotion` L3-22, `useAnimatedNumber` L25-62 (unused). `reveal.ts` (65): `startReveal` L27-65, the timed month-by-month reveal.
- `screens/Intro.tsx` (90) `Intro` L16; `screens/Round.tsx` (282) `Round` L24, `toggle` L75, `useChip` L84, `clear` L90, `closePanel` L97, `odds` L127; `screens/RoundResult.tsx` (202) `RoundResult` L26, reveal effect L55; `screens/ReportCard.tsx` (266) `samePicks` L29-37, `ReportCard` L39.
- `components/`: `FindingCard` (63), `BusinessMap` (78), `CashPile` (67, own tween L21), `LuckStrip` (54), `Icon` (56, `ICONS` map L6-28), `QuarterPips` (18), `ShareImage` (248, canvas `draw` L35-153, 1200x630).
- `theme.css` (58): brand tokens. `app.css` (1546): sections Base L3, Shell L109, Cards L154, Buttons L231, Intro L293, Round head L409, Round grid L515, Event slip L532, Chips L579, Map L621, Panel L757, Picks strip L917, Commit bar L972, Reveal L1008, Report L1109, Luck strip L1146, Motion L1529. Breakpoints: min-width 900px (L115, L520, L775, L997), 560px (L628), pointer coarse L1355. Motion is opt-in under `prefers-reduced-motion: no-preference` (five blocks); no forced-colors block.
- Tests: `screens.test.tsx` (94) renders every pack through a whole game with no jargon; `reveal.test.ts` (57) skip and stop semantics; `theme.test.ts` (54) contrast.

### Shared helpers, `skins/shared/` (about 150 lines plus 80 of tests)
- `seed.ts` (68): `parseSeedParam` L19-30 (1-7 base36 chars up to 0xffffffff, else FNV hash of the word), `readUrl` L32-37 (`b`/`business`, `s`/`seed`), `seedToParam` L39, `buildUrl` L43-50, `writeUrl` L52-56, `randomSeed` L58, `dailySeed` L65-68 (UTC date hash; pro only).
- `format.ts` (23): `dollars`, `count`, `days`, `plural` (unused).
- `playtest.ts` (60): `readPlaytest` L21-38 (`fix`, `auto`, `debug` grammar), `hasPlaytest` L40, `applyPlaytest` L45-60.
- Tests: `seed.test.ts` (43), `playtest.test.ts` (34).

### Practitioner skin, `skins/pro/` (served at `/pro/`, dev only; about 850 lines of TSX plus 790 of CSS)
- `App.tsx` (134): `App` L26-134, daily seed default, `baseIdOf` L24. Screens: `ProIntro` (85), `ProRound` (158, `useMethod` L60-69, `rowTags` L38-49), `ProResult` (78), `ProReport` (242, `MISS` L21, replay grade, 200-year long run, ground-truth table). Components: `FindingTable` (114, cards under 700px), `Pips` (18). `pro.css` (787): one breakpoint `max-width: 699px` L627, reduced-motion block L31.
- Tests: `screens.test.tsx` (44) full 8-sprint game per pack. `README.md` describes the skin.

## Known loose ends (as of phase 1, not yet acted on)

- Unused exports: `useAnimatedNumber` (skins/smallbiz/hooks.ts:25), `plural` (skins/shared/format.ts:21), `ordinal` and `ratioToBest` (content/copy/smallbiz.ts:206, :230).
- Stale comment: `longRun` in engine/scorecard.ts says "200 seeds x 6 strategies"; there are eight strategies.
- `isDaily` is computed two different ways in skins/pro/App.tsx:84 and :114; ProIntro.tsx:17-18 computes the resolved seed twice.
- Fifteen open design and gameplay notes in docs/SWEEP-2026-11.md from line 62 (unknown `?b=` silently falls back, reveal Skip below the fold on phones, Back or Reload drops the game, and more).

## Overhaul

A ten-phase quality pass runs across sessions; the ledger is [docs/overhaul-state.md](docs/overhaul-state.md). Read it before working on an `overhaul/phase-N` branch.
