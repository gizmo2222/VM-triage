# Research: comparable tools and features worth building

Phase 8 of the overhaul, written 2026-11-11. This report compares What First with security-awareness games, vulnerability-prioritisation tools, lead-magnet quizzes and calculators, and browser games that spread by sharing. It then ranks features worth building, with engagement and conversion features first.

## Method and limits

- Six research workers swept the web by topic: awareness games, prioritisation tools, lead-magnet builders, the small-business market, virality, and share mechanics. A seventh fact-checked 30 of the most-quoted claims against their cited pages. Figures the checker could not confirm have been dropped or are marked below.
- Every claim has a link. Some come from search snippets, not opened pages; those are marked *(snippet)*.
- **Vendor benchmarks are marked *(vendor)*.** This covers quiz-builder conversion rates and lead-magnet opt-in rates. No independent study of quiz-gate placement turned up, so treat those numbers as directional only.
- Prices are as listed on the vendor pages in late 2026. They change often.
- Every proposed feature is checked against the project's hard rules: a static site, no backend, no accounts, no analytics, no runtime network calls, and the build CSP in `build/csp.ts` (`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; form-action 'none'; ...`).

## What First today

These are the parts the comparison is measured against.

- **Game.** There are three business packs (dental, manufacturer, ecommerce). Each has 30 problems, 5 fix points a quarter and four quarters, and takes about five minutes. Seeded hidden dice decide which unfixed problems get exploited.
- **Events.** Each pack has **9 events**. They include a zero-day, a new-system event that adds two problems, and a **passable audit**: fix enough of the audit's items in time and the fine is waived. The allowance is dental 12, manufacturer 11 and ecommerce 8.
- **Report card.** It shows:
  - the year's outcome;
  - a luck strip that replays the player's own picks 100 times with fresh dice;
  - bars comparing five "instinct" strategies with the FlintScope order;
  - a 200-year long run.
- **Share and replay.**
  - A 1200x630 canvas share picture, sent through the Web Share API, or downloaded where that is missing.
  - A copy-link that carries the seed.
  - Three replay buttons: "Same code, lose less", "New year, new luck" and "Different business".
- **Call to action.** The main one is the Security Starter, $49 one-time on Gumroad. The secondary one is a free PDF, "The Free Six". The footer says "No accounts, no tracking, nothing leaves your browser."
- **Gaps that matter for sharing.**
  - `index.html` has **no Open Graph or Twitter card tags**, so a pasted link shows a bare URL.
  - The daily seed exists only in the parked practitioner skin (`dailySeed` in `skins/shared/seed.ts`).
  - Back or Reload drops a game in progress (SWEEP-2026-11 note 15).

## Comparables

### 1. Security-awareness and tabletop games

