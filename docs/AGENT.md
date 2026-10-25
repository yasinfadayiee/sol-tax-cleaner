# Agent playbook

The autopilot that runs SolTax Cleaner reads this file every run. It is the agent's memory and strategy, and the
agent keeps it up to date itself: the weekly planner (Opus, `plan.yml`) rewrites "Strategy" and "Rules learned",
and the daily reviewer (Opus, `review.yml`) adds to "Lessons". Sonnet improvement runs read it but don't edit it.
The owner does not review changes. Workflows, payments and scripts stay off limits to the agent; only people
change those.

## Mission
Reach a steady **$1,000 a month** from SolTax Cleaner (0.25 SOL or 29 USDC per wallet set, 365 days), with no work
from the owner. At that price that is about 35-40 sales a month. Buyers are Solana users whose tax software
(Koinly, CoinTracker, CoinLedger, Awaken) shows a wrong or messy history, most of them between January and April.
Visitors come from Google and AI search (ChatGPT, Perplexity, Gemini); there is no ad budget and no social posting.

## How progress is measured
The briefing lists sales so far (from `sale` issues opened by the daily check) and the latest weekly report.
Search impressions are not available to the agent yet. Judge each week by: sales, then pages that answer a real
buyer question no other page answers, then site quality (SEO check clean, no wrong claims).

## Strategy (planner keeps this current; a few lines)
- Until the first sales: grow buyer-intent pages (people whose tax tool is wrong right now), make every guide
  lead to the analyser and the free sample, and keep the site fast and trustworthy.
- Prefer one excellent page over two thin ones. Cover a problem fully, then link it from related guides.
- From December: freshen the top guides for the new tax year and make the paid step as clear as possible.

## Rules learned (planner adds a rule when a mistake repeats; keep it short)
- Never invent facts about other products; keep statements about them general.
- Every claim about our tool must be in the README, docs/SPEC.md or src/.

## Lessons (reviewer appends one dated line when it fixes something; planner prunes to the last ~15)
- 2026-10-25: Sonnet's first guides and meta fixes were accurate and clean; keep the item specs this specific.
