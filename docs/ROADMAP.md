# Daily improvement roadmap

Read by the "Daily improvement" workflow (`.github/workflows/improve.yml`, three runs a day, Sonnet). The weekly
"Weekly planning" workflow (`plan.yml`, Opus) reorders and refills the Backlog. Each improvement run, Claude does the **first
unchecked item only**, ticks it (`- [x]`, with the date), and stops. Goal: more visitors from Google and AI search
who become paying customers. The owner is not technical and does not review changes, so every change must be
correct and safe on its own.

## Rules for every run
- One item per run, small and complete. Never half-finish an item.
- Read `AGENTS.md` first. Follow its hard rules (no backend, no tax calculation, "not tax advice", no secrets).
- Never claim a feature the product doesn't have. Check `docs/SPEC.md`, `docs/STATUS.md` and `src/` before writing
  what the tool does. If unsure, leave the claim out.
- Never invent facts about other products (Koinly, CoinTracker, Phantom, Jupiter...). Keep statements about them
  general unless an existing guide already states them.
- Do not touch `.github/`, `src/license/`, `src/config.ts`, `package.json`, `package-lock.json`,
  `scripts/monitor.mjs`, `scripts/indexnow.mjs`. The workflow rejects changes there.
- New guides: `content/<slug>.md` with `title`, `description` (under 160 characters) and `category`
  (tools / trades / accounts) front matter, an H1, short sections, links to 2-3 related guides with `../<slug>/`,
  and a link to `../#analyse`. Also add it to `GUIDES` in `src/App.tsx` (end of the list). No duplicate topics:
  check `content/` first.
- When fewer than 5 items are unchecked, add 5 new, specific items at the end of "Backlog" (search topics real
  Solana users type, or concrete polish found while working), then do the first unchecked item.
- Write a one-line Persian summary of what you did (simple words, for the owner) to the summary file the prompt names.

## Backlog
- [x] (2026-10-24) Guide: Koinly Solana wallet sync vs CSV import — which to use and how to avoid duplicates (`koinly-solana-sync-vs-csv-import`).
- [ ] Guide: Export Solflare wallet transaction history to CSV for taxes (`export-solflare-transaction-history-csv`).
- [ ] Guide: "Missing purchase history" warnings for Solana tokens in Koinly — causes and fix (`koinly-missing-purchase-history-solana`).
- [ ] Guide: Transfers between your own Solana wallets showing as income or disposals — import several wallets as one (`transfers-between-own-solana-wallets-tax`).
- [ ] Guide: Solana network fees in tax software — how fees are folded into trades (`solana-transaction-fees-tax-software`).
- [ ] Guide: Giving your accountant a clean Solana transaction report (CSV + printable report) (`solana-transaction-report-for-accountant`).
- [ ] Guide: Import Solana history into CoinTracker with a CSV, step by step (`cointracker-solana-csv-import`).
- [ ] Guide: Ledger hardware wallet with a Solana address — clean history for Koinly (`ledger-solana-transactions-koinly`).
- [ ] Guide: Memecoin trading on Solana — keeping complete records for your tax tool (`solana-memecoin-trading-records`).
- [ ] FAQ: add 3 questions buyers ask before paying (refunds are impossible on-chain, so explain the free preview and sample wallet; which wallets work; what if a token shows a wrong name) in `src/faq.ts`, matching the existing style.
- [ ] Internal links: in each older guide, add one link to the most related guide written after it, where it fits naturally.
- [ ] Meta descriptions: make every guide's `description` 120-160 characters and start with the problem the reader searched for.
- [ ] Guide: Solana CSV import errors in tax software (wrong date format, unknown token, duplicate rows) and how to avoid them (`solana-csv-import-errors-tax-software`).
- [ ] Guide: Closed token accounts and old transactions missing from Solana tax imports (`closed-token-accounts-solana-tax`).
- [ ] Landing page: review the hero and pricing copy for clarity to a first-time visitor from a guide; make at most two small wording improvements in `src/App.tsx`.

## Done
