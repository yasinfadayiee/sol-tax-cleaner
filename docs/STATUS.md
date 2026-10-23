# Project status — read this first

This file is the hand-off between chat sessions. Read it (plus `AGENTS.md` and `docs/SPEC.md` only if the task
needs them) instead of re-reading the whole codebase. **Update it at the end of every session.**

Last updated: 2026-10-23

## The product
SolTax Cleaner: a static, browser-only site. A Solana user pastes wallet address(es); the browser reads their full
history from a Solana RPC, rebuilds each transaction (one swap = one row, rent/WSOL netted out, DCA/limit-order
fills that touch only token accounts recovered) and exports a Koinly Universal CSV + a review report.
Free analysis and preview; download unlocks after paying SOL to the owner's wallet (on-chain memo check, no server).

- Repo: https://github.com/yasinfadayiee/sol-tax-cleaner (branch `main`)
- Site (once Pages is enabled): https://yasinfadayiee.github.io/sol-tax-cleaner/
- Owner: Yasin (lives in Iran; talk to him in Persian, simply). Paid in SOL to his own self-custody wallet.

## Owner decisions (do not re-ask)
- No backend ever; user data stays in the browser. Never calculate tax ("not tax advice").
- Don't rely on Wise for revenue (bars Iran residents). Exclude US customers in the Terms.
  No borrowed identities; avoid OFAC-sanctioned Iranian exchanges (Nobitex, Wallex, Bitpin, Ramzinex).
- Claude builds everything itself (owner said Codex is weaker); owner just approves.
- Work autonomously through the roadmap without waiting for Yasin between steps; only message him for results
  or blockers (Yasin, 2026-10-22).
- Claude may merge its own PRs into `main` and ship without asking (Yasin, 2026-10-22).
- To save Claude usage, owner opens a new chat for each part of the project. Keep this file current.

## Done
- Engine (`src/engine`): estate accounting, classify (swap/deposit/withdrawal/fee/complex), fee folding.
- RPC (`src/rpc`): rate-limited client with retries, IndexedDB cache, full-history discovery incl. token accounts,
  token names via Token-2022 metadata → Metaplex → fallback, user ticker overrides.
- Export (`src/export`): Koinly CSV + Markdown report. License (`src/license`): Solana Pay URL + memo `STC-YYYY`.
- UI (`src/ui`, `src/App.tsx`): landing page, analyser, results preview, token editor, payment with QR.
- SEO/legal pages: `content/*.md` → `scripts/build-pages.mjs` (also sitemap/robots).
- Tests: 49 unit tests pass (`npm test`). Browser smoke test with mocked RPC passed (desktop/mobile, light/dark).
- CI: `.github/workflows/deploy.yml` (lint+test+build, deploy to Pages) and `mainnet.yml`
  (`tests/mainnet.test.ts`: full history of 3 real Jupiter users, rows must reconcile to on-chain balances).
- GitHub Pages is enabled: the Deploy workflow deployed successfully on 2026-10-22 (run 39779981052).
- Payments configured: `MERCHANT_ADDRESS` = C6fwRzwGVLBhBnLmiWqKgR25qBz4U3ysNuEKse519G6V (Yasin's public wallet).
  Price 0.25 SOL or 39 USDC (#12), 365 days, up to 5 wallets; Yasin let Claude choose (below Koinly's $49 entry plan).
- Mainnet check is green: all 3 real wallets reconcile exactly to on-chain balances (run 39780634996).
- Design overhaul (2026-10-22): logo, gradient hero with a 3D 'rows merge into one' visual, trust strip, feature
  cards, pricing card, FAQ cards, guide cards, self-hosted Inter, og.png + apple-touch-icon (`scripts/brand/`).
  Analysis of next steps (Persian): https://claude.ai/artifact/SgNWp4qj7eZ4BffkYKqnX1
- Sample wallet demo (`src/demo/sample.ts`): made-up txs run through the real engine; hero + analyser buttons
  (`#sample`), free sample CSV/report download, no payment. Tested in `tests/demo.test.ts`.
- Jupiter DCA / limit orders (v1, v2): order accounts and their token vaults created in a user-paid tx that calls the
  Jupiter programs join the estate (`discoverEscrowAccounts`), and token accounts owned by them count too. Placing or
  cancelling an order is fee-only; each keeper fill is a swap. Tested in `tests/escrow.test.ts` (shaped after a real
  limit v2 order found by the probe, `tests/probe.test.ts` + `.github/workflows/probe.yml`, run manually).
- Native staking: stake accounts the user controls join the estate; rewards per epoch come from
  `getInflationReward` and export as staking income (Koinly tag `reward`). If reading rewards fails, the analysis
  continues and the results/report warn. Tested in `tests/staking.test.ts`; not yet checked on a real staker.
- Export formats (`src/export/formats.ts`): Koinly, Awaken, CoinTracker (exact 8-column template, MM/DD/YYYY UTC) and
  CoinLedger (universal template, Type blank for trades). Picker in the download box, remembered per browser; the
  report's import steps follow the chosen tool. Tested in `tests/formats.test.ts`.
- Awaken export (simple template, max 8 decimals) added (#10). USD price next to SOL from CoinGecko, cached per
  session and hidden if it can't load (#9).
- Mainnet check green after staking + escrow support (run 39797075653).
- 13 guide pages in `content/` (Awaken and staking rewards added in #10) (added CoinTracker, CoinLedger, pump.fun, Phantom, WSOL on 2026-10-22).
- SEO (2026-10-23): `/guides/` index page, "Related guides" block on every guide (closest by slug words), TechArticle +
  BreadcrumbList JSON-LD, Guides link in the guide header. 3 more guides: Solscan CSV export, Raydium/Orca/Meteora
  swaps (LP adds flagged for review), spam tokens and airdrops. 14 guides total.
- Launch kit with ready-to-post texts (Reddit, Koinly board, X): `docs/launch-posts.md`. Yasin posts them himself.
- Bugs found by the mainnet check and fixed: transaction version 1 support (auto-upgrades
  `maxSupportedTransactionVersion`); mistyped Token-2022 program ID.

## In progress / next
1. Watch the scheduled "Mainnet check"; fix any mismatches it reports.
2. **Waiting on Yasin:**
   - Done 2026-10-23: Google Search Console verified (HTML tag in index.html) and sitemap.xml submitted.
   - Posting the Reddit / Koinly board texts in `docs/launch-posts.md`.
3. Next product ideas, in order: privacy-friendly analytics
   (needs Yasin's signup), a real staker wallet in the mainnet check.
4. After launch: distribution (Reddit r/CryptoTax, r/solana, Koinly community; SEO guides), check real exports in
   Koinly.

## Environment notes for Claude
- Until 2026-10-22 the sandbox could not reach Solana RPC (proxy 403), so real-data testing runs in GitHub Actions.
  Yasin then set a cloud environment with wider network access; new threads should check whether RPC works directly.
  Read CI logs with the GitHub MCP `get_job_logs` (gh log download is blocked); `gh run list/watch` works.
- Pages settings API is blocked through the proxy.
- Commit trailer lines are required (see session instructions).