| Tool | What it is | What it does better than What First | Price |
|---|---|---|---|
| [Backdoors & Breaches](https://www.blackhillsinfosec.com/tools/backdoorsandbreaches/classic/) (Black Hills InfoSec) | Incident-response card game. Defenders must reveal four attack cards within 10 turns, rolling a d20 each turn. A [Competitive edition](https://www.blackhillsinfosec.com/projects/backdoorsandbreaches/) adds prep cards and resource tokens. | A physical object a team passes around. A built-in debrief on gaps, tools and fixes. Group play. | Not listed on the product page (decks sold via a shop). |
| [Kaspersky KIPS](https://go.kaspersky.com/interactive-protection-simulation) | Team business simulation, 2.5 hours including a lessons-learned discussion. Live sessions take up to 80 trainees; online up to 300 teams (1,000 people). | Teams compete, and a facilitator leads the debrief. | Not public. |
| [NCSC Exercise in a Box](https://www.ncsc.gov.uk/section/exercise-in-a-box/overview) | Free UK government kit for running your own tabletop or technical exercise. | Government trust. Organisations run it on their own and get a report at the end. | Free. |
| [CISA Tabletop Exercise Packages](https://www.cisa.gov/cisa-tabletop-exercises-packages) | Over 100 free scenario packs with facilitator guides. | Breadth, and ready-made facilitator material. | Free. |
| [Singapore CSA Cyber Essentials in Action](https://www.csa.gov.sg/our-programmes/support-for-enterprises/sg-cyber-safe-programme/cyber-essentials-in-action/) | Role-card tabletop for small businesses, ending in a debrief. | Aimed at small-business owners, like What First. Role cards bring several staff in. | Free. |
| [PBS NOVA Cybersecurity Lab](https://www.pbs.org/wgbh/nova/labs/about-cyber-lab) | Four mini-games with a guest pass. | Variety, plus a classroom-friendly guest mode. | Free. |
| [Bad News](https://pmc.ncbi.nlm.nih.gov/articles/PMC6952868) (Cambridge) | Browser game in which the player creates fake news. | **Peer-reviewed evidence of effect**: N=196, players got better at spotting the six techniques than a control group. | Free. |
| [Riskio](https://eprints.soton.ac.uk/441632/1/Riskio_A_Serious_Game_for_Cyber_Security_Awareness_and_Education.pdf) (Southampton) | Tabletop game in which players both attack and defend. | Seeing things from the attacker's side. | Research project. |
| [Decisions & Disruptions](https://ar5iv.labs.arxiv.org/html/2306.12168) | Lego tabletop game about security investment for managers. | Used as a research tool on how managers decide. | Research project. |
| [CyberCIEGE](https://en.wikipedia.org/wiki/CyberCIEGE) | Navy-sponsored budget-limited security sim from 2005, used by government and universities. | Deep, with many scenarios. | Licence terms not public. |
| [Google Interland](https://www.engadget.com/2017/06/06/google-be-internet-awesome-online-safety/), [NCSC CyberSprinters](https://zenzero.co.uk/news/the-ncsc-launches-online-game-to-give-children-a-head-start-with-staying-cyber-secure) | Safety games for children. | Polish and reach (CyberSprinters has a Welsh edition). | Free. |
| [Trend Micro Targeted Attack](https://newsroom.trendmicro.com/2015-04-09-Trend-Micro-Launches-Targeted-Attack-Simulation-to-Raise-Awareness-of-Pervasive-Next-Gen-Threats) | Choose-your-path attack video game launched April 2015. | A video narrative. | Not confirmed; the current status of the page is unclear. |

Most of these teach **what an attack looks like**. None of them makes the player **choose what to fix under a budget, with luck shown separately from skill**. The nearest is a [2025 four-round cyber-investment game](https://www.informs-sim.org/wsc25papers/con108.pdf). In it, security specialists played no better than risk experts or managers, and players often ignored the threat intelligence they were given. That is the same lesson the What First report card teaches when it compares instincts with the FlintScope order.

On evidence, keep the claims modest. A [2025 study of 12,511 employees at a US fintech firm](https://arxiv.org/abs/2506.19899) found no significant effect on phishing clicks or reporting from lecture training or lecture plus interactive exercises. What First should claim awareness ("see why the order matters"), not changed behaviour.

### 2. Vulnerability-prioritisation tools and methods

The engine's strategies are modelled on these. Few of them are rivals for a small-business owner's attention, but they are the source of the "FlintScope order" argument.

| Tool | What it does | What it does better | Price |
|---|---|---|---|
| [FIRST EPSS](https://www.first.org/epss/) | Daily probability that a published vulnerability is exploited in the next 30 days. | A free, published model with a daily feed. | Free. |
| [CISA SSVC](https://www.cisa.gov/ssvc) | Decision tree with outcomes Track, Track\*, Attend, Act. | A plain verdict per item instead of a score. | Free. |
| CISA KEV / [VulnCheck KEV](https://docs.vulncheck.com/community/vulncheck-kev) | Lists of vulnerabilities known to be exploited. | A clear "this one is being used" flag. | CISA free. VulnCheck KEV is free in its community tier. Its paid Exploit & Vulnerability Intelligence tier is listed on [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-7mkcyad56tjs6) at $259,200 for 12 months *(snippet)*. |
| [Tenable VPR](https://docs.tenable.com/vulnerability-management/Content/Analysis/RiskMetrics.htm) | Vendor risk score that shows its drivers. | Explains why a score is high. | Not published; a third-party estimate of ~$3,700 a year for 100 assets was not verified. |
| [Qualys TruRisk](https://docs.qualys.com/en/vm/latest/mergedProjects/risk_score/trurisk/understanding_your_trurisk_score.htm) | Asset-weighted risk score. | Weights each item by how much the asset matters (What First's "sensitivity"). | Not public; reseller estimates of $199-250 per asset a year are unchecked. |
| [Cisco Vulnerability Management](https://www.cisco.com/c/en/us/products/collateral/security/vulnerability-management/security-risk-score-so.html) (was Kenna) | Risk score. | Large exploit-intelligence data set. | Not public. |
| [Elevation of Privilege](https://shostack.org/eop), [OWASP Cornucopia / Cumulus](https://owasp.org/projects/cumulus) | Threat-modelling card games. | Free printable decks under Creative Commons. A model for a print version. | Free. |

Key numbers behind the "instinct vs order" lesson:

- **Cyentia, Prioritization to Prediction Vol. 1** ([link](https://www.cyentia.com/publication/prioritization-to-prediction-vol-1/)):
  - About **2%** of vulnerabilities are ever exploited, and public exploit code makes exploitation about **7x** more likely.
  - Fixing everything rated CVSS 7 and up gives **32% efficiency**: 32% of the fixes hit something that gets exploited.
  - A 250-feature model about doubles that efficiency ([link](https://www.cyentia.com/?p=24362)).
- **Vol. 2** ([link](https://www.cyentia.com/publication/prioritization-to-prediction-vol-2/)): organisations reach about **70% coverage but only 16% efficiency**.
- **Cyentia on EPSS** ([link](https://www.cyentia.com/epss/)): 13,807 of 237,687 published vulnerabilities (about **6%**) have been seen exploited, and only 4.5% of those reach more than 1 in 10 organisations.
- **Tenable on the Cyentia/FIRST study** ([link](https://tenable.com/blog/epss-shows-strong-performance-in-predicting-exploits-says-study-from-cyentia-and-first)): fixing everything with EPSS at 0.6 or above gives about 60% coverage at 80% efficiency. At 0.1 or above it gives 80% coverage at 50% efficiency.

No game whose whole subject is patch prioritisation turned up. [CyGATE](https://arxiv.org/abs/2508.00478) uses patch scheduling as a research test bed, not as a game for people. The niche looks open, but that cannot be proven from a search.

### 3. Lead magnets: quizzes, graders and calculators

| Tool | What it is | What it does better | Price |
|---|---|---|---|
| [HubSpot Website Grader](https://blog.hubspot.com/marketing/website-grader-relaunch) | Free site score; about 4M sites graded. | **Personal results about the visitor's own site.** The full report is behind an email gate. | Free. |
| [Coalition free risk assessment](https://www.coalitioninc.com/free-risk-assessment) | Insurer's free external scan. [Its guides](https://www.coalitioninc.com/topics/5-essential-cyber-insurance-requirements) link controls to cover. | Ties fixes to **insurance premiums**, which is the owner's real motive. | Free (current availability not verified). |
| [IASME Cyber Essentials Readiness Tool](https://getreadyforcyberessentials.iasme.co.uk/) | Free 12-section question set before certification. | Leads straight into a paid certification ([from £320 + VAT for micro organisations](https://iasme.co.uk/iasme-cyber-assurance/)). | Free. |
| [Mastercard small-business cyber assessment](https://www.mastercard.com/mt/en/news-and-trends/stories/2026/small-business-cybersecurity-assessment.html) | Quiz that ends in a PDF plan. | A personalised plan document as the reward. | Free. |
| [NCSC Small Business Guide](https://www.ncsc.gov.uk/collection/small-business-guide) and Cyber Action Plan | Five steps, printable A5, plus a personalised action plan. | Printable, and personal without an account. | Free. |
| [GCA Small Business Toolkit](https://gcatoolkit.org/smallbusiness/) | Six steps of free tools, no login. | The tools do the fixing. | Free. |
| [Cyber Readiness Institute programme](https://cyberreadinessinstitute.org/cyber-readiness-program) | Self-paced course with a certificate and a website badge. | **A badge the owner can show.** Needs a free account. | Free. |
| [FTC Cybersecurity for Small Business](https://www.ftc.gov/business-guidance/small-businesses/cybersecurity/quiz/basics) | Short quizzes for staff. | Official trust and a familiar format. | Free. |

Quiz and calculator builders, for scale. These are what a competitor would use to make a "cyber score" quiz.

| Builder | Price per month |
|---|---|
| [Outgrow](https://outgrow.co/pricing/) | Free plan; paid up to Business $720; Enterprise unpriced |
| [ScoreApp](https://www.scoreapp.com/pricing) | Starter $39, Business $99, Pro $149, Enterprise from $799 (no free plan seen) |
| [involve.me](https://www.involve.me/pricing) | Free plan; Start $49, Grow $99, Scale $199; Enterprise from $499 |
| [Typeform](https://www.typeform.com/pricing/) | Free (limited); Basic $39, Plus $79, Business $129 |
| [Interact](https://www.tryinteract.com/plans) | Billed annually: Free, Lite $27, Growth $53, Pro $125 |

Conversion figures, all *(vendor)*, directional only:

- [Outgrow benchmarks](https://outgrow.co/blog/user-engagement-benchmarks/):
  - Completion is 85-95% for quizzes, 35-55% for calculators and 25-45% for B2B assessments.
  - 8-30% of finishers share results.
  - Results with four or more outcomes get shared about 3x as often as two-outcome results.
  - Showing results before asking for an email beats gating up front by 20-35%.
- Opt-in rates measured against people who *started* the quiz run from about 10% to 40%, depending on the vendor ([roundup](https://dupple.com/blog/quiz-funnels-vs-lead-magnets-which-one-wins-the-conversion-battle-in-2026)). Interact's widely quoted 40.1% could not be traced to an Interact page.
- Downloadable guides are quoted at around 5%, and the median lead-magnet opt-in at just under 3%.

The market the CTA sells into:

- **Paid templates on Gumroad** sell at $15 to $99 (vendor-listed *(snippet)*):
  - [CyberClarity 15 policies](https://cyberclarity.gumroad.com/l/cyberpolicies-smb): $15.
  - Klevrly 5-policy pack: $59.99.
  - An employee security guide: $99.
  - The $49 Starter sits in the middle of that range. It is the only one with a game in front of it.
- **Managed services cost far more:**
  - [Huntress managed EDR](https://www.huntress.com/lp/pricing): $8.99 per endpoint per month with a 50-endpoint minimum.
  - [vCISO retainers](https://sidechannel.com/blog/the-ultimate-guide-to-vciso-pricing-everything-you-need-to-know): about $2,000-$5,000 a month (vendor marketing *(snippet)*).

### 4. Browser games and results that spread by sharing

| Example | Mechanic | Result |
|---|---|---|
| Wordle ([BuzzFeed](https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy), [TechCrunch](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth)) | One shared puzzle a day and a spoiler-free emoji grid. Players shared the grid by hand before it was built into the game. | Grew from about 90 players (1 Nov 2021) to over 300,000 (2 Jan 2022). 1.2M grid tweets in 1-13 Jan 2022. The NYT credited it with "tens of millions" of new users. Even so, only about 100,000 of about 2M daily players shared on a given day. |
| [FT Uber Game](https://source.opennews.org/articles/how-and-why-financial-times-made-uber-game/) | 5-10 minute choice game that ends with a percentile against other players. | Over 70% of starters finished; about 122,000 playthroughs. The team tracked where players dropped off at each decision. |
| Spent ([PR Newswire](https://www.prnewswire.com/news-releases/spent-the-online-game-about-surviving-poverty-and-homelessness-reaches-its-millionth-play-and-invites-congress-to-accept-the-challenge-128781258.html), [WUNC](https://www.wunc.org/post/urban-ministries-grateful-spent)) | Poverty sim with four end actions: donate, get involved, replay, share. | Over 1M plays with an average of 9 minutes on the site. About $41,000 raised. Early figures were about 70 donations from 145,000 games, **well under 1%** ([snippet](https://sandbox.philanthropy.com/news/online-game-draws-attention-and-money-for-the-needy/)). |
| [Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips) | Idle game that saves in the browser. | 450,000 players in 11 days. |
| NYT dialect quiz ([Knight Lab](https://knightlab.northwestern.edu/2014/01/20/behind-the-dialect-map-interactive-how-an-intern-created-the-new-york-times-most-popular-piece-of-content-in-2013/)) | The result says something about *you*. | The most popular NYT piece of 2013. |
| [The Evolution of Trust](https://www.exploring-economics.org/en/discover/the-evolution-of-trust/), [Parable of the Polygons](https://en.wikipedia.org/wiki/Parable_of_the_Polygons) | Short interactive explainers of a model. | Widely shared and used in teaching. They are the closest match to What First's "show the model" style. |
| NYT Games streaks ([INSEAD on streak research](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-the-key-is-keeping-them-alive-19011)) | Streaks and statistics. | A JCR study found an intact streak raises persistence but a broken one lowers it. The authors suggest weekly streaks as the gentler option *(snippet)*. |

Share mechanics:

- [LinkedIn](https://www.linkedin.com/help/linkedin/answer/a521928) wants og:title, og:image, og:description and og:url, with an image of at least 1200x627 at a ratio of 1.91:1. Images under 401 px wide show as a small thumbnail. What First's 1200x630 picture fits.
- A [guide to OG images](https://screenhance.com/blog/og-image-best-practices) confirms 1200x630 is the standard, and that no rigorous study shows how much a preview image lifts clicks.
- [`navigator.share()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) needs HTTPS and a user tap, and file sharing must be checked with `canShare({files})`. It is not Baseline, so the download fallback must stay. It does stay today.

### 5. Small-business context (for copy, not features)

- **UK** ([Cyber Security Breaches Survey 2025](https://www.gov.uk/government/statistics/cyber-security-breaches-survey-2025/cyber-security-breaches-survey-2025)): 43% of businesses had a breach or attack (micro 42%, small 46%). Phishing was involved in 85% of them.
- **Verizon DBIR 2025** ([via Infosecurity](https://infosecurity-magazine.com/news/verizon-dbir-smb-ransomware-attacks)): ransomware was in 88% of small and mid-size business breaches, against 39% at larger firms. Part of the jump may come from new small-business contributors to the data.
- **Hiscox 2023** ([link](https://www.hiscox.com/articles/cyber-attacks-cost-us-small-businesses-over-8000-annually-reveals-hiscox-cyber-readiness)): the median annual cost of attacks to a US small business was $8,300.
- **IBM Cost of a Data Breach 2025** ([via Help Net Security](https://helpnetsecurity.com/2025/08/04/ibm-cost-data-breach-report-2025)): a global average of $4.44M, a record US average of $10.22M, and 241 days to identify and contain. These are large-company numbers; do not use them for small firms.
- **Barriers owners name:**
  - Cost first: 47% in a Mastercard survey ([snippet](https://www.securitymagazine.com/articles/89905-global-security-alliance-and-mastercard-create-small-business-cybersecurity-toolkit?v=preview)), 48% in [Untangle 2019](https://betanews.com/2019/08/27/budget-staffing-smb-security/) and 41% among firms already attacked in [Clutch 2026](https://clutch.co/press-releases/cyberattacks-recovery-smb).
  - Then time and know-how.
  - Two-thirds of owners give up personal time to keep up ([VikingCloud 2026](https://www.vikingcloud.com/blog/vikingcloud-2026-smb-threat-landscape-report-cyber-risk-rises-and-the-human-cost-grows)).
  - The game's premise, "a budget that covers a fraction", is the owners' own top complaint.

## What the comparables do better

1. **Pasted links preview.** Every comparable that spreads has a link preview. What First's links show a bare URL. This is the cheapest gap to close.
2. **A text result anyone can paste.** Wordle's grid spread before the button existed. What First shares a picture and a link, but no one-line result.
3. **A shared reference point.** A daily puzzle, a percentile or a "same year as me" challenge gives people something to compare. What First has the seed link, but its copy never invites a comparison.
4. **A result that names the player.** The dialect quiz and graders say something about *you*. What First says how the year went, not what kind of decider the player is.
5. **A debrief and group play.** Backdoors & Breaches, KIPS, the CSA role cards and Exercise in a Box are all played by a team and end in a discussion. What First is played alone.
6. **A personal plan or proof to show.** Mastercard's PDF, NCSC's action plan and the CRI badge give something to keep. What First's reward is the $49 product or a generic free PDF.
7. **Insurance as the motive.** Coalition ties every control to premiums. What First's copy does not mention insurers.
8. **Measured drop-off.** The FT measured completion at each decision. What First cannot, by design. Playtest links and server logs are the substitutes.

What First already does better than all of them:

- It **separates luck from skill**: the 100-replay luck strip and the 200-year long run.
- It runs in five minutes with **no account and no email gate**.
- Its events make the year feel alive: 9 per pack, including a **passable audit** that rewards planning ahead.
- It is the only game found whose whole subject is **what to fix first** under a budget.

## Ranked features

Ranking weighs expected effect on shares and CTA clicks, then evidence, then effort. Effort is S (under a day), M (a few days) or L (a week or more). "Static" means it fits the static site and the current CSP unchanged, unless the row says otherwise.

### Engagement and conversion

| # | Feature | Why (evidence) | Effort | Static / CSP |
|---|---|---|---|---|
| 1 | **Open Graph and Twitter card tags, with one fixed 1200x630 image per pack** (or one for the game). Pack-specific `?b=` links can only share the generic card. | Every pasted link shows a bare URL today. LinkedIn lists the four tags it reads. | S | Static. Meta tags and a PNG file are not restricted by the CSP. The image URL must be absolute, so it depends on `BASE_PATH` at build time. A **per-seed** image is impossible: crawlers do not run JavaScript, and there is no server. |
| 2 | **Copy-as-text result** next to the share picture: a spoiler-free line with the year's cost, one symbol per quarter (safe or broken into), the player's style and the seed link. | Wordle's grid (1.2M tweets in 13 days). Text pastes into any chat. | S | Static. `navigator.clipboard.writeText` is already used for the copy-link. The symbols need text labels, so the line does not rely on emoji alone. |
| 3 | **Challenge framing on the seed link and share picture**: "Same year, same dice. Can you lose less than $X?" | Comparison drives sharing (Wordle, FT percentile). The seed link already gives the same dice. | S | Static. If the sender's score goes in the URL it can be faked; show it only as "your friend says". |
| 4 | **Player-style title on the report and share picture**, worked out from the player's picks against the five instincts (for example "The Firefighter" or "The Bargain Hunter"). | The dialect quiz effect. Results with four or more outcomes are shared about 3x as often *(vendor)*. | S-M | Static. Copy goes in `content/` and must be jargon-free (the existing jargon test covers it). |
| 5 | **CTA tied to the outcome**: lead with the free PDF after a lucky year, lead with the Starter after a bad one, and name the player's worst miss alongside the Starter step that covers it. | Spent's donation rate was under 1%, so expect a low click rate and make the CTA personal. Graders win with personal results. | M | Static, plain links. The worst-miss mapping is content, kept in `content/copy/smallbiz.ts`. |
| 6 | **UTM tags on each outbound CTA link** (`utm_source=whatfirst`, `utm_content=` per button and per pack). | The [Gumroad dashboard](https://gumroad.com/help/article/74-the-analytics-dashboard) reports referrers and UTM campaigns. It shows which placement sells with no script on the page. | S | Static. The tag is on the link only. Gumroad sees only people who click through. Mention it in the privacy line. |
| 7 | **Daily seed in the small-business skin** ("Today's year: same dice for everyone"), a button on the intro screen. | Wordle's shared daily reference point. `dailySeed` already exists. | S | Static (UTC date hash). No leaderboard is possible. A five-minute game may suit "this week's year" better than daily; the choice is the owner's. |
| 8 | **Keep the game on Back and Reload** (sessionStorage, or history entries per quarter). | Losing a game on Reload kills sharing and replay (SWEEP note 15). | M | Static. sessionStorage stays on the device. Wrap it in try/catch for private windows. |
| 9 | **Local "games played" and "best year"** in localStorage. Avoid strict daily streaks. | NYT Games keeps stats. The JCR streak study says broken streaks reduce persistence. | S-M | Static. Stored only on the device. The footer promise needs a small wording change ("nothing leaves your browser" stays true). |
| 10 | **"Play it as a team" host sheet**: a printable one-page guide that runs one seed in a staff meeting, with three debrief questions. | Backdoors & Breaches, KIPS, CSA role cards and Exercise in a Box are all group play with a debrief. The buyer is often in that meeting. | S-M | Static: a print stylesheet or a PDF in `public/`. |
| 11 | **Insurer framing**: "What an insurer would ask about your year" lists which of the player's fixes match common insurance-questionnaire controls (MFA, backups, patching). | Coalition shows insurance is the owner's real motive. The Starter already answers insurance questionnaires. | M | Static, content only. Never claim a given insurer accepts anything. |
| 12 | **Outbound email capture**, if wanted: a link to a Mailchimp hosted form or a Gumroad free product for the Free Six PDF. | [Mailchimp hosted forms](https://mailchimp.com/es/signup-referrals/) work as a plain link on the free plan. Showing results before asking beats gating up front *(vendor)*. | S | Static only as an **outbound link**. An embedded form breaks `form-action 'none'` and `script-src 'self'`. Keep the game itself ungated; the no-account promise is a selling point. |
| 13 | **"Questions about your result?" mailto link** prefilled with the seed and year cost. | A higher-intent contact for a small consultancy. | S | Static. mailto is a navigation, not a form submit. Prefill only what the player already sees. |
| 14 | **Strategy-rank line**: "You beat 4 of 6 playbooks this year." | The FT percentile, without other players. The engine already scores all strategies on the same dice. | S | Static. A real percentile against other players would need a backend. |

### Learning depth

| # | Feature | Why | Effort | Static / CSP |
|---|---|---|---|---|
| 15 | **"How the dice work" page**: base rate, exposure, known-exploited multiplier, and why the long run matters. | Evolution of Trust and Parable of the Polygons spread by showing the model. Cyentia's 2% / 6% figures make it concrete. | M | Static: a second page or a section in `content/`. No jargon in the small-business skin; plain words for EPSS and KEV. |
| 16 | **Coverage and efficiency line on the report**: "4 of your 20 fixes hit something that got used; you covered 4 of the 7 break-ins." | Cyentia's coverage/efficiency framing is the industry's own yardstick. | S-M | Static. The engine already has truth and choices. |
| 17 | **A "why" line per break-in** in the reveal ("exposed to the internet and attackers were already using it"). | Tenable VPR wins by showing what drives a score. | M | Static, content plus engine fields that already exist. |
| 18 | **Hindsight labels** on the report: Fix now / Soon / Watch / Leave. | SSVC gives a plain verdict instead of a score. Do not use the SSVC names in the small-business skin (jargon test). | M | Static. |
| 19 | **Before-and-after guess**: "Which fix matters most?" asked before quarter 1 and again on the report. | Bad News persuades because it shows a change. This is a personal "you changed your mind" moment, not evidence. | S-M | Static, kept in memory on screen only. |
| 20 | **Printable 30-card deck** per pack. | Elevation of Privilege and Cornucopia are free printable decks that get passed around. | M | Static PDF. |
| 21 | **Attacker-view replay** of the year. | Riskio and Bad News teach through the other side. | L | Static. Adds length; risks diluting the five minutes. |
| 22 | **Role prompts** for team play (owner, office manager, IT contractor). | CSA role cards. | M | Static. Depends on #10. |

### Measurement without analytics

| # | Feature | Why | Effort | Static / CSP |
|---|---|---|---|---|
| 23 | **Server-log counts** on the FlintScope host: hits on `index.html`, the share-picture download and the free PDF. Optionally the report screen fetches a tiny same-origin image (`/game/done.gif`) to count finishes. | The only way to count starts and finishes with no script. | S (out of repo) | The log reading is outside this repo. The beacon image fits `img-src 'self'`, but it is a runtime network request, which the project says it does not make. The project's privacy copy would have to change, so treat it as **a policy decision, not a free win**. |
| 24 | **Playtest review of the longest rounds** with the existing `?fix=` and `?auto=` links, in place of drop-off tracking. | The FT measured drop-off per decision; we cannot. | S | Static, already possible. |

## Would break the constraints (not recommended)

These came up in research but need a backend, analytics or a CSP change. Each is listed with the part of the design it breaks.

- **Analytics scripts or event tracking** (Google Analytics, Plausible, PostHog). They break `script-src 'self'` and `connect-src 'none'`, and the footer promise.
- **Leaderboards, or percentiles against other players** (the FT style). They need a server to collect scores and `connect-src`.
- **Per-seed or per-result Open Graph images.** Crawlers do not run JavaScript, so they need a server that renders images.
- **An embedded email form, or a quiz builder embed** (Outgrow, ScoreApp, Typeform, Mailchimp embed). They break `form-action 'none'`, `script-src 'self'` and often `frame-src`. Link out instead (#12).
- **Accounts, cloud saves or a badge with verification** (the CRI style). These need a backend and accounts.
- **Live threat data** (a daily EPSS or KEV feed). This breaks `connect-src 'none'`. Bake data in at build time if it is ever needed.
- **Multiplayer in real time.** This needs a server. The same-seed link (#3) and the host sheet (#10) cover the social part statically.

## Suggested order

1. Do **#1, #2, #3 and #6** together. They are all small, all static, and they fix the biggest gap: shared links that show nothing, and no way to tell which CTA placement works.
2. Then do **#4, #5 and #8**. These are the identity title, the outcome-tied CTA and keeping the game on Back or Reload.
3. Then do **#7 and #10**: the daily or weekly seed and the team host sheet. They need the owner's decision on daily against weekly, and on whether a staff-meeting format fits the brand.
4. Decide **#12 and #23** as policy questions before building them. They touch the "no accounts, nothing leaves your browser" promise.
