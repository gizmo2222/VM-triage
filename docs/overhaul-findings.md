# Overhaul findings

Findings the overhaul did not fix, by phase. Fixed findings are in the commit history and the state ledger.

## Phase 2: Bug hunt (2026-11-07)

Eight finders (four areas: engine, content, smallbiz skin, shared helpers plus pro skin; two bug classes each: logic, robustness) reported 26 candidates. A skeptic tried to disprove each one: 20 were confirmed (13 distinct defects after duplicates), 6 refuted. Twelve distinct defects were fixed with regression tests.

### Refuted (not defects)

| Where | Claim | Why it was refuted |
|---|---|---|
| engine/prng.ts:63 | `normaliseSeed` wraps ten-digit seeds above 2^32-1, so distinct seeds collide | No caller in either skin; both parse seeds with `parseSeedParam`, which already hashes out-of-range codes. The wrap is the function's documented contract. |
| content/scenarios/ecommerce.ts:335 | Starting cash is below a typical year's losses, so the report often ends in negative cash | Reproduces (blended overspends in 97 of 300 ecommerce seeds) but negative cash is a designed state: `CashPile` formats and styles it. Worth a look in phase 7 as a balance question, not a bug. |
| skins/shared/seed.ts:45 (two reports) | `writeUrl` on mount strips `fix`, `auto`, `debug` and the hash | Intentional ("Read once; the URL is rewritten after", skins/smallbiz/App.tsx:30). Reload-drops-the-game is already design note 15 in docs/SWEEP-2026-11.md. |
| skins/shared/seed.ts:34 (two reports) | `readUrl('?s=&seed=5')` drops the seed | No code path emits both keys and no contract says the alias outranks an explicitly empty `s=`. |

### Confirmed, not fixed or only partly fixed

- **`voice.emergency` is never spoken** (content/types.ts:48). Every pack authors it, but the cleanup moment at skins/smallbiz/screens/RoundResult.tsx:~192 uses `copy.reveal.emergencyNext`. Either render the pack line there or drop the field from the type and the packs. A design choice, left for phase 6.
- **Two-quarter zero-day has no cue in its second quarter.** Phase 2 fixed the copy (it now says "the next two quarters"), but the Round screen shows only `currentEvent`, so in the second quarter the x5 boost is active with no slip, while the FlintScope comparison order still sees it. A carry-over chip on the Round screen would close it; left for phase 6.
- **`replayGrade` played-seed exclusion has no direct test.** It received the same one-line change as `replayLuck` (engine/scorecard.ts:97), which is tested. Phase 3 should add one.
- **Reduced motion switched on mid-reveal** is fixed at the `startReveal` level and tested there, but the component path in RoundResult has no DOM test (no jsdom render of the effect). Phase 3 could add one.
- **Pro default pack** (content/pro.ts:29) now comes from the ready packs. Its test guards the invariant but could not fail before the fix, because all packs are ready today.

### Logged, not touched (deployment, CI, secrets)

None found.

## Phase 3: Tests (2026-11-07)

Coverage (v8, whole repo): 67.7% to 94.9% of statements, 64.2% to 88.8% of branches, 72.1% to 96.8% of functions, and 68.1% to 95.9% of lines. Mutation pass: 49 of 53 targeted mutants killed.

### Surviving mutants (equivalent or masked, no test can kill them today)

| Location | Mutation | Why it survives |
|---|---|---|
| skins/smallbiz/App.tsx, the `p?.ready ? p.id : defaultPackId` fallback | `p?.ready` to `p` | Equivalent while every pack is ready. This is the same situation as the pro default pack note from phase 2. |
| skins/smallbiz/screens/RoundResult.tsx, `if (!a \|\| a === document.body)` | drop `!a` | `document.activeElement` is never null in a document that has a body. |
| content/pro.ts, `if (!baseId) return undefined;` | `!baseId` to `baseId === undefined` | Equivalent: no pack has the id `-pro`, so an empty base id finds no pack either way. |
| skins/smallbiz/screens/Round.tsx `toggle`, `f.fixCost <= left` | drop the capacity check | Masked by FindingCard's own `if (!disabled)` guard, which a test now pins. This is a deliberate double guard, and no UI path reaches the inner one. |

### Paths left uncovered on purpose

