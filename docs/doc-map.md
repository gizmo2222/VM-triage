# Doc map

Every source file, its purpose, and line ranges for the key symbols. Written in overhaul phase 1 (2026-11-07) against `main` at 6f9b078; refreshed in phase 9. Line numbers drift as code changes: confirm with `grep -n` before relying on one. The short version lives in [CLAUDE.md](../CLAUDE.md).

Source size at the time of writing: about 9,200 lines in all, of which 2,330 are CSS and about 1,100 are tests.

## Engine (`engine/`)

Pure TypeScript, no DOM. A seed goes into `createGame`, which rolls all ground truth once (true likelihood per finding, one uniform roll per finding per round, event deck order); each round the player (or a strategy ranker) commits fixes under capacity and `resolveRound` exploits findings whose roll is under their probability; a finished game goes to `buildScorecard` / `replayGrade` / `replayLuck` / `longRun`, which compare the player against every strategy on the same dice.

### engine/types.ts (254 lines)
All shared types; no logic except `STRATEGY_IDS`.
- `Id` L8: string alias for ids.
- `Sensitivity` L11: 'none' | 'internal' | 'customer' | 'regulated'.
- `Asset` L13-21: a business asset (criticality, sensitivity, records, exposure).
- `Finding` L23-44: a vulnerability card (severity, visible likelihood, cost, tags, compliance, known-exploited, asset ref).
- `EventEffect` L48-60: union of event effects (likelihoodBoost, capacityDelta, audit, addAsset, markKnownExploited, setExposure ...); end line approximate.
- `GameEvent` L62-71: a scheduled news event wrapping an effect, with duration and tags.
- `Economics` L75-84: dollar figures used by `impactOf`.
- `ScenarioConfig` L86-94: rounds, capacity, first event round, etc.
- `Scenario` L96-103: assets + findings + events + config + economics + meta.
- `StrategyId` L107-116: union of the eight strategy ids.
- `STRATEGY_IDS` L118-131: readonly array of all eight ids (end line approximate).
- `RankContext` L133-135: ranker input carrying active modifiers.
- `Ranker` L138: `(findings, assets, ctx?) => Finding[]`.
- `Strategy` L140-143: id + ranker.
- `GroundTruth` L154-161: seeded truth: true likelihoods, per-round rolls, event deck.
- `Impact` L165-171: downtime, records, dollars for one incident.
- `Incident` L173-181: an exploited finding in a round, with its impact.
- `ActiveModifier` L183-187: a durational event effect still in force.
- `Phase` L189: 'choose' | 'resolved' | 'finished'.
- `RoundRecord` L191-198: what was fixed, what burned, audit result for one round.
- `GameState` L200-223: backlog, assets, round, capacity, debt, modifiers, history.
- `Game` L226-229: state + truth + seed.
- `OutcomeTotals` L233-236: Impact plus incidentCount.
- `OutcomeSummary` L238-245: totals and totalCost of a finished game.
- `Scorecard` L247-254: player vs each strategy, rank/grade.

### engine/game.ts (353 lines)
Game lifecycle: validation, creation, round commit/advance, scripted and strategy play.
- `validateScenario` L27-71: throws on inconsistent scenarios (duplicate ids, unaffordable finding, bad refs); also used by content tests.
- `allFindings` L76-84: scenario findings plus event-added ones.
- `rollTruth` L86-105 (private): all seeded randomness; optional deck override keeps the same dice.
- `computeCapacity` L109-116 (private): base capacity + modifiers - emergency debt, floored at `minCapacity`.
- `applyImmediate` L118-145 (private): applies addAsset/markKnownExploited/setExposure effects.
- `beginRound` L152-170 (private): draws the round's event, expires modifiers, sets capacity.
- `CreateOptions` L174-180: options for `createGame` (deck override).
- `createGame` L182-203: seed -> Game in round 1, 'choose' phase.
- `costOf` L206-214: capacity cost of a set of findings.
- `commitFixes` L220-261: validates picks, resolves the round, records it, accrues debt, finishes after the last round.
- `nextRound` L264-274: 'resolved' -> next 'choose'.
- `autoPick` L277-279: ids a strategy would fix this round.
- `rankBacklog` L282-284: a strategy's ranked backlog with this round's events.
- `commitScripted` L291-299: forgiving commit of a scripted pick list (skips burned/unaffordable).
- `runScript` L302-314: play a whole game from per-round scripts.
- `runStrategy` L317-324: play a whole game with one strategy (the counterfactual).
- `summarize` L326-348: Game -> OutcomeSummary.
- `currentEvent` L351-353: the event active this round, if any.

