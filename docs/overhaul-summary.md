# Overhaul summary

The ten-phase overhaul ran from 2026-11-07 to 2026-11-11, each phase on its own branch cut from the one before. `overhaul/phase-9` holds all of phases 1-9; phase 10 (`/land`) merges it. The ledger is [overhaul-state.md](overhaul-state.md), and the item-level detail is in [overhaul-findings.md](overhaul-findings.md).

Before the overhaul there were 13 test files with 116 tests. Now there are 27 files with 385 tests, coverage is about 95% of statements, `npm audit` reports 0 advisories, axe reports 0 violations, and the build ships a strict CSP.

## What changed, per phase

1. **Map.** Wrote CLAUDE.md (commands in PowerShell 5.1 syntax, the codebase rules, a short doc map) and [doc-map.md](doc-map.md), which covers every exported symbol with its line range. No code changed.
2. **Bug hunt.** Finders raised 26 candidates. 20 were confirmed (13 distinct) and 6 refuted. 12 bugs were fixed, each with a regression test:
   - a `fix=` link with duplicate ids crashed both skins;
   - `validateScenario` accepted NaN;
   - `replayLuck` counted ties as worse (they now count as half) and could include the played year;
   - three event lines had wrong copy;
   - the reveal could get stuck;
   - and others.
3. **Tests.** Coverage went from 67.7% to 94.9% of statements: 10 new test files and 243 new tests, with happy-dom added as a devDependency. A mutation pass killed 49 of 53 mutants; the 4 survivors are equivalent or masked.
4. **Security.** 9 findings, 7 confirmed. Vite went to 8.3.6 (the launch-editor advisories affected only the dev server) and vitest to 5.1.0, which brought `npm audit` to 0. Added the build-only CSP meta tag (`build/csp.ts`, with `connect-src 'none'`) and `.env` entries in `.gitignore`. The shipped app has no HTML sinks and no secrets in its history.
5. **Clean-up.** 41 distinct safe simplifications (+250/-518 lines):
   - removed dead code (`plural`, `normaliseSeed`, `winnersForSeed`, `useAnimatedNumber`, `ratioToBest`, dead copy keys and tokens);
   - folded duplicates into one (`replaySeeds`, `playOut`, the pack builder `content/scenarios/builder.ts`, `baseIdOf`);
   - moved the remaining tuning literals into `engine/tuning.ts`.

   13 risky items were logged rather than applied.
6. **UI.** Took 44 screenshots per pass at 375, 768 and 1280 px, plus a forced-colours pass and a motion-on pass. About 45 fixes:
   - contrast;
   - pressed states that relied on colour alone;
   - a `forced-colors` block;
   - focus hidden under the commit bar;
   - live-region misuse;
   - a notice for an unknown pack;
   - a confirmation before skipping a quarter;
   - nothing-fits and empty-panel states;
   - `voice.emergency`;
   - event slips that carry over.

   axe now reports 0 violations on every screen.
7. **Balance.** Played 3,000 games for each of 12 players across 6 packs. The audit could not be passed at all; the new field `economics.auditAllowance` (dental 12, manufacturer 11, ecommerce 8) brings blended to about 25% passes. Ecommerce cash went from $350k to $425k, so blended now ends past its cash in 14% of games instead of 29%. A judging pass kept 6 of 12 new events. Blended is still the lowest-cost strategy in every pack.
8. **Research.** Wrote [research.md](research.md): about 40 comparable products, 24 ranked features, and 30 claims fact-checked. No code changed.
9. **Wrap-up.** Refreshed CLAUDE.md and the doc map against the code at 30f0c98, with every line range re-checked. Wrote this file.

## What was left

**Decisions for `/land` and the FlintScope site repo** (deployment and CI config were not touched):
- The CI actions are pinned to tags rather than SHAs: `.github/workflows/ci.yml` L18-19 (`actions/checkout@v5`, `actions/setup-node@v5`).
- `frame-ancestors` cannot be set from a meta tag. The FlintScope server should send it as a header for `/game/`.
- `vite.config.ts` imports `./build/csp` without an extension. This works today. It was left alone because the site's CI builds with this config.
- `debug=1` still works in production. It shows only the player's own odds and was judged harmless.