- engine/game.ts ~L143, the `applyImmediate` return for durational effects. It is unreachable and exists only for type exhaustiveness.
- engine/scorecard.ts `replayGrade` with `best <= 0`. No scenario has a zero-cost best strategy.
- `useAnimatedNumber` in skins/smallbiz/hooks.ts is unused and untested. It is a dead-code candidate for phase 5.

### Logged, not touched (deployment, CI, secrets)

None found. `happy-dom` was added as a devDependency, so phase 4 should review it.

## Phase 4: Security (2026-11-08)

Three finders (URL input and what it reaches; output sinks and build config; dependencies, supply chain and git history), one skeptic per finding. 9 findings: 7 confirmed (1 medium, 1 low, 5 info), 2 refuted. Nothing in the shipped app is exploitable: no HTML sinks, every href is a constant, URL params are validated by whitelist (`?b=__proto__`, `?auto=constructor` probed), `history.replaceState` stays same-origin, no secrets in 44 commits, production deps audit clean.

### Fixed

- **vite 8.3.0 launch-editor advisories** (medium, dev machine only): `/__open-in-editor` on Windows ran a shell with `%` unescaped (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm). `npm audit fix` moved vite to 8.3.6, vitest to 5.1.0 (@vitest/mocker GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp, unreachable here) and source-map-js to 1.2.2 (GHSA-68fv-2mgg-jv7q). Floors raised to `vite ^8.3.6`, `vitest ^5.1.0`. `npm audit`: 0.
- **No Content-Security-Policy** (info, defence in depth): `build/csp.ts` adds a build-only meta CSP (`default-src 'none'`, same-origin script/style/font, `img-src 'self' data: blob:`, `connect-src 'none'`). Checked in the built site: a full game, the report card, inline bar widths, fonts and the share picture all work with no violations. It backs the "nothing leaves your browser" line.
- **`.env` not git-ignored** (info): added `.env`, `.env.*`, `!.env.example`.
- **Extraneous coverage packages** (info): phase 3's `--no-save` install of @vitest/coverage-v8 was pruned by `npm audit fix`. Re-measuring coverage needs `npm install --no-save @vitest/coverage-v8@5.1.0` (match vitest's version).

### Refuted

| Where | Claim | Why refuted |
|---|---|---|
| package.json (vite) | Three more vite advisories (custom middleware, fs.allow on non-Windows, wasm-instance read) | No custom middleware, Windows host, localhost-only dev server; cleared by the upgrade anyway. |
| git history | Deleted `deploy.yml` (Pages, id-token) may leave a stale public site | The repo has no Pages site; both URLs return 404. |

### Logged, not touched (deployment, CI, secrets)

