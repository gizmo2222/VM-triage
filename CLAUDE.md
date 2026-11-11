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
Vitest, 27 files and 385 tests, about 6 seconds warm (up to 25 cold). DOM tests (screens, components, App flows) run under happy-dom, chosen per file by a `// @vitest-environment happy-dom` docblock; the rest run in Node. The balance test (500 seeds per scenario, all strategies, both configurations) is the slow part and is the gate on any change to findings, events or `engine/tuning.ts`. One file:
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
- Builds carry a strict Content-Security-Policy meta tag (`build/csp.ts`, build only; `connect-src 'none'`). New runtime needs such as a fetch, an external font or an inline script must change that policy and its test.
- Imports use the aliases `@engine`, `@content`, `@skins` (set in both Vite configs and tsconfig).

## Doc map (short)

The full map with every symbol is [docs/doc-map.md](docs/doc-map.md). Line numbers are as of 2026-11-11 (overhaul phase 9); confirm with `grep -n` before relying on one.

### Engine, `engine/` (pure TS, no DOM; about 1,160 lines plus 1,180 of tests)
- `types.ts` (256): all shared types. `Finding` L23-44, `EventEffect` L48-60, `GameEvent` L62-71, `Scenario` L98-105, `StrategyId`/`STRATEGY_IDS` L109-129, `GroundTruth` L156-163, `GameState` L202-225, `Game` L228-231, `Scorecard` L249-256.
- `game.ts` (349): lifecycle. `validateScenario` L26-72, `rollTruth` L87-106, `createGame` L183-204, `commitFixes` L221-262, `nextRound` L265-275, `autoPick` L278, `rankBacklog` L283, `commitScripted` L292-301, `playOut` L304, `runScript` L313-320, `runStrategy` L323-325, `summarize` L327-349.
- `resolve.ts` (126): `exploitProbability` L16-31, `impactOf` L34-47, `resolveRound` L74-126.
- `strategies.ts` (154): eight rankers L40-120 (`severityFirst` L40, `threatFirst` L46, `assetFirst` L53, `complianceFirst` L61, `cheapestFirst` L67, `likelihoodFirst` L73, `ssvc` L94, `blended` L117), `blendedScore` L105-115, `STRATEGIES` L122-131, `pickUnderCapacity` L143-154 (greedy, not a knapsack).
- `scorecard.ts` (145): `buildScorecard` L9, `longRun` L39, `longRunOrder` L60, `replaySeeds` L75, `replayGrade` L92-115, `replayLuck` L132-145 (ties count as half).
- `prng.ts` (55): `mulberry32` L16-25, `createRng` L27-45, `seedFromString` L48-55 (FNV-1a).
- `tuning.ts` (38): `TUNING` L7-33 (baseRate 0.22, maxRoundProbability 0.9, exposure factors, KEV multiplier 1.8, likelihood noise 0.3, impact table), `SENSITIVITY_WEIGHT` L35.
- `index.ts` (37): barrel for everything above.
- Tests: `game.test.ts` (322) lifecycle and scoring; `balance.test.ts` (110) the gate: 500 seeds, no strategy wins over 70% overall, every strategy wins somewhere, blended has the lowest mean cost in every scenario, no instinct tops over 40% of seeds; `edges.test.ts` (264) edge cases; `scorecard.test.ts` (153); `strategies.test.ts` (92); `prng.test.ts` (61); `robust.test.ts` (48); `replay.test.ts` (44); `fixture.ts` (86) shared scenario fixture.

### Content, `content/` (packs and copy; about 1,720 lines plus 500 of tests)
- `types.ts` (69): `ScenarioMeta` L8-50, `ScenarioPack` L52-56, `applyHeadlines` L59-69.
- `index.ts` (16): `allPacks` L7, `scenarios` L10, `getPack` L12, `defaultPackId` L16 (dental).
- `pro.ts` (33): `PRO_CONFIG` L10 (8 rounds, 5 points, event from round 1), `toPro` L12, `proPacks` L21, `getProPack` L24, `baseIdOf` L30, `defaultProPackId` L33.
- `scenarios/dental.ts`, `manufacturer.ts`, `ecommerce.ts` (389 each, identical shape): `f(...)` builder from `scenarios/builder.ts` (24), `assets` ~L16-27, 30 `findings` ~L28-167, event-added asset ~L168-176, 7 `events` ~L177-280 (the `new-*` event adds 2 findings), `base` with config, `economics.auditAllowance` and `meta` L282-352, `headlines` L354-387, export L389.
- `copy/smallbiz.ts` (235): `SMALLBIZ_STRATEGY_IDS` L11-18, `sortChipsFor` L27-35, `strategyNamesFor` L38, `copy` L55-211 (intro L59, round L78, reveal L115, report L143), `ordinal` L214, `gradeForRatio` L229.
- `copy/pro.ts` (177): `METHODS` L17-32, `FORMULA` L37-48 (published blended weights, checked by `formula.test.ts`), `pro` L50-174.
- Tests: `copy.test.ts` (379) copy builders for both skins; `packs.test.ts` (45) validation, jargon regex L7, headline length, icon ids, voice and cash; `formula.test.ts` (53) published formula equals `blendedScore`; `events.test.ts` (27) event copy per pack.

