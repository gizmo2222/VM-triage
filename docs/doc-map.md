# Doc map

Every source file, its purpose, and line ranges for the key symbols. Written in overhaul phase 1 (2026-11-07) against `main` at 6f9b078; refreshed in phase 9 (2026-11-11) against `overhaul/phase-8` at 30f0c98. Line numbers drift as code changes: confirm with `grep -n` before relying on one. The short version lives in [CLAUDE.md](../CLAUDE.md).

Source size at the phase 9 refresh: about 12,300 lines in engine, content, skins and build, of which about 2,460 are CSS and about 4,050 are tests and fixtures.

## Engine (`engine/`)

Pure TypeScript, no DOM. A seed goes into `createGame`, which rolls all ground truth once (true likelihood per finding, one uniform roll per finding per round, event deck order); each round the player (or a strategy ranker) commits fixes under capacity and `resolveRound` exploits findings whose roll is under their probability; a finished game goes to `buildScorecard` / `replayGrade` / `replayLuck` / `longRun`, which compare the player against every strategy on the same dice.

### engine/types.ts (256 lines)
All shared types; no logic except `STRATEGY_IDS`.
- `Id` L8: string alias for ids.
- `Sensitivity` L11: 'none' | 'internal' | 'customer' | 'regulated'.
- `Asset` L13-21: a business asset (criticality, sensitivity, records, exposure).
- `Finding` L23-44: a vulnerability card (severity, visible likelihood, cost, tags, compliance, known-exploited, asset ref).
- `EventEffect` L48-60: union of event effects (likelihoodBoost, capacityDelta, audit, addAsset, markKnownExploited, setExposure ...); end line approximate.
- `GameEvent` L62-71: a scheduled news event wrapping an effect, with duration and tags.
- `Economics` L75-86: dollar figures used by `impactOf`.
- `ScenarioConfig` L88-96: rounds, capacity, first event round, etc.
- `Scenario` L98-105: assets + findings + events + config + economics + meta.
- `StrategyId` L109-117: union of the eight strategy ids.
- `STRATEGY_IDS` L120-129: readonly array of all eight ids (end line approximate).
- `RankContext` L135-137: ranker input carrying active modifiers.
- `Ranker` L140: `(findings, assets, ctx?) => Finding[]`.
- `Strategy` L142-145: id + ranker.
- `GroundTruth` L156-163: seeded truth: true likelihoods, per-round rolls, event deck.
- `Impact` L167-173: downtime, records, dollars for one incident.
- `Incident` L175-183: an exploited finding in a round, with its impact.
- `ActiveModifier` L185-189: a durational event effect still in force.
- `Phase` L191: 'choose' | 'resolved' | 'finished'.
- `RoundRecord` L193-200: what was fixed, what burned, audit result for one round.
- `GameState` L202-225: backlog, assets, round, capacity, debt, modifiers, history.
- `Game` L228-231: state + truth + seed.
- `OutcomeTotals` L235-238: Impact plus incidentCount.
- `OutcomeSummary` L240-247: totals and totalCost of a finished game.
- `Scorecard` L249-256: player vs each strategy, rank/grade.

### engine/game.ts (349 lines)
Game lifecycle: validation, creation, round commit/advance, scripted and strategy play.
- `validateScenario` L26-72: throws on inconsistent scenarios (duplicate ids, unaffordable finding, bad refs); also used by content tests.
- `allFindings` L77-85: scenario findings plus event-added ones.
- `rollTruth` L87-106 (private): all seeded randomness; optional deck override keeps the same dice.
- `computeCapacity` L110-117 (private): base capacity + modifiers - emergency debt, floored at `minCapacity`.
- `applyImmediate` L119-146 (private): applies addAsset/markKnownExploited/setExposure effects.
- `beginRound` L153-171 (private): draws the round's event, expires modifiers, sets capacity.
- `CreateOptions` L175-181: options for `createGame` (deck override).
- `createGame` L183-204: seed -> Game in round 1, 'choose' phase.
- `costOf` L207-215: capacity cost of a set of findings.
- `commitFixes` L221-262: validates picks, resolves the round, records it, accrues debt, finishes after the last round.
- `nextRound` L265-275: 'resolved' -> next 'choose'.
- `autoPick` L278-280: ids a strategy would fix this round.
- `rankBacklog` L283-285: a strategy's ranked backlog with this round's events.
- `commitScripted` L292-301: forgiving commit of a scripted pick list (skips burned/unaffordable).
- `runScript` L313-320: play a whole game from per-round scripts.
- `runStrategy` L323-325: play a whole game with one strategy (the counterfactual).
- `summarize` L327-349: Game -> OutcomeSummary.