### engine/resolve.ts (126 lines)
Round resolution: exploit odds and impact maths.
- `exploitProbability` L16-31: trueLikelihood * baseRate * exposure * KEV * event boosts, capped at `maxRoundProbability`.
- `impactOf` L34-47: downtime, records and dollars for a finding on an asset.
- `ResolveInput` L53-60: inputs to `resolveRound`.
- `ResolveResult` L62-68: exploited incidents and round outcome.
- `resolveRound` L74-126: rolls each open finding against its probability, builds incidents, audit outcome, emergency debt.

### engine/strategies.ts (157 lines)
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
- `BLENDED_AUDIT_BONUS` L118: 0.12, score bonus for items an open audit asks about.
- `blended` L120-123: ranker on `blendedScore`; the only strategy that uses events.
- `STRATEGIES` L125-134: Record of all eight `Strategy` objects.
- `getStrategy` L136-140: lookup by id.
- `pickUnderCapacity` L146-157: greedy fill, not a knapsack.

### engine/scorecard.ts (155 lines)
Post-game comparison and long-run / replay statistics.
- `buildScorecard` L9-25: requires a finished game; ranks the player against every strategy on the same seed.
- `LongRunRow` L27-32: meanCost + winShare.
- `longRun` L39-57: all strategies over seeds 1..n.
- `longRunOrder` L60-62: strategy ids sorted by mean cost.
- `ReplayGrade` L64-72: yourMean, strategyMeans, ratio, years.
- `replayGrade` L82-106: replays the player's picks as a script through `years` fresh-dice years; ratio vs best strategy mean.
- `winnersForSeed` L112-125: lowest-cost strategy ids for a seed (ties return all); used by balance test and pro daily leaderboard.
- `ReplayLuck` L127-135: sorted replay costs + share of replays costlier than the real year.
- `replayLuck` L142-155: where the actual year sits in the replay distribution (default 100 years); feedback only.

### engine/prng.ts (65 lines)
Seeded randomness.
- `Rng` L7-14: interface with `next`, `int`, `shuffle`.
- `mulberry32` L16-25: seed -> uniform [0,1) generator.
- `createRng` L27-45: wraps mulberry32 into an `Rng`.
- `seedFromString` L48-55: FNV-1a 32-bit string -> uint32.
- `normaliseSeed` L58-65: number/string/junk -> uint32 seed or undefined.

### engine/tuning.ts (34 lines)
Every magic number. Balance test gates changes.
- `TUNING` L6-32:
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
- `SENSITIVITY_WEIGHT` L34: { none: 0.2, internal: 0.5, customer: 0.8, regulated: 1.0 }.

### engine/index.ts (39 lines)
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

### engine/__tests__/prng.test.ts (75 lines)
mulberry32 determinism, range and mean; createRng `int` and `shuffle`; `seedFromString` stability; `normaliseSeed` input handling.

### engine/__tests__/replay.test.ts (44 lines)
Full-game reproduction from seed + choices, different seeds give different truth, every strategy deterministic on the dental pack, strategies differ on one seed.

### engine/__tests__/fixture.ts (86 lines)
Test fixture, not a test: `assets` L5, `findings` L31, `events` L40, `scenario` L68, `scenarioWithOnlyEvent` L82-86.

### Markers
- No TODO, FIXME or commented-out code found in `engine/` or `engine/__tests__/`.

## Content (`content/`)

Scenario packs (dental, manufacturer, ecommerce) plus all player-facing copy for the two skins (smallbiz, pro). A pack is an engine `Scenario` (id, assets, findings, events, config) wrapped in `meta` (name, tagline, intro, IT person, audit text, icons, voice, asset notes), with short `headlines` merged in by `applyHeadlines`. Every pack has 30 findings built with `f(...)`, 2 more findings added by its `new-*` event, and 7 events.

