# Project status — read this first

This file is the hand-off between chat sessions. Read it (plus `AGENTS.md` and `docs/SPEC.md` only if the task
needs them) instead of re-reading the whole codebase. **Update it at the end of every session.**

Last updated: 2026-10-22

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
  Price 0.25 SOL (≈ $25–35), 365 days, up to 5 wallets; Yasin let Claude choose (below Koinly's $49 entry plan).
- Mainnet check is green: all 3 real wallets reconcile exactly to on-chain balances (run 39780634996).
- Launch kit with ready-to-post texts (Reddit, Koinly board, X): `docs/launch-posts.md`. Yasin posts them himself.
- Bugs found by the mainnet check and fixed: transaction version 1 support (auto-upgrades
  `maxSupportedTransactionVersion`); mistyped Token-2022 program ID.

## In progress / next
1. Watch the scheduled "Mainnet check"; fix any mismatches it reports.
2. **Waiting on Yasin:**
   - Optional: Google Search Console verification tag (see `docs/launch-posts.md`).
3. After launch: distribution (Reddit r/CryptoTax, r/solana, Koinly community; SEO guides), check real exports in
   Koinly, maybe staking rewards and a CoinTracker format.

## Environment notes for Claude
- The cloud sandbox cannot reach Solana RPC (proxy 403); real-data testing runs in GitHub Actions.
  Read CI logs with the GitHub MCP `get_job_logs` (gh log download is blocked); `gh run list/watch` works.
- Pages settings API is blocked through the proxy.
- Commit trailer lines are required (see session instructions).