### engine/resolve.ts (126 lines)
Round resolution: exploit odds and impact maths.
- `exploitProbability` L16-31: trueLikelihood * baseRate * exposure * KEV * event boosts, capped at `maxRoundProbability`.
- `impactOf` L34-47: downtime, records and dollars for a finding on an asset.
- `ResolveInput` L53-60: inputs to `resolveRound`.
- `ResolveResult` L62-68: exploited incidents and round outcome.
- `resolveRound` L74-126: rolls each open finding against its probability, builds incidents, audit outcome, emergency debt.

### engine/strategies.ts (154 lines)
Eight pure rankers plus greedy capacity fill.
- `byKeys` L21-35 (private): builds a multi-key comparator with stable tie-break.
- `severityFirst` L40-43: severity desc.
- `threatFirst` L46-50: known-exploited, then likelihood.
- `assetFirst` L53-58: asset criticality, then severity.
- `complianceFirst` L61-64: compliance items first.
- `cheapestFirst` L67-70: cost asc, then severity.
- `likelihoodFirst` L73-76: likelihood only (EPSS-style).
- `ssvcTier` L83-92: SSVC-style decision tier for a finding.
- `ssvc` L94-98: ranker on `ssvcTier`.
- `blendedScore` L105-115: blended score; reads active events via ctx.
- `blended` L117-120: ranker on `blendedScore`; the only strategy that uses events.
- `STRATEGIES` L122-131: Record of all eight `Strategy` objects.
- `getStrategy` L133-137: lookup by id.
- `pickUnderCapacity` L143-154: greedy fill, not a knapsack.

### engine/scorecard.ts (145 lines)
Post-game comparison and long-run / replay statistics.
- `buildScorecard` L9-25: requires a finished game; ranks the player against every strategy on the same seed.
- `LongRunRow` L27-32: meanCost + winShare.
- `longRun` L39-57: all strategies over seeds 1..n.
- `longRunOrder` L60-62: strategy ids sorted by mean cost.
- `ReplayGrade` L64-72: yourMean, strategyMeans, ratio, years.
- `replayGrade` L92-115: replays the player's picks as a script through `years` fresh-dice years; ratio vs best strategy mean.
- `ReplayLuck` L117-125: sorted replay costs + share of replays costlier than the real year.
- `replayLuck` L132-145: where the actual year sits in the replay distribution (default 100 years); feedback only.

### engine/prng.ts (55 lines)
Seeded randomness.
- `Rng` L7-14: interface with `next`, `int`, `shuffle`.
- `mulberry32` L16-25: seed -> uniform [0,1) generator.
- `createRng` L27-45: wraps mulberry32 into an `Rng`.
- `seedFromString` L48-55: FNV-1a 32-bit string -> uint32.

### engine/tuning.ts (38 lines)
Every magic number. Balance test gates changes.
- `TUNING` L7-33:
  - `baseRate` 0.22
  - `maxRoundProbability` 0.9
  - `exposureFactor` { exposed: 1.0, internal: 0.25 }
  - `knownExploitedMultiplier` 1.8
  - `likelihoodNoise` 0.3
  - `likelihoodFloor` 0.02
  - `minCapacity` 1
  - `maxEmergencyDebt` 2
  - `impact.downtimeDaysByCriticality` [0, 0.25, 0.5, 1, 2, 4]
  - `impact.downtimeSeverityMin` 0.4
  - `impact.downtimeSeveritySpan` 0.8
  - `impact.recordsFraction` { none: 0, internal: 0, customer: 0.35, regulated: 0.5 }
  - `impact.dollarsPerSeverityPoint` 350
- `SENSITIVITY_WEIGHT` L35: { none: 0.2, internal: 0.5, customer: 0.8, regulated: 1.0 }.
- `BLENDED_AUDIT_BONUS` (end of file): 0.12, score bonus for items an open audit asks about; moved here from strategies.ts.

### engine/index.ts (37 lines)
Barrel: re-exports all of types, prng, tuning, strategies, resolve, game and scorecard (public API of the engine). Does not re-export `ResolveInput` / `ResolveResult`.

### engine/__tests__/game.test.ts (322 lines)
validateScenario, createGame, commitFixes (capacity, exploit rolls, emergency debt, finish), events, impactOf, autoPick/runStrategy, buildScorecard, deck override, script replay, replayGrade, replayLuck, longRun.

### engine/__tests__/balance.test.ts (110 lines)
Balance gate over `[...smallbizScenarios, ...proPacks]` (from `@content`), 500 seeds per scenario (`SEEDS = 500`), all strategies via `runStrategy`. Gates:
- No strategy wins more than 70% of seeds overall (`MAX_SHARE = 0.7`, ties split).
- Every strategy wins at least one seed (wins > 0) in every scenario.
- `blended` mean cost is strictly lower than every other strategy's in every scenario.
- No non-blended strategy is top or tied-top in more than 40% of seeds in any scenario (`MAX_TOP_SHARE = 0.4`).
- Plus a sanity check that at least one scenario exists.