### content/types.ts (69 lines)
Pack and meta types, plus the helper that applies headlines.
- `ScenarioMeta` L8-50: name, kind, tagline, intro[], itPersonName, people, audit{}, roundLabel, assetIcons, cashOnHand, voice{handover, quiet[], breach[], audit, emergency} (L43-49), assetNotes.
- `ScenarioPack` L52-57: `Scenario` plus `meta` and `ready` flag (false shows as coming soon).
- `applyHeadlines(pack, headlines)` L59-69: sets `headline` on every finding, including event-added ones (addAsset effects).

### content/index.ts (18 lines)
Pack registry.
- `ScenarioPack`, `ScenarioMeta` type re-exports L6.
- `allPacks` L9: [dental, manufacturer, ecommerce].
- `scenarios` L12: ready packs only.
- `getPack(id)` L14-16; `defaultPackId` L18 (dental).

### content/pro.ts (29 lines)
Practitioner edition configuration over the same packs.
- `PRO_CONFIG` L10: rounds 8, capacityPerRound 5, firstEventRound 1.
- `toPro(pack)` L12-19: copies a pack with PRO_CONFIG applied.
- `proPacks` L21: ready packs mapped through `toPro`.
- `getProPack(baseId)` L24-27; `defaultProPackId` L29.

### content/copy/smallbiz.ts (234 lines)
All smallbiz skin strings (no jargon allowed), plus grading helpers.
- `SMALLBIZ_STRATEGY_IDS` L11-18: strategy order shown in the report.
- `SortChip`, `sortChipsFor(meta)` L20-36: sort chips for the round screen.
- `strategyNamesFor(meta)` L38-49; private `cap` L51.
- `copy` object L55-204: top-level keys `siteTitle`/`siteSubtitle` L56-57, `intro` L59 (howItWorks L65), `round` L77 (coach L100), `reveal` L107 (months L123), `report` L131 (totals L156).
- `ordinal(n)` L206; `Grade` type L212; `gradeForRatio(ratio)` L221; `ratioToBest(playerCost, strategyCosts)` L230.

### content/copy/pro.ts (175 lines)
All pro skin strings, method descriptions and the published scoring formula.
- `Method` L7, `METHODS` L17-32, `methodById` L34: strategy descriptions.
- `FORMULA` L37-48: heading, `lines` (L39), note; tested against the engine by formula.test.ts.
- `pro` object L50-173: `title`/`edition`/`subtitle` L51-53, `intro` L55 (rules L64, cols L88), `round` L75, `result` L111 (nav L127, cols L129, longRunCols L140, truthCols L148), `report` L124, `footer` L161 (link flintscope.com L163).
- `gradeForRatio` re-export L175 from ./smallbiz.

### content/scenarios/dental.ts (386 lines)
Bright Smile Family Dental, a dental office; 30 findings plus 2 event-added, 7 events, IT person Marcus, cash 250000.
- `assets` L15-25: asset list.
- `f(id, assetId, plainTitle, techTitle, severity, likelihood, fixCost, opts{kev, compliance, tags})` L27-48: finding builder.
- `findings` L49-187: 30 `f(...)` calls.
- `hygienistLaptop` L189-196: asset added by the new-hygienist event.
- `events` L198-278: 7 events (vpn-zero-day, slow-quarter, quiet-quarter, insurance-form, invoice-phishing, new-hygienist L247 with 2 findings L257-261, billing-sync).
- `base` L280-349: id, ready, config L286 (4 rounds, economics L290), meta L297 (intro L301, audit L308, roundLabel L315, assetIcons L316, cashOnHand L328, voice L329, assetNotes L336).
- `headlines` L351-384: id to short headline map, about 31 entries.
- `dental` export L386: `applyHeadlines(base, headlines)`.

### content/scenarios/manufacturer.ts (387 lines)
Kessler Precision Machining, a machine shop; 30 findings plus 2 event-added, 7 events, IT person Dave, cash 400000.
- `assets` L16-26; builder `f(...)` L28-49 (same signature as dental).
- `findings` L50-188: 30 `f(...)` calls.
- `newMachine` L190-197: asset added by the new-machine event.
- `events` L199-279: 7 events (vendor-tool-zero-day, rush-order, slow-quarter, customer-questionnaire, po-phishing, new-machine L248 with 2 findings L258-262, shop-floor-exposed).
- `base` L281-350: config L287, meta L298 (intro L302, audit L309, assetIcons L317, cashOnHand L329, voice L330, assetNotes L337).
- `headlines` L352-385; `manufacturer` export L387.

