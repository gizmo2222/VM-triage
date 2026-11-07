# Overhaul state

Shared ledger for the ten-session overhaul of this repo. Every session reads this file first and writes to it last. Branch per phase: `overhaul/phase-N`, each cut from the previous phase's branch (phase 1 from `main`). Nothing is pushed or merged until session 10 (`/land`).

Started 2026-11-07 from `main` at 6f9b078.

| Phase | Name | Status | Branch | Notes |
|------:|------|--------|--------|-------|
| 1 | Map | done | overhaul/phase-1 | CLAUDE.md and docs/doc-map.md written; no code changed |
| 2 | Bug hunt | todo | | |
| 3 | Tests | todo | | |
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