`BALANCE_REPORT`: read at L61 via `process.env.BALANCE_REPORT` inside the test 'prints a report when BALANCE_REPORT is set' (L60). If set, it writes `balance-report-<scenario id>.txt` (win share, top share, mean cost, mean incidents) to the cwd. Documented at balance.test.ts:21 and README.md:30. Without it the test returns immediately.

### engine/__tests__/strategies.test.ts (92 lines)
Each ranker's ordering (severity, threat, asset, compliance, cheapest, likelihood, ssvc, blended), purity and stable tie-break, unknown-asset throw, `pickUnderCapacity`.

### engine/__tests__/prng.test.ts (61 lines)
mulberry32 determinism, range and mean; createRng `int` and `shuffle`; `seedFromString` stability.

### engine/__tests__/replay.test.ts (44 lines)
Full-game reproduction from seed + choices, different seeds give different truth, every strategy deterministic on the dental pack, strategies differ on one seed.


### engine/__tests__/scorecard.test.ts (153 lines)
`buildScorecard` L18, `longRun` L61, `longRunOrder` L101, `replayGrade` L112.

### engine/__tests__/edges.test.ts (264 lines)
Edge cases added in phase 3: `validateScenario` event effects L20, `commitFixes` validation L59, `state.currentEvent` L82, durational events leave the backlog alone L89, `resolveRound` error branches L104 and audit L149, `exploitProbability` clamp L209, strategy tie-breaks and lookup L217, `pickUnderCapacity` L251.

### engine/__tests__/robust.test.ts (48 lines)
`commitScripted` duplicates L17, `validateScenario` NaN L24, `replayLuck` ties L34.
### engine/__tests__/fixture.ts (86 lines)
Test fixture, not a test: `assets` L5, `findings` L31, `events` L40, `scenario` L68, `scenarioWithOnlyEvent` L82-86.

### Markers
- No TODO, FIXME or commented-out code found in `engine/` or `engine/__tests__/`.

## Content (`content/`)

Scenario packs (dental, manufacturer, ecommerce) plus all player-facing copy for the two skins (smallbiz, pro). A pack is an engine `Scenario` (id, assets, findings, events, config) wrapped in `meta` (name, tagline, intro, IT person, audit text, icons, voice, asset notes), with short `headlines` merged in by `applyHeadlines`. Every pack has 30 findings built with `f(...)`, 2 more findings added by its `new-*` event, and 7 events.

### content/types.ts (69 lines)
Pack and meta types, plus the helper that applies headlines.
- `ScenarioMeta` L8-50: name, kind, tagline, intro[], itPersonName, people, audit{}, roundLabel, assetIcons, cashOnHand, voice{handover, quiet[], breach[], audit, emergency} (L43-49), assetNotes.
- `ScenarioPack` L52-56: `Scenario` plus `meta` and `ready` flag (false shows as coming soon).
- `applyHeadlines(pack, headlines)` L59-69: sets `headline` on every finding, including event-added ones (addAsset effects).

### content/index.ts (16 lines)
Pack registry.
- `allPacks` L7: [dental, manufacturer, ecommerce].
- `scenarios` L10: ready packs only.
- `getPack(id)` L12-14; `defaultPackId` L16 (dental).