### content/scenarios/ecommerce.ts (387 lines)
Hollow Oak Goods, an online store; 30 findings plus 2 event-added, 7 events, IT person Priya, cash 350000.
- `assets` L16-26; builder `f(...)` L28-49 (same signature as dental).
- `findings` L50-188: 30 `f(...)` calls.
- `newMarketplace` L190-197: asset added by the new-marketplace event.
- `events` L199-279: 7 events (payment-plugin-zero-day, peak-season, slow-quarter, processor-questionnaire, password-dump, new-marketplace L248 with 2 findings L258-262, warehouse-exposed).
- `base` L281-350: config L287, meta L298 (intro L302, audit L309, assetIcons L317, cashOnHand L329, voice L330, assetNotes L337).
- `headlines` L352-385; `ecommerce` export L387.

### content/__tests__/packs.test.ts (45 lines)
Runs per pack via `describe.each(allPacks)`: pack validates; every finding has a short jargon-free headline and jargon-free plain title (JARGON regex L7: CVE, CVSS, EPSS, KEV, RCE, TLS, MFA, etc.); event plain text is jargon-free; every asset (including event-added) has an icon and a note; pack has voice lines and cash.

### content/__tests__/formula.test.ts (53 lines)
Checks the published formula against the engine: `blendedScore` is reproduced from the published weights (L25), and `FORMULA` copy states the same constants (L46).

No TODO, FIXME or commented-out code found in `content/`.

## Small-business skin (`skins/smallbiz/`, served at `/`)

Screen flow is Intro -> Round -> RoundResult -> ReportCard (`Screen` = intro | round | result | report). All state lives in `App.tsx` (pack id, seed, session with game, screen); the URL carries pack and seed (`b`, `s`, rewritten by `writeUrl` on every change) plus playtest params.

### index.html (repo root, 17 lines)
Entry page: title "What First", inline SVG favicon, `<div id="app">`, loads `/skins/smallbiz/main.tsx`.

### skins/smallbiz/main.tsx (15 lines)
Mounts `App` into `#app` (L13).

### skins/smallbiz/App.tsx (172 lines)
Top-level state, URL sync, screen switch and footer.
- `Screen` type L15: intro | round | result | report.
- `Session` interface L17-21: pack, seed, game.
- `App` L23-172: state L25-38 (packId, seed, session, screen); `start` L55, `commit` L67, `advance` L76; render L~110-172 with the four screens and the site footer.
- URL params (parsed in `@skins/shared`, called from App):
  - `b` (alias `business`) and `s` (alias `seed`): `readUrl()` at App L24 (impl `skins/shared/seed.ts` L32).
  - `fix` (`q<round>:id,id;...`), `auto` (strategy id), `debug` (`1`/`true`): `readPlaytest(window.location.search)` at App L31 (impl `skins/shared/playtest.ts` L21); `applyPlaytest` L36 builds a pre-played session when `hasPlaytest` (L33). `debug` is passed to `Round` (L127).
- Effects: `writeUrl(packId, seed)` L43-47; focus h1 and scroll to top on screen/round change L49-54.

### skins/smallbiz/config.ts (35 lines)
Skin copy config.
- `cta` L8-26: call-to-action content used by ReportCard.
- `footer` L29-35: footer line and home/pro links (App; also exported name collides with content/copy/pro.ts, separate symbol).

### skins/smallbiz/hooks.ts (62 lines)
- `usePrefersReducedMotion` L3-22: reads and tracks the media query.
- `useAnimatedNumber` L25-62: eased count-up/down of a number. Nothing imports it (CashPile has its own animation).

### skins/smallbiz/reveal.ts (65 lines)
Timed month-by-month reveal engine for RoundResult (no Preact).
- `MONTH_MS` L3, `BREAK_MS` L4 (exported, only used in reveal.ts), `LEAD_MS` L5.
- `RevealHandlers` L7-14, `RevealRun` L16-21 (interfaces).
- `startReveal` L27-65: schedules months and hits, returns `{skip, stop}`; finishes once.

