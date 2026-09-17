# Skin 2: pro (practitioner edition)

Not built yet. This folder holds a "coming soon" entry point at `/pro/` and this scope note.

## Audience

Security practitioners, vCISOs, MSSP analysts. People who already know what CVSS, EPSS and KEV are and have opinions about them.

## What it adds over smallbiz

Everything below is served by the existing engine without changes. The engine already carries `techTitle`, `severity`, `likelihood`, `knownExploited`, `compliance`, and `tags` on every finding, and every strategy is a pure ranker over those fields.

- **Real terminology.** Show `techTitle`, the CVSS-like score, the EPSS-like probability, the KEV flag, and the asset's criticality and exposure. Show the event's `techBody`.
- **Explicit methodology selection.** Each round the player picks a method and sees the ranked backlog it produces before committing: CVSS-first, EPSS-first, KEV-first, SSVC-style (a decision tree over exploitation, exposure, and mission impact), and blended. SSVC is the one strategy that needs adding to `engine/strategies.ts`; it fits the `Ranker` signature.
- **Longer games and harder decks.** 8 to 12 rounds via `ScenarioConfig.rounds`. A pro deck with more zero-days, chained events, and an audit that recurs. Pro scenario packs live in `content/scenarios/` beside the smallbiz ones and set `config` accordingly; a pack can be shared by both skins with different `config` overrides.
- **Daily seed.** `skins/shared/seed.ts` exports `dailySeed()`, which hashes the UTC date. Everyone who plays today gets the same backlog and the same dice, so scores compare. The URL still carries an explicit seed for sharing a specific run.
- **Scorecard with the numbers.** The counterfactual table shows per-strategy incidents, cost, and which rounds each strategy fixed which findings (`OutcomeSummary.fixedByRound`). Optionally reveal `GroundTruth.trueLikelihood` after the game so the player can see where the visible estimates were wrong.

## What stays the same

- No accounts, no network calls, no tracking. A "leaderboard" is a shared link, not a server.
- Same theme file. Pro can add its own `app.css` but reads brand tokens from `skins/smallbiz/theme.css` or a shared copy moved to `skins/shared/`.
- Keyboard playable, contrast-checked, nothing carried by colour alone.

## Suggested build order

1. Add `ssvc` to `StrategyId`, implement the ranker, extend the balance test.
2. Write a pro config for the dental pack (more rounds, full deck) and a second pack aimed at a mid-market company.
3. Screens: methodology picker, ranked-backlog preview, technical round result, technical scorecard.
4. Daily seed banner and "share today's run" link.
