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