### skins/smallbiz/theme.css (58 lines)
Brand tokens in `:root` L5-58. Tokens: --brass, --brass-deep, --brass-text, --brass-soft, --ink, --ink-soft, --slate, --slate-soft, --paper, --paper-deep, --card, --line, --good, --good-soft, --bad, --bad-soft, --warn, --warn-soft, --font-body, --font-display, --font-mono, --text, --text-sm, --text-lg, --text-xl, --text-2xl, --leading, --space-1..6, --space-8, --radius, --radius-sm, --measure, --shadow, --focus.

### skins/smallbiz/app.css (1546 lines)
Imports theme.css (L1). Section comments:
- L3 Base; L96 small-caps label note; L109 Shell; L154 Cards and bits; L231 Buttons; L293 Intro; L409 Round head; L515 Round grid; L532 Event slip; L579 Chips; L621 Map; L757 Panel; L917 Picks strip; L972 Commit bar; L1008 Reveal; L1109 Report; L1146 Luck strip; L1529 Motion.
- `@media (min-width: 900px)`: L115, L520, L775, L997 (desktop two-column layouts).
- `@media (min-width: 560px)`: L628 (map).
- `@media (pointer: coarse)`: L1355 (full-size toggle target).
- `@media (prefers-reduced-motion: no-preference)`: L718, L1097, L1219, L1414, L1530.
- `@keyframes`: shake L726, crack L744, drop L1237, grow L1420, rise L1537.
- forced-colors: no `@media (forced-colors)` block; only the comment at L57 (focus outline painted for forced-colors).
- No `prefers-reduced-motion: reduce` block (motion is opt-in via no-preference).

### skins/smallbiz/screens/Intro.tsx (90 lines)
- `KIND_ICON` L14: pack kind -> icon name.
- `Intro` L16-90: pick a business and seed text, start button; local state L17-18.

### skins/smallbiz/screens/Round.tsx (282 lines)
- `Round` L24-282: choose up to the quarter's fix budget. State selected/chip/order/active L26-29; effect L39 (reset on round), L113; helpers `toggle` L75, `useChip` L84, `clear` L90, `closePanel` L97, `removePick` L103, `odds` L127; renders BusinessMap, FindingCard list, picks strip, commit bar.

### skins/smallbiz/screens/RoundResult.tsx (202 lines)
- `RoundResult` L26-202: plays the reveal via `startReveal`; state month/revealedCount/breaking L44-46; effects L55 (run reveal), L75; hits-per-asset L93; renders BusinessMap, CashPile, hit list, next button.

### skins/smallbiz/screens/ReportCard.tsx (266 lines)
- `capitalise` L24-26.
- `samePicks` L29-37: compares two games' picks.
- `ReportCard` L39-266: final ledger by quarter (break-ins only), cost ties L65-67, LuckStrip, ShareImage data, copy-link state L116, CTA, replay buttons.

### skins/smallbiz/components/FindingCard.tsx (63 lines)
- `FindingCard` L15-63: one problem card; expandable (L16), picked/fits/badge/debug, aria-disabled when it will not fit.

### skins/smallbiz/components/BusinessMap.tsx (78 lines)
- `TileInfo` L5-13: tile data interface.
- `BusinessMap` L27-78: grid of asset tiles with shake/break states; onSelect.

### skins/smallbiz/components/CashPile.tsx (67 lines)
- `CashPile` L15-67: animated cash number (own tween L21; skips under reduced motion).

### skins/smallbiz/components/LuckStrip.tsx (54 lines)
- `LuckStrip` L20-54: 100-replay cost strip with this year's marker and median.

### skins/smallbiz/components/Icon.tsx (56 lines)
- `ICONS` L6-28: name -> SVG path map (also read by content/__tests__/packs.test.ts).
- `Icon` L37-56: renders an icon by name.

### skins/smallbiz/components/QuarterPips.tsx (18 lines)
- `QuarterPips` L8-18: progress pips for the quarters.

### skins/smallbiz/components/ShareImage.tsx (248 lines)
- `ShareRow` L5, `ShareData` L12 (exported interfaces); `W`/`H` L23-24 (1200x630).
- `token` L27-34: read a CSS custom property with fallback.
- `draw` L35-153: async canvas painter for the 1200x630 share card (`async function draw(canvas, d: ShareData)`).
- `roundRect` L155-163, `truncate` L165-170.
- `ShareImage` L176-248: renders the canvas to a PNG data URL (state src/busy/failed L178-180, effect L183).