### Small-business skin, `skins/smallbiz/` (served at `/`; about 1,860 lines of TSX plus 1,670 of CSS)
- `main.tsx` (15) mounts; `App.tsx` (182): state and URL sync, `start` L65, `commit` L77, `advance` L86, screens rendered L115-181. Screen order Intro, Round, RoundResult, ReportCard.
- `config.ts` (35): CTA L8-26 and footer L29-35. `hooks.ts` (22): `usePrefersReducedMotion` L3-22. `reveal.ts` (69): `startReveal` L27-69, the timed month-by-month reveal.
- `screens/Intro.tsx` (100) `Intro` L17; `screens/Round.tsx` (339) `Round` L24, `toggle` L72, `useChip` L82, `clear` L89, `closePanel` L96, `removePick` L102, `odds` L139; `screens/RoundResult.tsx` (214) `RoundResult` L27, reveal effect L56; `screens/ReportCard.tsx` (282) `samePicks` L29-37, `ReportCard` L51.
- `components/`: `FindingCard` (65, `findingTitle` L15), `BusinessMap` (88, `exploitsByAsset`, `openOn`), `CashPile` (75, own tween L23), `LuckStrip` (56), `Icon` (56, `ICONS` map L6-28), `QuarterPips` (18), `ShareImage` (248, canvas `draw` L36-153, 1200x630).
- `theme.css` (55): brand tokens, `:root` L5-55. `app.css` (1611): sections Base L3 (skip link L108), Shell L139, Cards L184, Buttons L261, Intro L323, Round head L436, Round grid L543, Event slip L560, Chips L602, Map L644, Panel L788, Picks strip L951, Commit bar L1006, Reveal L1042, Report L1148, Motion L1582, Forced colours L1601. Breakpoints: min-width 900px (L16, L145, L548, L806, L1031), 560px (L651), max-width 559px (L1531), pointer coarse L1403. Motion is opt-in under `prefers-reduced-motion: no-preference` (five blocks); `forced-colors: active` block L1603.
- Tests: `components/components.test.tsx` (702), `screens/Round.test.tsx` (365), `screens/RoundResult.test.tsx` (283), `App.flow.test.tsx` (176), `screens.test.tsx` (151) renders every pack through a whole game with no jargon, `reveal.test.ts` (67) skip and stop semantics, `theme.test.ts` (55) contrast, `App.test.tsx` (24).

### Shared helpers, `skins/shared/` (about 150 lines plus 270 of tests)
- `seed.ts` (68): `parseSeedParam` L19-30 (1-7 base36 chars up to 0xffffffff, else FNV hash of the word), `readUrl` L32-37 (`b`/`business`, `s`/`seed`), `seedToParam` L39, `buildUrl` L43-50, `writeUrl` L52-55, `randomSeed` L58, `dailySeed` L65-68 (UTC date hash; pro only).
- `format.ts` (19): `dollars` L4, `count` L8, `days` L13.
- `playtest.ts` (60): `readPlaytest` L21-38 (`fix`, `auto`, `debug` grammar), `hasPlaytest` L40, `applyPlaytest` L45-60.
- Tests: `url.test.ts` (98), `playtest.test.ts` (68), `format.test.ts` (57), `seed.test.ts` (43).

### Practitioner skin, `skins/pro/` (served at `/pro/`, dev only; about 850 lines of TSX plus 790 of CSS)
- `App.tsx` (140): `App` L31-140, daily seed default. Screens: `ProIntro` (86), `ProRound` (157, `rowTags` L38, `applyMethod` L60-69), `ProResult` (78), `ProReport` (243, `MISS` L21, replay grade, 200-year long run, ground-truth table). Components: `FindingTable` (114, cards under 700px), `Pips` (18). `pro.css` (791): one breakpoint `max-width: 699px` L631, reduced-motion block L31.
- Tests: `flow.test.tsx` (208) App flow; `screens.test.tsx` (44) full 8-sprint game per pack. `README.md` describes the skin.

### Build, `build/`
- `csp.ts` (40): the CSP policy, `cspTag`, `cspPlugin` (build only). Test `csp.test.ts` (30).

## Known loose ends (as of phase 9)

[docs/overhaul-summary.md](docs/overhaul-summary.md) lists everything the overhaul left open and the top ten next steps. In short: the risky clean-ups (docs/overhaul-findings.md, "Phase 5"), CI actions pinned to tags rather than SHAs, `frame-ancestors` for the FlintScope server, and the open design notes in docs/SWEEP-2026-11.md from line 62.

## Overhaul

A ten-phase quality pass runs across sessions; the ledger is [docs/overhaul-state.md](docs/overhaul-state.md) and the outcome is [docs/overhaul-summary.md](docs/overhaul-summary.md). Read the ledger before working on an `overhaul/phase-N` branch.