### content/pro.ts (33 lines)
Practitioner edition configuration over the same packs.
- `PRO_CONFIG` L10: rounds 8, capacityPerRound 5, firstEventRound 1.
- `toPro(pack)` L12-19: copies a pack with PRO_CONFIG applied.
- `proPacks` L21: ready packs mapped through `toPro`.
- `getProPack(baseId)` L24-27; `baseIdOf(pack)` L30: base pack id of a pro variant (inverse of `toPro`'s id); `defaultProPackId` L33.

### content/copy/smallbiz.ts (235 lines)
All smallbiz skin strings (no jargon allowed), plus grading helpers.
- `SMALLBIZ_STRATEGY_IDS` L11-18: strategy order shown in the report.
- `SortChip`, `sortChipsFor(meta)` L27-35: sort chips for the round screen.
- `strategyNamesFor(meta)` L38-49; private `cap` L51.
- `copy` object L55-211: top-level keys `siteTitle`/`siteSubtitle` L56-57, `intro` L59 (howItWorks L66), `round` L78 (coach L108), `reveal` L115 (months L135), `report` L143 (totals L168).
- `ordinal(n)` L214; `Grade` type L220; `gradeForRatio(ratio)` L229.

### content/copy/pro.ts (177 lines)
All pro skin strings, method descriptions and the published scoring formula.
- `Method` L7, `METHODS` L17-32, `methodById` L34: strategy descriptions.
- `FORMULA` L37-48: heading, `lines` (L39), note; tested against the engine by formula.test.ts.
- `pro` object L50-174: `title`/`edition`/`subtitle` L51-53, `intro` L55 (rules L65), `round` L76 (cols L89), `result` L112, `report` L125 (nav L129, cols L131, longRunCols L142, truthCols L150), `footer` L163 (link flintscope.com L165).
- `gradeForRatio` re-export L177 from ./smallbiz.

### content/scenarios/dental.ts (389 lines)
Bright Smile Family Dental, a dental office; 30 findings plus 2 event-added, 7 events, IT person Marcus, cash 250000.
- `assets` L16-26: asset list.
- `f(id, assetId, plainTitle, techTitle, severity, likelihood, fixCost, opts{kev, compliance, tags})`: finding builder, now in `content/scenarios/builder.ts` (shared by all three packs). Line numbers below for dental, manufacturer and ecommerce are approximate, about 23 lines earlier than listed.
- `findings` L28-166: 30 `f(...)` calls.
- `hygienistLaptop` L168-175: asset added by the new-hygienist event.
- `events` L177-280: 7 events (vpn-zero-day, slow-quarter, quiet-quarter, insurance-form, invoice-phishing, new-hygienist L247 with 2 findings L257-261, billing-sync).
- `base` L282-352: id, ready, config L286 (4 rounds, economics L290), meta L297 (intro L301, audit L308, roundLabel L315, assetIcons L316, cashOnHand L328, voice L329, assetNotes L336).
- `headlines` L354-387: id to short headline map, about 31 entries.
- `dental` export L389: `applyHeadlines(base, headlines)`.

### content/scenarios/manufacturer.ts (389 lines)
Kessler Precision Machining, a machine shop; 30 findings plus 2 event-added, 7 events, IT person Dave, cash 400000.
- `assets` L17-27; `f(...)` imported from `scenarios/builder.ts`.
- `findings` L29-167: 30 `f(...)` calls.
- `newMachine` L169-176: asset added by the new-machine event.
- `events` L178-280: 7 events (vendor-tool-zero-day, rush-order, slow-quarter, customer-questionnaire, po-phishing, new-machine L248 with 2 findings L258-262, shop-floor-exposed).
- `base` L282-352: config L287, meta L298 (intro L302, audit L309, assetIcons L317, cashOnHand L329, voice L330, assetNotes L337).
- `headlines` L354-387; `manufacturer` export L389.

### content/scenarios/ecommerce.ts (389 lines)
Hollow Oak Goods, an online store; 30 findings plus 2 event-added, 7 events, IT person Priya, cash 350000.
- `assets` L17-27; `f(...)` imported from `scenarios/builder.ts`.
- `findings` L29-167: 30 `f(...)` calls.
- `newMarketplace` L169-176: asset added by the new-marketplace event.
- `events` L178-280: 7 events (payment-plugin-zero-day, peak-season, slow-quarter, processor-questionnaire, password-dump, new-marketplace L248 with 2 findings L258-262, warehouse-exposed).
- `base` L282-352: config L287, meta L298 (intro L302, audit L309, assetIcons L317, cashOnHand L329, voice L330, assetNotes L337).
- `headlines` L354-387; `ecommerce` export L389.

### content/__tests__/packs.test.ts (45 lines)
Runs per pack via `describe.each(allPacks)`: pack validates; every finding has a short jargon-free headline and jargon-free plain title (JARGON regex L7: CVE, CVSS, EPSS, KEV, RCE, TLS, MFA, etc.); event plain text is jargon-free; every asset (including event-added) has an icon and a note; pack has voice lines and cash.

### content/__tests__/formula.test.ts (53 lines)
Checks the published formula against the engine: `blendedScore` is reproduced from the published weights (L25), and `FORMULA` copy states the same constants (L46).

No TODO, FIXME or commented-out code found in `content/`.


### content/__tests__/copy.test.ts (379 lines)
`sortChipsFor` L27, `strategyNamesFor` L43, `gradeForRatio` L76, `ordinal` L99, smallbiz copy builders L110, every pack feeds the copy builders L217, pro copy L235, `content/pro` L296, `applyHeadlines` L328.

### content/__tests__/events.test.ts (27 lines)
Per pack (`describe.each` L4): event copy checks.

### content/scenarios/builder.ts (24 lines)
The `f(...)` finding builder (L4) shared by the three packs.
## Small-business skin (`skins/smallbiz/`, served at `/`)

Screen flow is Intro -> Round -> RoundResult -> ReportCard (`Screen` = intro | round | result | report). All state lives in `App.tsx` (pack id, seed, session with game, screen); the URL carries pack and seed (`b`, `s`, rewritten by `writeUrl` on every change) plus playtest params.

### index.html (repo root, 18 lines)
Entry page: title "What First", inline SVG favicon, `<div id="app">`, loads `/skins/smallbiz/main.tsx`.

### skins/smallbiz/main.tsx (15 lines)
Mounts `App` into `#app` (L15; throws if `#app` is missing, L14).

### skins/smallbiz/App.tsx (182 lines)
Top-level state, URL sync, screen switch and footer.
- `Screen` type L15: intro | round | result | report.
- `Session` interface L17-21: pack, seed, game.
- `App` L23-182: state L25-38 (packId, seed, session, screen); `start` L65, `commit` L77, `advance` L86; render L~110-172 with the four screens and the site footer.
- URL params (parsed in `@skins/shared`, called from App):
  - `b` (alias `business`) and `s` (alias `seed`): `readUrl()` at App L24 (impl `skins/shared/seed.ts` L32).
  - `fix` (`q<round>:id,id;...`), `auto` (strategy id), `debug` (`1`/`true`): `readPlaytest(window.location.search)` at App L30 (impl `skins/shared/playtest.ts` L21); `applyPlaytest` L37 builds a pre-played session when `hasPlaytest` (L32). `debug` is passed to `Round` (L137).
- Effects: `writeUrl(packId, seed)` L47-49; focus the screen heading and scroll to top on screen/round change L54-63 (skips first mount).

### skins/smallbiz/config.ts (35 lines)
Skin copy config.
- `cta` L8-26: call-to-action content used by ReportCard.
- `footer` L29-35: footer line and home/pro links (App; also exported name collides with content/copy/pro.ts, separate symbol).

### skins/smallbiz/hooks.ts (22 lines)
- `usePrefersReducedMotion` L3-22: reads and tracks the media query.

### skins/smallbiz/reveal.ts (69 lines)
Timed month-by-month reveal engine for RoundResult (no Preact).
- `MONTH_MS` L3, `BREAK_MS` L4 (exported, only used in reveal.ts), `LEAD_MS` L5.
- `RevealHandlers` L7-14, `RevealRun` L16-21 (interfaces).
- `startReveal` L27-69: schedules months and hits, returns `{skip, stop}`; finishes once.

### skins/smallbiz/theme.css (55 lines)
Brand tokens in `:root` L5-55. Tokens: --brass, --brass-deep, --brass-text, --brass-soft, --ink, --ink-soft, --slate, --slate-soft, --paper, --paper-deep, --card, --line, --good, --good-soft, --bad, --bad-soft, --warn, --warn-soft, --font-body, --font-display, --font-mono, --text, --text-sm, --text-lg, --text-xl, --text-2xl, --leading, --space-1..6, --space-8, --radius, --radius-sm, --measure, --shadow, --focus.

### skins/smallbiz/app.css (1611 lines)
Imports theme.css (L1). Section comments:
- L3 Base (includes the shared `summary` rule L52, the forced-colors focus note L71 and the in-flow "Go to Fix" skip link L108); L126 small-caps label; L139 Shell; L184 Cards and bits; L261 Buttons; L323 Intro; L436 Round head; L543 Round grid; L560 Event slip; L602 Chips; L644 Map; L788 Panel; L951 Picks strip; L1006 Commit bar; L1042 Reveal; L1148 Report (luck strip note L1185); L1582 Motion; L1601 Forced colours.
- `@media (min-width: 900px)`: L16, L145, L548, L806, L1031 (desktop two-column layouts).
- `@media (min-width: 560px)`: L651 (map).
- `@media (max-width: 559px)`: L1531 (phone replay buttons).
- `@media (pointer: coarse)`: L1403 (full-size toggle target).
- `@media (prefers-reduced-motion: no-preference)`: L743, L1136, L1268, L1459, L1583.
- `@keyframes`: shake L757, crack L775, drop L1286, grow L1465, rise L1590.
- `@media (forced-colors: active)`: L1603.
- No `prefers-reduced-motion: reduce` block (motion is opt-in via no-preference).

### skins/smallbiz/screens/Intro.tsx (100 lines)
- `KIND_ICON` L15: pack kind -> icon name.
- `Intro` L17-100: pick a business and seed text, start button; local state L17-18.

### skins/smallbiz/screens/Round.tsx (339 lines)
- `Round` L24-339: choose up to the quarter's fix budget. State selected/chip/order/active L26-29; effect L39 (reset on round), L113; helpers `toggle` L72, `useChip` L82, `clear` L89, `closePanel` L96, `removePick` L102, `odds` L139; renders BusinessMap, FindingCard list, picks strip, commit bar.

### skins/smallbiz/screens/RoundResult.tsx (214 lines)
- `RoundResult` L27-214: plays the reveal via `startReveal`; state month/revealedCount/breaking L44-46; effects L55 (run reveal), L75; hits-per-asset L93; renders BusinessMap, CashPile, hit list, next button.

### skins/smallbiz/screens/ReportCard.tsx (282 lines)
- `capitalise` L24-26.
- `samePicks` L29-37: compares two games' picks.
- `ReportCard` L51-282: final ledger by quarter (break-ins only), cost ties L65-67, LuckStrip, ShareImage data, copy-link state L116, CTA, replay buttons.

### skins/smallbiz/components/FindingCard.tsx (65 lines)
- `findingTitle` L15: shared `headline ?? plainTitle` helper (used by Round, RoundResult, ReportCard).
- `FindingCard` L17-65: one problem card; expandable (L16), picked/fits/badge/debug, aria-disabled when it will not fit.

### skins/smallbiz/components/BusinessMap.tsx (88 lines)
- `exploitsByAsset` L5 (exploited incidents per asset, optional `beforeRound`) and `openOn` L11 (open problems on an asset): shared by Round and RoundResult.
- `TileInfo` L14-22: tile data interface.
- `BusinessMap` L36-88: grid of asset tiles with shake/break states; onSelect.

### skins/smallbiz/components/CashPile.tsx (75 lines)
- `CashPile` L17-75: animated cash number (own tween L21; skips under reduced motion).

### skins/smallbiz/components/LuckStrip.tsx (56 lines)
- `LuckStrip` L20-56: 100-replay cost strip with this year's marker and median.

### skins/smallbiz/components/Icon.tsx (56 lines)
- `ICONS` L6-28: name -> SVG path map (also read by content/__tests__/packs.test.ts).
- `Icon` L37-56: renders an icon by name.

### skins/smallbiz/components/QuarterPips.tsx (18 lines)
- `QuarterPips` L8-18: progress pips for the quarters.

### skins/smallbiz/components/ShareImage.tsx (248 lines)
- `ShareRow` L5, `ShareData` L12 (exported interfaces); `W`/`H` L23-24 (1200x630).
- `token` L27-34: read a CSS custom property with fallback.
- `draw` L36-153: async canvas painter for the 1200x630 share card (`async function draw(canvas, d: ShareData)`).
- `roundRect` L155-163, `truncate` L165-170.
- `ShareImage` L176-248: renders the canvas to a PNG data URL (state src/busy/failed L178-180, effect L183).

### skins/smallbiz/screens.test.tsx (151 lines)
Render smoke tests over every pack: Intro renders (L28); a whole auto-played game through Round, RoundResult and ReportCard with no jargon terms (L34); ReportCard ledger counts break-ins only, not a failed audit (L65); FindingCard that will not fit stays focusable with aria-disabled (L89).

### skins/smallbiz/reveal.test.ts (67 lines)
`startReveal` (L19): plays every month and hit then finishes once (L23); skip cancels pending (L30); skip after end or twice does not re-finish (L41); stop cancels without finishing (L50).

### skins/smallbiz/App.test.tsx (24 lines)
App-level render test.

### skins/smallbiz/App.flow.test.tsx (176 lines)
App flow tests (intro to report, URL sync, playtest links).

### skins/smallbiz/components/components.test.tsx (702 lines)
Component tests: Icon (including fallback to monitor), FindingCard, BusinessMap, CashPile, LuckStrip, QuarterPips, ShareImage.

### skins/smallbiz/screens/Round.test.tsx (365 lines)
Round screen tests.

### skins/smallbiz/screens/RoundResult.test.tsx (283 lines)
RoundResult screen tests.

### skins/smallbiz/theme.test.ts (55 lines)
Reads theme.css and checks every listed text/background token pairing clears WCAG AA 4.5:1 (L51).

### Flags
- No TODO, FIXME or commented-out code in the skin.
- `MONTH_MS` (reveal.ts:3) and `BREAK_MS` (reveal.ts:4), `ShareRow` (ShareImage.tsx:5) are exported but never imported elsewhere.
- app.css has no forced-colors media block.

## Shared skin helpers (`skins/shared/`)

Both skins take URL seed/pack parsing, playtest URL hooks and number formatters from here.

### skins/shared/seed.ts (68 lines)
Seed and pack id live in the URL (`?b=<pack>&s=<base36>`) so a run can be shared.
- Seed parsing: `parseSeedParam` trims the input; empty, null or undefined gives `undefined`. If it matches `/^[0-9a-z]{1,7}$/i` it is lowercased and read as base36 (`parseInt(code, 36)`); if that is at most 0xffffffff (`1z141z3`) it is the seed. A 7-character code above uint32 is hashed with `seedFromString(code)` (lowercased, so case-insensitive). Anything else (longer than 7, or non-alphanumeric characters) is a word and is hashed with `seedFromString(trimmed)`, original case kept. The same function handles the `s`/`seed` URL param and the share code typed on the intro (ProIntro calls it).
- `UrlParams` L14-17: `{ packId?, seed? }`.
- `parseSeedParam` L19-30: see above.
- `readUrl` L32-37: reads `s` or `seed` through `parseSeedParam`, and `b` or `business` (trimmed, lowercased) as packId.
- `seedToParam` L39-41: `(seed >>> 0).toString(36)`, at most 7 characters, round-trips with the parser.
- `buildUrl` L43-50: share URL with only `b` and `s` set, query and hash cleared.
- `writeUrl` L52-55: `history.replaceState` to the built URL when it differs.
- `randomSeed` L58-62: `crypto.getRandomValues` uint32, not the engine PRNG.
- `dailySeed` L65-68: `seedFromString("<UTC year>-<month>-<day>")`.

### skins/shared/format.ts (19 lines)
Number and word formatters.
- `dollars` L4-6: whole USD via `Intl.NumberFormat`.
- `count` L8-10: whole number with thousands separators.
- `days` L13-19: "0 days", "half a day" under 0.75, else rounded to 0.5 ("1 day", "2.5 days").

### skins/shared/playtest.ts (60 lines)
URL playtest hooks, shared by both skins.
- `PlaytestParams` L15-19: `{ fixes: Id[][], auto?: StrategyId, debug: boolean }`.
- `readPlaytest` L21-38: grammar below.
  - `fix=q<N>:<id>,<id>;q<M>:<id>`: parts split on `;`, each must match `^q(\d+):(.*)$` after trim, N an integer 1 to 20 (others skipped). Ids split on `,`, trimmed, blanks dropped. Stored at `fixes[N-1]`, so gaps are holes.
  - `auto=<strategy>`: must be one of `STRATEGY_IDS`, otherwise ignored.
  - `debug=1` or `debug=true`: shows hidden exploit odds.
- `hasPlaytest` L40-42: true if any round has fixes or `auto` is set.
- `applyPlaytest` L45-60: loops until finished. Scripted round uses `commitScripted` (unknown or unaffordable ids skipped); else with `auto` uses `commitFixes(autoPick(...))`; else stops at the first unscripted round. Calls `nextRound` after each resolved round.

### skins/shared/seed.test.ts (43 lines)
`describe('seed params')` L4: round-trips uint32 values including all-digit base36; hashes non-base36 words; short words are case-insensitive base36; nothing gives undefined; 7-character codes above uint32 are hashed, not wrapped. `describe('readUrl')` L36: pack ids match case-insensitively.

### skins/shared/playtest.test.ts (68 lines)
`describe('playtest hooks')` L6: parses fix, auto and debug; replays scripted quarters, skips unknown or unaffordable ids, stops at the first unscripted quarter; autoplays to the end with a strategy.


### skins/shared/format.test.ts (57 lines)
`dollars` L4, `count` L19, `days` L31.

### skins/shared/url.test.ts (98 lines)
`buildUrl` L14, `writeUrl` L29, `randomSeed` L62, `dailySeed` L83.
## Practitioner skin (`skins/pro/`, served at `/pro/`, dev only unless GAME_PRO=1)

Flow is intro (pack + seed) -> round (pick a method, choose fixes) -> result -> round ... -> report, using the `-pro` pack variants (`@content/pro`) and `@content/copy/pro`. Differs from smallbiz by 8 sprints, a methodology picker over a ten-column findings table, a UTC daily seed by default, and a debrief with replay grade, 200-year long run and ground truth.

### pro/index.html (18 lines)
Entry page for `/pro/`: meta description, dark color-scheme, `#app`, loads `/skins/pro/main.tsx`.

### skins/pro/main.tsx (13 lines)
Imports fontsource (Spectral, IBM Plex Sans/Mono) and `pro.css`, renders `App` into `#app` (throws if missing).

### skins/pro/App.tsx (140 lines)
Root state machine for the pro skin.
- `Screen` L14: `'intro' | 'round' | 'result' | 'report'`.
- `Session` L16-22: `{ pack, baseId, seed, game }`.
- `App` L31-140: initial pack and seed from `readUrl` (seed falls back to `dailySeed()`), playtest hooks start mid-game or at report, `start`/`commit`/`advance` callbacks, URL sync via `writeUrl`, focuses `h1` and scrolls to top on screen or round change, builds scorecard when finished, renders masthead, active screen, footer.

### skins/pro/screens/ProIntro.tsx (86 lines)
- `ProIntro` L15-86: pack picker, seed text box (prefilled with `seedToParam`, parsed by `parseSeedParam`, falls back to current seed), daily-seed notice, start button.

### skins/pro/screens/ProRound.tsx (157 lines)
- `ProRound` L17-157: one sprint. Holds selected set, method, row order, show-more state. Computes budget left, loss to date, audit flag, tag boosts, per-row event tags (`rowTags`, L38-49), `toggle` L51, `applyMethod` L60-69 (sets selection from `autoPick` and order from `rankBacklog`), debug `odds` L71-76, primary and secondary method pills from `METHODS`, event card, renders `FindingTable` and `Pips`.

### skins/pro/screens/ProResult.tsx (78 lines)
- `ProResult` L14-78: post-sprint view of the last history record: exploited incidents, audit incident, loss this sprint and to date, next or finish button.

### skins/pro/screens/ProReport.tsx (243 lines)
- `MISS` L21: 0.2 gap between visible and true likelihood that marks a row as a miss.
- `ProReport` L25-243: debrief. Player vs every strategy table, `replayGrade` over 100 replays with `gradeForRatio`, `longRun` over 200 years with order, ground-truth table (`truthRows` with shown, true and delta, fixed/exploited sprint), miss counts, share link with copy button (`buildUrl`, clipboard), again/new/other buttons.

### skins/pro/components/FindingTable.tsx (114 lines)
- `FindingTable` L24-114: ten-column findings table with checkbox, asset, tags, boosts, debug odds; becomes cards under 700px using `data-label` chips.

### skins/pro/components/Pips.tsx (18 lines)
- `Pips` L8-18: sprint progress list, done and current pips.

### skins/pro/screens.test.tsx (44 lines)
`describe.each` over `proPacks` L16: intro renders pack name and "CVSS-first"; full 8-sprint game with `ssvc` autoplay renders round, result and report, asserting "Sprint N of 8", EPSS, Manual, "SSVC-style", "Ground truth", "Long run". Stubs `window` (matchMedia, location).


### skins/pro/flow.test.tsx (208 lines)
`describe('pro App flow')` L50: App-level flow through the pro skin under happy-dom.
### skins/pro/pro.css (791 lines)
Single stylesheet; `:root` tokens at L7, `body` at L36.
- L31 `@media (prefers-reduced-motion: reduce)`.
- L333 `/* Round head */`, L415 `/* Method pills */`, L466 `/* Tables */`.
- L630 `/* Phone: the findings table becomes cards. */` with `@media (max-width: 699px)` L631 (the only breakpoint).
- L710 `/* Result */`, L752 `/* Report */`.
- No `@keyframes`, no `forced-colors` block.

### skins/pro/README.md (23 lines)
Describes the skin: terminology, methodology picker, daily seed, debrief, added strategies `likelihoodFirst` and `ssvc` (in `engine/strategies.ts`), and not-done items (no leaderboard, SSVC approximation).

### Notes
- No TODO or FIXME found in this area.
- Commented-out code: none found.
- Unused exports: `UrlParams` (seed.ts:14) and `PlaytestParams` (playtest.ts:15) are exported but only used inside their own files.

## Build and config files

- `package.json`: scripts `dev`, `build` (tsc --noEmit then vite build), `preview`, `test` (vitest run), `test:watch`, `typecheck`. Runtime deps: preact and three fontsource packages. Dev deps: vite, vitest, typescript, preact preset, preact-render-to-string, @types/node.
- `vite.config.ts`: `base` from `BASE_PATH` (default `/`); aliases `@engine`, `@content`, `@skins`; plugins `preact()` and `cspPlugin()`; the `pro/index.html` entry is included only when `GAME_PRO=1`.
- `build/csp.ts` (40): `CSP` policy string, `cspTag`, `cspPlugin` (apply: 'build', prepends the CSP meta to every built page). Test `build/csp.test.ts` (30 lines, `describe('cspPlugin')` L4).
- `vitest.config.ts`: same aliases; includes `engine/**/*.test.ts`, `content/**/*.test.ts`, `skins/**/*.test.{ts,tsx}`; and `build/**/*.test.ts`; default environment `node`, with DOM tests opting into happy-dom by a `// @vitest-environment happy-dom` docblock.
- `tsconfig.json`: strict, `noUncheckedIndexedAccess`, Preact JSX, bundler resolution; includes engine, content, skins and the two config files.
- `.claude/launch.json`: `dev` (`npm run dev -- --port 5173 --strictPort`) and `preview` (`npm run preview -- --port 4173 --strictPort`, serves the last `dist/` build, which carries the CSP).
- `.github/workflows/ci.yml`: Node 22, `npm ci`, `npm test`, `npm run build` on push to main and on pull requests. Publishing is done by the FlintScope site repo, not here.
- `.impeccable.md`: design context for the design skills (audience, tone, brand tokens, constraints).
- `docs/SWEEP-2026-11.md`: the November 2026 bug sweep: 13 fixed findings and 15 open design and gameplay notes (the notes start at line 62).