### skins/smallbiz/screens.test.tsx (94 lines)
Render smoke tests over every pack: Intro renders (L26); a whole auto-played game through Round, RoundResult and ReportCard with no jargon terms (L32); ReportCard ledger counts break-ins only, not a failed audit (L63); FindingCard that will not fit stays focusable with aria-disabled (L89).

### skins/smallbiz/reveal.test.ts (57 lines)
`startReveal` (L19): plays every month and hit then finishes once (L23); skip cancels pending (L30); skip after end or twice does not re-finish (L41); stop cancels without finishing (L50).

### skins/smallbiz/theme.test.ts (54 lines)
Reads theme.css and checks every listed text/background token pairing clears WCAG AA 4.5:1 (L50).

### Flags
- No TODO, FIXME or commented-out code in the skin.
- `useAnimatedNumber` (hooks.ts:25) is imported by nothing.
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
- `writeUrl` L52-56: `history.replaceState` to the built URL when it differs.
- `randomSeed` L58-62: `crypto.getRandomValues` uint32, not the engine PRNG.
- `dailySeed` L65-68: `seedFromString("<UTC year>-<month>-<day>")`.

### skins/shared/format.ts (23 lines)
Number and word formatters.
- `dollars` L4-6: whole USD via `Intl.NumberFormat`.
- `count` L8-10: whole number with thousands separators.
- `days` L13-19: "0 days", "half a day" under 0.75, else rounded to 0.5 ("1 day", "2.5 days").
- `plural` L21-23: picks the one/many string.

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

### skins/shared/playtest.test.ts (34 lines)
`describe('playtest hooks')` L6: parses fix, auto and debug; replays scripted quarters, skips unknown or unaffordable ids, stops at the first unscripted quarter; autoplays to the end with a strategy.

## Practitioner skin (`skins/pro/`, served at `/pro/`, dev only unless GAME_PRO=1)

Flow is intro (pack + seed) -> round (pick a method, choose fixes) -> result -> round ... -> report, using the `-pro` pack variants (`@content/pro`) and `@content/copy/pro`. Differs from smallbiz by 8 sprints, a methodology picker over a ten-column findings table, a UTC daily seed by default, and a debrief with replay grade, 200-year long run and ground truth.

### pro/index.html (14 lines)
Entry page for `/pro/`: meta description, dark color-scheme, `#app`, loads `/skins/pro/main.tsx`.

### skins/pro/main.tsx (13 lines)
Imports fontsource (Spectral, IBM Plex Sans/Mono) and `pro.css`, renders `App` into `#app` (throws if missing).

### skins/pro/App.tsx (134 lines)
Root state machine for the pro skin.
- `Screen` L14: `'intro' | 'round' | 'result' | 'report'`.
- `Session` L16-21: `{ pack, baseId, seed, game }`.
- `baseIdOf` L24: strips `-pro` from a pack id for the URL.
- `App` L26-134: initial pack and seed from `readUrl` (seed falls back to `dailySeed()`), playtest hooks start mid-game or at report, `start`/`commit`/`advance` callbacks, URL sync via `writeUrl`, focuses `h1` and scrolls to top on screen or round change, builds scorecard when finished, renders masthead, active screen, footer.

### skins/pro/screens/ProIntro.tsx (85 lines)
- `ProIntro` L14-85: pack picker, seed text box (prefilled with `seedToParam`, parsed by `parseSeedParam`, falls back to current seed), daily-seed notice, start button.

### skins/pro/screens/ProRound.tsx (158 lines)
- `ProRound` L17-158: one sprint. Holds selected set, method, row order, show-more state. Computes budget left, loss to date, audit flag, tag boosts, per-row event tags (`rowTags`, L38-49), `toggle` L51, `useMethod` L60-69 (sets selection from `autoPick` and order from `rankBacklog`), debug `odds` L71-77, primary and secondary method pills from `METHODS`, event card, renders `FindingTable` and `Pips`.

### skins/pro/screens/ProResult.tsx (78 lines)
- `ProResult` L14-78: post-sprint view of the last history record: exploited incidents, audit incident, loss this sprint and to date, next or finish button.