- **CI actions pinned to tags** (.github/workflows/ci.yml L18-19): `actions/checkout@v5`, `actions/setup-node@v5`. Low risk (contents: read, no secrets, publishes nothing). For /land: pin to commit SHAs with a `# v5` comment, optionally `npm ci --ignore-scripts` (only fsevents has an install script) and a Dependabot config for github-actions.
- **Headers on flintscope.com/game/**: a meta CSP cannot set `frame-ancestors`; if clickjacking matters, the FlintScope site's server should send `frame-ancestors 'self'` (or X-Frame-Options) for /game/. That is the site repo's config, not this one.
- `debug=1` works in production builds. Judged harmless: it shows only the player's own hidden odds, which are already in their JS state, and it is dropped from shared links.

## Phase 5: Clean-up (2026-11-08)

Four finders (engine plus shared plus build and deps; content; smallbiz skin; pro skin), one skeptic per area, one Sonnet fixer per area. 55 candidates: 42 approved and applied (41 distinct, one found by two areas), 12 logged as risky (plus the preact major, below), 1 rejected (`imageHeading` was already gone by the time its skeptic looked). Net 46 files, +250 / -518 lines; 27 test files, 369 tests (the drop from 29 / 383 is the removed tests of dead code plus two merged duplicate test files).

### Applied (summary)

- Dead code removed: `plural`, `normaliseSeed`, `winnersForSeed`, `currentEvent()`, `useAnimatedNumber`, `ratioToBest`, the `baseIdOf` copy in pro App, dead copy keys (`imageHeading`, smallbiz `shareHint`/`replayHeading`, `a11y.picked`, pro `round.clear`), unused theme tokens (`--warn-soft`, `--text-xl`, `--text-2xl`, `--shadow`), the unused type re-export in content/index.ts, a redundant odds guard in ProRound.
- Duplication folded: replay seed loop (`replaySeeds` in scorecard.ts), play loop (`playOut` in game.ts), pack builder `f(...)` moved to content/scenarios/builder.ts (pack data unchanged, balance test passes), `ready` filter, `-pro` suffix stripping (`baseIdOf` in content/pro.ts), `isDaily` and the ProIntro resolved seed, finding title and exploits-by-asset helpers in smallbiz, repeated easing curve (`--ease-out`), summary-marker CSS, duplicate tests (pro.test.ts, daily.test.ts, misplaced readPlaytest block).
- Hygiene: `BLENDED_AUDIT_BONUS` moved into engine/tuning.ts; stale comments fixed (longRun count, `asc()`, types.ts header, assetIcons); pro skin literals moved into content/copy/pro.ts; `useMethod` renamed `applyMethod` (not a hook); `ShareImage` canShare typed with the DOM type; @types/node ^22.20.5, preact-render-to-string ^6.8.2.

### Risky, not applied

| Where | What | Why not applied |
|---|---|---|
| package.json | preact 10.29.8 to 11.2.0 | Major version: JSX/runtime changes across both skins. Worth its own branch with a full UI pass. @types/node 26 also skipped on purpose (CI is Node 22). |
| vitest.config.ts L7-13, vite.config.ts, tsconfig.json | Alias block declared three times | Sharing it means a shared config module or `mergeConfig`, which also pulls the build-only CSP plugin into test config; judgement call. |
| engine/index.ts | Barrel exports many names nobody imports through it; consumers mix `@engine/index` and module paths | The barrel is the engine's public surface (README); trimming it is an API decision. |
| engine/scorecard.ts L15-24, types.ts | `playerRank`, `bestStrategy`, `worstStrategy` and `GameState.scenarioId` computed but never read by a skin | Changes public types; tests pin them. |
| content/__tests__/packs.test.ts L7, skins/smallbiz/screens.test.tsx L17, content/__tests__/copy.test.ts L210 | Three different jargon regexes (22 terms, up to PCI, 4 terms) | Unifying tightens two tests, which may then fail on existing copy; a content decision. |
| content/copy/smallbiz.ts ~L212-227 | `Grade` thresholds live in smallbiz copy but only the pro report uses them | Moving changes two modules' exported shape. |
| content/pro.ts L17, content/types.ts L34 | Pro `roundLabel` override is never read by the pro skin | Either render it or drop it: design choice. |
| skins/smallbiz/screens/ReportCard.tsx L24-26 | Local `capitalise` duplicates one in copy | Would add a cross-module export. |
| skins/smallbiz/screens/Intro.tsx L14 | `KIND_ICON` hard-codes pack ids in the skin | The fix adds a `ScenarioMeta` field and edits all three packs. |
| skins/pro/screens/ProReport.tsx L21, content/copy/pro.ts ~L146 | `MISS = 0.2` repeated as a literal in `truthSummary`; `±0.3` in `FORMULA.note` mirrors TUNING | Changes a content function's signature. |
| skins/pro/screens/ProReport.tsx L43 | Sort comparator returns 1 for both orders on tied costs (phase 2 fixed the same bug in smallbiz) | A behaviour fix in the parked skin, not clean-up; trivial for whoever revives /pro/. |
| skins/pro/App.tsx ~L36-45 | `applyPlaytest` is not wrapped in try/catch as in smallbiz, so a throwing `fix=` script crashes the pro app at mount | Behaviour change in the parked skin. |
| skins/pro/screens/ProReport.tsx L75-84, skins/smallbiz/screens/ReportCard.tsx L118-127 | Copy-link logic duplicated across skins; neither clears its 2 s timer on unmount. Loss sum repeated in ProRound/ProResult | Cross-skin extraction into skins/shared; the timer leak is harmless but real. |

### Logged, not touched (deployment, CI, secrets)

None found. Four files keep CRLF line endings (skins/pro/App.tsx, flow.test.tsx, screens/ProIntro.tsx, skins/shared/playtest.test.ts); there is no .gitattributes, so git warns. Left as they were.

## Phase 6: UI (2026-11-11)

Method: playwright-core plus the installed Chromium drove both skins at 375, 768 and 1280 px wide, taking 44 shots per pass. axe-core ran on every screen. Forced colours and motion-on were each checked once at phone width. Before the fixes, axe flagged colour contrast, scrollable-region-focusable on the pro report, and a missing pro favicon (404). After the fixes, axe reports no violations and the console shows no errors or warnings.

Fixed (by severity):
- Accessibility:
  - The open tile count was 3.07:1 (now brass-text, and the pair is added to theme.test).
  - The disabled finding cards used opacity and dropped under 4.5:1 (now slate headline and line-colour check).
  - Pressed state was carried by colour alone (inset ring, plus a `forced-colors` block for pressed and picked items).
  - The fixed commit bar hid focused items (scroll-padding-bottom under 900 px, WCAG 2.4.11).
  - The meter's `aria-label` overrode its live text (now a visually hidden prefix).
  - The reveal's Skip button sat inside a live region (now a separate persistent status line).
  - CashPile announced during the reveal (new `announce` prop).
  - Tiles had no `aria-expanded`/`aria-controls`.
  - The pro tables scrolled without being focusable (tabIndex 0, with a focus-visible style).
  - First load jumped focus to the h1 (now skipped on mount; later screens focus `[data-focus-start]`).
  - A "Go to Fix button" link was added inside the asset panel.
  - Pick rows now have a 44 px minimum target height.
- States:
  - An unknown `?b=` now shows a notice instead of silently falling back (SWEEP note).
  - Skipping a quarter with nothing picked needs a second tap ("Skip anyway").
  - "Nothing fits" hint when points remain but no problem fits.
  - An asset with no open problems says so.
  - `voice.emergency` now renders when cleanup debt applies (phase 2 gap).
  - Events that carry over show a closed "Still on: …" slip, which covers the zero-day's second quarter (phase 2 gap).
  - Every new event slip opens; before, only the first did.
  - Event capacity changes show as a meter tag.
  - The reveal shows the quarter's total loss, and an audit-passed line.
- Copy:
  - The budget is "five fix points" everywhere; pack text only, and the balance test passes.
  - The breach lines were reordered or reworded so the first one makes sense alone.
  - The report tie lead no longer repeats a matched strategy that ties for best.
  - "Play your picks again 200 times…".
  - The fixes toggles read "Show what you fixed" and "Show what X fixed".
- Polish:
  - Tabular figures on cash.
  - Equal-height tiles and pickers.
  - The ghost chip border is visible.
  - The commit bar width matches the column.
  - Luck strip end labels are pinned inside the strip.
  - Ledger amounts are right-aligned and do not wrap.
  - The fixes summary uses body type.
  - Report buttons are full width under 560 px.
  - The crack animation's children inherit colour.
  - Headlines focused by code show no ring.
  - The pro favicon was added.
- Performance:
  - The report's 1,600-game long run is cached per pack per page load (module Map in ReportCard.tsx).
  - Load is about 0.7-0.8 s on the dev server; the build is 115 kB JS (38.6 kB gzip).

Deferred (not applied: product calls, or a risk to layout):
- Moving the FlintScope CTA above the replay buttons on the report. This is a conversion call for the owner.
- Font weight trim and metric-matched fallback fonts. Four Plex files ship, and there is some layout shift on slow loads.
- Deferring the long-run computation until after first paint. Only the cache was done, so the first report still blocks for about 100-200 ms on a slow phone.
- Lowering the two-column breakpoint from 900 to about 760 px for tablets. It touches four media blocks and the commit-bar layout.
- Wrapping the event slip summary under 560 px, where long titles truncate.
- Duplicate coach and panel-empty text on desktop when nothing is selected.
- Marking on the result map which tiles were hit this quarter, as opposed to ever.
- SWEEP-2026-11 notes 2, 4, 7, 8, 12 and 15 are still open. Notes 1, 9, 10, 11, 13 and 14 are resolved by the items above.

Logged, not touched (config):
- vite.config.ts imports `./build/csp` without an extension. It works under Vite's resolver, but the build config feeds FlintScope CI, so it is left alone.
