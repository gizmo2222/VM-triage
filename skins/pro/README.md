# Skin 2: pro (practitioner edition)

Served at `/pro/`. Same engine and the same three packs as the small-business game, played with the pro configuration: eight sprints, five points a sprint, an event from sprint one.

## What it does

- **Real terminology.** Technical titles, CVSS-like severity, EPSS-like probability, the KEV flag, asset criticality and exposure, the attestation flag. Event cards use their technical text.
- **Methodology picker.** Each sprint: Manual, CVSS-first, EPSS-first, KEV-first, SSVC-style, Blended (FlintScope), Asset-first, Compliance-first, Cheapest-first. Picking one sorts the table and pre-selects a fill under capacity. Anything can be changed by hand.
- **Daily seed.** With no seed in the URL, the seed is the UTC date hashed, so everyone who plays today gets the same backlog and dice. The debrief's share link carries the seed either way. A custom seed can be typed on the intro.
- **Debrief.** This year against every method on the same dice, with each method's picks per sprint; a replay grade (your picks and each method's picks replayed through 100 versions of this year with the same event order and fresh dice); a 200-year long run with mean cost and win share; and the ground truth table: visible EPSS beside the true probability the dice used, and what happened to each finding.
- **Playtest hooks** work here too: `?fix=`, `?auto=`, `?debug=1` (see the root README).

## Strategies added for this skin

- `likelihoodFirst`: pure EPSS order. Ignores the KEV flag on purpose, to show what KEV adds.
- `ssvc`: a coarse SSVC-style tree. Exploitation (KEV = active, EPSS at or above 0.4 = PoC, else none), exposure (internet or not), mission impact (criticality 4 to 5 high, 3 medium, else low). Buckets combine into Act, Attend, Track*, Track. Within a tier, severity breaks ties. It is deliberately simple; it is here to be compared, not to be authoritative.

Both are in `engine/strategies.ts` and covered by the balance test, which runs the pro configuration of every pack as well as the four-sprint one.

## Not done

- No leaderboard. A "daily" run is compared by sharing the link and comparing cost. Building a leaderboard would need a backend, which the project rules out.
- The SSVC tree is an approximation of the published decision points, not an implementation of them.