### skins/pro/screens/ProReport.tsx (242 lines)
- `MISS` L21: 0.2 gap between visible and true likelihood that marks a row as a miss.
- `ProReport` L23-242: debrief. Player vs every strategy table, `replayGrade` over 100 replays with `gradeForRatio`, `longRun` over 200 years with order, ground-truth table (`truthRows` with shown, true and delta, fixed/exploited sprint), miss counts, share link with copy button (`buildUrl`, clipboard), again/new/other buttons.

### skins/pro/components/FindingTable.tsx (114 lines)
- `FindingTable` L24-114: ten-column findings table with checkbox, asset, tags, boosts, debug odds; becomes cards under 700px using `data-label` chips.

### skins/pro/components/Pips.tsx (18 lines)
- `Pips` L8-18: sprint progress list, done and current pips.

### skins/pro/screens.test.tsx (44 lines)
`describe.each` over `proPacks` L16: intro renders pack name and "CVSS-first"; full 8-sprint game with `ssvc` autoplay renders round, result and report, asserting "Sprint N of 8", EPSS, Manual, "SSVC-style", "Ground truth", "Long run". Stubs `window` (matchMedia, location).

### skins/pro/pro.css (787 lines)
Single stylesheet; `:root` tokens at L7, `body` at L36.
- L31 `@media (prefers-reduced-motion: reduce)`.
- L333 `/* Round head */`, L415 `/* Method pills */`, L466 `/* Tables */`.
- L626 `/* Phone: the findings table becomes cards. */` with `@media (max-width: 699px)` L627 (the only breakpoint).
- L706 `/* Result */`, L748 `/* Report */`.
- No `@keyframes`, no `forced-colors` block.

### skins/pro/README.md (23 lines)
Describes the skin: terminology, methodology picker, daily seed, debrief, added strategies `likelihoodFirst` and `ssvc` (in `engine/strategies.ts`), and not-done items (no leaderboard, SSVC approximation).

### Notes
- No TODO or FIXME found in this area.
- Commented-out code: none found.
- Unused exports: `skins/shared/format.ts:21` `plural` (no importer anywhere in skins/ or content/). `UrlParams` (seed.ts:14) and `PlaytestParams` (playtest.ts:15) are exported but only used inside their own files.
- `skins/pro/screens/ProIntro.tsx:17-18` computes `parseSeedParam(seedText) ?? seed` twice (`resolveSeed` and `seedNow`).
- `skins/pro/App.tsx:84` and `:114` compute `isDaily` two ways (`seed === dailySeed()` vs `session.seed === dailySeed()`).

## Build and config files

- `package.json`: scripts `dev`, `build` (tsc --noEmit then vite build), `preview`, `test` (vitest run), `test:watch`, `typecheck`. Runtime deps: preact and three fontsource packages. Dev deps: vite, vitest, typescript, preact preset, preact-render-to-string, @types/node.
- `vite.config.ts`: `base` from `BASE_PATH` (default `/`); aliases `@engine`, `@content`, `@skins`; plugins `preact()` and `cspPlugin()`; the `pro/index.html` entry is included only when `GAME_PRO=1`.
- `build/csp.ts` (40): `CSP` policy string, `cspTag`, `cspPlugin` (apply: 'build', prepends the CSP meta to every built page). Test `build/csp.test.ts`.
- `vitest.config.ts`: same aliases; includes `engine/**/*.test.ts`, `content/**/*.test.ts`, `skins/**/*.test.{ts,tsx}`; environment `node` (screen tests render to a string, there is no DOM).
- `tsconfig.json`: strict, `noUncheckedIndexedAccess`, Preact JSX, bundler resolution; includes engine, content, skins and the two config files.
- `.claude/launch.json`: `dev` (`npm run dev -- --port 5173 --strictPort`) and `preview` (`npm run preview -- --port 4173 --strictPort`, serves the last `dist/` build, which carries the CSP).
- `.github/workflows/ci.yml`: Node 22, `npm ci`, `npm test`, `npm run build` on push to main and on pull requests. Publishing is done by the FlintScope site repo, not here.
- `.impeccable.md`: design context for the design skills (audience, tone, brand tokens, constraints).
- `docs/SWEEP-2026-11.md`: the November 2026 bug sweep: 13 fixed findings and 15 open design and gameplay notes (the notes start at line 62).
