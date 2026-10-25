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
Updated 2026-10-25. 0 sales so far; 21 guides, none ranking yet as far as we know.
- Koinly is where most buyers are. Koinly's own forum and feedback boards show what Solana users actually hit:
  "missing purchase history" warnings, a wallet that stops syncing or loses older token-account transactions,
  memecoin swaps left as a separate send and receive when a token has no price, and staking balances. Write one
  page per error message, using the words people type ("missing purchase history", "not syncing"), and say early
  on that our file fixes exactly that.
- Every guide is a door to the free analysis. It ends with one clear next step: paste your public address, see
  every row and the balance check for free, pay only to download.
- Prefer one excellent page over two thin ones. Before a new guide, compare it with the closest existing one; if
  they would overlap, improve the old page instead. Link each new page from the hub page and one related guide.
- Stay inside what the product does: swaps, rent, wrapped SOL, Jupiter DCA/limit fills, native staking, closed
  token accounts, own-wallet transfers, failed-transaction fees. NFTs, liquidity pools, lending and liquid staking
  are not covered (SPEC §10 and src/engine/): don't write pages about them.
- From December: freshen the top guides for the new tax year and make the paid step as clear as possible.

## Rules learned (planner adds a rule when a mistake repeats; keep it short)
- Never invent facts about other products; keep statements about them general.
- Every claim about our tool must be in the README, docs/SPEC.md or src/.
- No two pages (or two roadmap items) on the same topic. Two Phantom export pages were written; the planner also
  queued a meta-description fix the daily SEO check had already done. Check `content/` and ticked items first.

## Lessons (reviewer appends one dated line when it fixes something; planner prunes to the last ~15)
- 2026-10-25: Sonnet's first guides and meta fixes were accurate and clean; keep the item specs this specific.