**Risky clean-ups not applied** (overhaul-findings.md, "Phase 5", "Risky, not applied"):
- preact 11 and @types/node 26 (major upgrades);
- the alias block declared in three places;
- trimming the barrel;
- unused fields `playerRank`, `bestStrategy`, `worstStrategy` and `GameState.scenarioId`;
- three jargon regexes that could become one;
- grade thresholds that live in the smallbiz copy;
- the pro `roundLabel`;
- `capitalise` defined twice;
- `KIND_ICON` hard-coded;
- the pro `MISS` 0.2 and ±0.3 literals;
- the tie comparator in pro ProReport;
- pro `applyPlaytest` without a try/catch;
- the copy-link logic duplicated, with its 2 s timer.

Also: four CRLF files and no `.gitattributes`.

**Refuted** (not defects):
- the prng seed wrap (the function was later removed);
- ecommerce going into negative cash, which is a designed state (cash was raised in phase 7);
- `writeUrl` dropping `fix`, `auto` and `debug`, which is intentional;
- `readUrl` with `?s=&seed=5`;
- three further vite advisories;
- the stale Pages site in an old `deploy.yml`.

**Deferred design work:**
- Notes 2, 4, 7, 8, 12 and 15 in [SWEEP-2026-11.md](SWEEP-2026-11.md) from L62 are still open. Notes 1, 3, 5, 6, 9, 10, 11, 13 and 14 are resolved.
- Phase 6 deferrals:
  - move the CTA above the replay buttons;
  - trim the fonts and add fallback metrics;
  - run the long-run simulation after first paint;
  - possibly drop the 900 px breakpoint to 760 px;
  - fix how the event slip wraps under 560 px;
  - remove the duplicate coach and empty-panel text;
  - mark the tiles hit this quarter.

**Balance and tests:**
- Five cards are rarely worth fixing: manufacturer `payroll-shared-pc` and `badges-old-pc`, ecommerce `wifi-slack-password` and `newmarketplace-full-access`, and dental `web-cert`.
- Pro `cheapestFirst` leaves 3-4 points unused each sprint. Pro is parked, so this was not fixed.
- Four mutants survive: `p?.ready`, `!a`, `!baseId`, and the toggle capacity check.
- Two paths are left uncovered on purpose: the durational return in `applyImmediate`, and `replayGrade` with best <= 0.
- `RoundResult.test` fakes an audit pass. A seed that really passes could now be pinned instead.

## Top ten next

The first seven follow research.md's "Suggested order" (L230). All of them are static and leave the CSP unchanged unless noted.

1. **Open Graph and Twitter tags with a fixed image per pack** (research #1). `index.html` has none today, so a shared link shows a bare URL.
2. **A result that copies as text** (#2): one line with the grade, the break-ins and the seed link, for chat apps that drop images.
3. **Challenge framing on the seed link** (#3): "Can you beat my B on this year?" when a player opens a shared seed.
4. **UTM tags on the CTA and footer links** (#6), in `skins/smallbiz/config.ts`, so FlintScope can see that visits came from the game.
5. **A player-style title on the report** (#4), drawn from which strategy the player's picks most resemble.
6. **A CTA tied to the outcome** (#5): different lines for a good year, a bad year and a failed audit.
7. **Keep the game on Back or Reload** (#8, SWEEP note 15): put the round and picks in `history.state` or the URL.
8. **Land-time hardening:** pin the CI actions to SHAs, set `frame-ancestors` on the FlintScope server, and add `.gitattributes`.
9. **Owner decisions:** a daily or weekly seed in the small-business skin (#7) and a host sheet for teams (#10).
10. **Policy calls, then the design backlog:** outbound email capture (#12) and a server-log beacon (#23) both change the "no network calls" promise and the CSP, so they need the owner. Then the open SWEEP notes and the phase 6 deferrals above.
