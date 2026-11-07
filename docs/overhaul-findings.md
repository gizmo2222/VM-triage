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
