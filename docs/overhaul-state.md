# Overhaul state

Shared ledger for the ten-session overhaul of this repo. Every session reads this file first and writes to it last. Branch per phase: `overhaul/phase-N`, each cut from the previous phase's branch (phase 1 from `main`). Nothing is pushed or merged until session 10 (`/land`).

Started 2026-11-07 from `main` at 6f9b078.

| Phase | Name | Status | Branch | Notes |
|------:|------|--------|--------|-------|
| 1 | Map | done | overhaul/phase-1 | CLAUDE.md and docs/doc-map.md written; no code changed |
| 2 | Bug hunt | done | overhaul/phase-2 | 12 confirmed bugs fixed with regression tests; rest in docs/overhaul-findings.md |
| 3 | Tests | done | overhaul/phase-3 | 10 new test files, 243 tests; coverage 68% to 95% of statements; 49 of 53 mutants killed |
| 4 | Security | todo | | |
| 5 | Clean-up | todo | | |
| 6 | UI | todo | | |
| 7 | Simulation or game balance | todo | | |
| 8 | Research | todo | | |
| 9 | Wrap-up | todo | | |
| 10 | Land | todo | | |

## Applicability (decided in phase 1)

- Phase 6 (front end): APPLIES. Two Preact skins; the published one is served at `/` by `npm run dev` on http://localhost:5173 (`.claude/launch.json` config `dev`). The pro skin at `/pro/` is parked and need only be smoke-checked.
- Phase 7 (simulation or game): APPLIES. The engine is a seeded simulation with eight strategies; `engine/__tests__/balance.test.ts` already runs 500 seeds per scenario and is the gate; `BALANCE_REPORT=1` writes per-scenario tables; playtest URL params `fix`, `auto`, `debug` script games. New content means new scenario packs under `content/scenarios/`.
- Phase 8 (product with competitors): APPLIES. The game is a published FlintScope lead magnet at https://flintscope.com/game/. Comparables are security-awareness and tabletop-exercise games and vulnerability-prioritisation trainers; pricing is mostly moot because this one is free, so the report should weigh engagement and conversion features instead.

## Phase notes

### Phase 1: Map

- Created CLAUDE.md (project summary, PowerShell 5.1 build/run/test commands, rules of the codebase, a short doc map, known loose ends) and docs/doc-map.md (the full map, every exported symbol with line ranges as of 2026-11-07, plus build and config files). The map was split so CLAUDE.md stays small enough to auto-load every call.
- Verified on `main` before any change: `npm test` 13 files, 116 tests pass in about 15 s; `npm run build` (typecheck plus Vite) exits 0. No source file was touched in this phase.
- Phase 2 needs: use the four areas in docs/doc-map.md (engine; content; smallbiz skin; shared helpers plus pro skin) as worker areas and its line ranges in briefs. Start from the loose ends listed at the end of CLAUDE.md and the fifteen open notes in docs/SWEEP-2026-11.md from line 62. Any change to packs or `engine/tuning.ts` must re-run the balance test. Cut `overhaul/phase-2` from `overhaul/phase-1`.

### Phase 2: Bug hunt

- Workflow of 16 agents: 8 finders (engine, content, smallbiz, shared plus pro; logic and robustness each), 4 skeptics, 4 Sonnet fixers. 26 candidates, 20 confirmed (13 distinct), 6 refuted. Fixed: duplicate ids in a `fix=` link crashed both skins (deduped in the parser, skipped in `commitScripted`, smallbiz App falls back to a fresh game on any playtest throw); `validateScenario` accepted NaN; `replayLuck` counted ties as worse and could include the played year; event copy said 2.5x for a x4 boost, "three fixes" for a variable cut, and "this quarter" for a two-quarter zero-day; reveal stuck if reduced motion turned on mid-reveal; ledger days rounded 0.23 to 0; inconsistent report sort comparator; stale pro daily seed across UTC midnight; pro default pack not drawn from ready packs.
- After: `npm test` 18 files, 136 tests pass (balance gate included, packs changed text only); typecheck and `npm run build` exit 0. Choice made without asking: `replayLuck` now counts a tied replay as half beaten, and the played seed in the replay range is swapped for seed 100000+years.
- Phase 3 needs: docs/overhaul-findings.md lists the untested paths phase 2 left (`replayGrade` seed swap, RoundResult reduced-motion effect has no DOM test) and two confirmed design gaps for phase 6 (`voice.emergency` never rendered, no cue for the zero-day's second quarter). Cut `overhaul/phase-3` from `overhaul/phase-2`.

### Phase 3: Tests

- Baseline coverage (v8) was 67.7% statements, 64.2% branches, 72.1% functions. Nine Sonnet workers, one per module (engine core, scorecard, content copy, shared helpers, smallbiz App, Round, reveal, components, pro skin), wrote 10 new test files with 243 tests. Coverage is now 94.9% statements, 88.8% branches, 96.8% functions. The suite has 28 files and 379 tests, and every one passes. Typecheck and `npm run build` exit 0. No worker reported a suspected bug. The two gaps phase 2 left are now covered: the `replayGrade` seed swap, and reduced motion switched on mid-reveal in RoundResult.
- Mutation pass: workers proposed 53 targeted mutants and a sequential runner applied each one and ran its test file. 45 were killed on the first pass. Four survivors were then killed with stronger tests: the reveal `ended` guard, the FindingCard no-fit guard, the pro daily seed across midnight, and `resolveStart`. The other four are equivalent or masked, and docs/overhaul-findings.md explains each. Two choices were made without asking. `happy-dom` became a devDependency, because DOM tests need it. `@vitest/coverage-v8` was installed with `--no-save` for measurement only, and `coverage/` was added to .gitignore.
- Phase 4 needs: include the new devDependency `happy-dom` (^21.0.4) in the dependency review. To re-measure coverage, run `npm install --no-save @vitest/coverage-v8@5.0.1`, then `npx vitest run --coverage --coverage.reporter=text-summary --testTimeout=60000`. The longer timeout is needed because the dynamic-import test in skins/smallbiz/App.test.tsx exceeds 5 s under instrumentation. Cut `overhaul/phase-4` from `overhaul/phase-3`.
