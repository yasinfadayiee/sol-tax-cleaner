# Daily improvement roadmap

Read by the "Daily improvement" workflow (`.github/workflows/improve.yml`, three runs a day, Sonnet). The weekly
"Weekly planning" workflow (`plan.yml`, Opus) reorders and refills the Backlog. The daily "Daily review" workflow
(`review.yml`, Opus) checks what the improvement runs published, fixes small problems and adds "Fix (review)"
items at the top of the Backlog. Each improvement run, Claude does the **first
unchecked item only**, ticks it (`- [x]`, with the date), and stops. Goal: more visitors from Google and AI search
who become paying customers. The owner is not technical and does not review changes, so every change must be
correct and safe on its own.

## Rules for every run
- One item per run, small and complete. Never half-finish an item.
- Hard rules from `AGENTS.md`: no backend, never calculate tax, say "not tax advice", no secrets.
- Never claim a feature the product doesn't have. The briefing's product facts are safe; for anything else, grep
  `docs/SPEC.md` or `src/` for that one claim (don't read whole folders). If unsure, leave the claim out.
- Save turns: start from the briefing file, open only the files the item names or must change, and run the checks
  once at the end as one command: `npm run lint && npm test && npm run build`.
- Never invent facts about other products (Koinly, CoinTracker, Phantom, Jupiter...). Keep statements about them
  general unless an existing guide already states them.
- The Terms exclude US customers: don't write US-specific tax content (IRS forms, 1099-DA, US deadlines).
- Do not touch `.github/`, `scripts/`, `src/license/`, `src/config.ts`, `package.json`, `package-lock.json`.
  The workflow rejects changes there.
- "Fix (auto-check)" items come from the free daily SEO check (`scripts/seo-check.mjs`); fix exactly the pages listed.
- New guides: `content/<slug>.md` with `title`, `description` (under 160 characters) and `category`
  (tools / trades / accounts) front matter, an H1, short sections, links to 2-3 related guides with `../<slug>/`,
  and a link to `../#analyse`. Also add it to `GUIDES` in `src/App.tsx` (end of the list). No duplicate topics:
  check `content/` first.
- Pictures: to add an AI picture to a guide, queue it in `docs/IMAGES.md` (see the rules there) and add a roadmap
  item to place it later; only reference `../img/<name>.jpg` once it is ticked there (the build fails otherwise).
  At most one picture per guide, only where it explains something.
- When fewer than 5 items are unchecked, add 5 new, specific items at the end of "Backlog" (search topics real
  Solana users type, or concrete polish found while working), then do the first unchecked item.
- Write a one-line Persian summary of what you did (simple words, for the owner) to the summary file the prompt names.

## Backlog
- [x] (2026-10-25) Fix (auto-check) [auto:desc-long] meta description over 160 characters (Google cuts it); shorten to 120-160, problem first: `free-solana-rpc-url`, `koinly-solana-balance-wrong`, `phantom-wallet-transactions-koinly`, `solana-crypto-taxes-transaction-history`, `solana-staking-rewards-tax-software`.
- [x] (2026-10-25) Fix (auto-check) [auto:orphans] guides no other guide links to; add one natural link to each from the most related guide: `free-solana-rpc-url`, `pump-fun-trades-tax-software`, `raydium-orca-meteora-swaps-tax-software`.
- [x] (2026-10-24) Guide: Koinly Solana wallet sync vs CSV import — which to use and how to avoid duplicates (`koinly-solana-sync-vs-csv-import`).
- [ ] Fix (duplicate topic): `phantom-wallet-transactions-koinly` and `export-phantom-transaction-history-csv` say almost the same thing. Make the Koinly page Koinly-only: retitle to "Phantom wallet in Koinly — fix split swaps, rent rows and duplicates", replace the generic list with Koinly steps (remove the synced Phantom/Solana wallet, import as one custom wallet, compare the balance) and drop CoinTracker/CoinLedger from its description. Link each page to the other once. Do not change either slug.
- [ ] Guide: Koinly says a Solana address "has too many transactions" — build the CSV in your browser instead (`koinly-solana-too-many-transactions`). Angle: very active trading/bot wallets that Koinly's sync can't fully import. Say only that Koinly may refuse or partly import very large wallets (no numbers about its limits). Explain that our analysis runs in the browser, shows progress and time left, and caches what it fetched so a re-run only reads new transactions (FAQ "How long does a big wallet take?"). Link `koinly-solana-sync-vs-csv-import`, `koinly-solana-balance-wrong`, `free-solana-rpc-url`.
- [ ] Guide: Koinly Solana wallet not syncing or "something went wrong while syncing" — use a CSV import (`koinly-solana-wallet-not-syncing`). Angle: sync errors, wallets stuck or showing no transactions. Don't diagnose Koinly's servers; give the CSV route as the dependable fallback and the one-source rule. Link `koinly-solana-sync-vs-csv-import`, `export-phantom-transaction-history-csv`.
- [ ] Guide: Koinly "missing purchase history" on Solana tokens — find where the token came from (`koinly-missing-purchase-history-solana`). Must differ from `koinly-solana-balance-wrong` (which is about the total balance): focus on one token that shows the warning, and the Solana-specific sources of a token with no buy: received only into a token account, a Jupiter DCA/limit fill, a swap split into one-sided rows, a transfer from your own other wallet, an airdrop. Link those guides, not a repeat of balance-wrong.
- [ ] Guide: Transfers between your own Solana wallets showing as income or sales (`transfers-between-own-solana-wallets-tax`). Angle: add up to five own wallets in one analysis; transfers between them net out and only the fee remains (SPEC §5.6); import as one custom wallet. Link `koinly-solana-sync-vs-csv-import`, `export-phantom-transaction-history-csv`.
- [ ] Guide: Staked SOL counted twice or missing in Koinly (`koinly-solana-staked-sol-double-counted`). Angle: stake accounts the user controls are part of the same history, so moving SOL into a stake account is not a sale or withdrawal in our file, and epoch rewards plus validator payouts come in as staking income. Must differ from `solana-staking-rewards-tax-software` (rewards): focus on balances and delegate/withdraw rows. Link that guide and `koinly-solana-balance-wrong`.
- [ ] Meta descriptions: these are over 160 characters and get cut in Google: `free-solana-rpc-url`, `koinly-solana-balance-wrong`, `solana-crypto-taxes-transaction-history`, `solana-staking-rewards-tax-software`, `phantom-wallet-transactions-koinly` (count each one; fix any other guide over 160 too). Shorten to 120-160 characters, starting with the problem the reader searched for. Don't change titles or slugs.
- [ ] FAQ: add 3 questions to `src/faq.ts` in the existing style: "Can I see the result before paying?" (yes: free analysis, preview of every row and the sample wallet; payments aren't refundable once the export unlocks, per `content/terms.md`); "Which wallets work?" (any Solana address: Phantom, Solflare, Backpack, Ledger accounts; only the public address, never a recovery phrase); "A token shows the wrong name?" (you can edit tickers before download; check `src/ui/` for the real control name).
- [ ] Guide: Export Solflare wallet transaction history to CSV for taxes (`export-solflare-transaction-history-csv`). Same shape as `export-phantom-transaction-history-csv` but write it fresh for Solflare (copy the address, staking from Solflare is covered by stake accounts). Don't say whether Solflare itself has a CSV export (sources disagree); say block-explorer and wallet exports list raw transfers, not trades. Link the Phantom export guide, `solscan-csv-export-tax-software`, `solana-staking-rewards-tax-software`.
- [ ] Guide: Memecoin trading on Solana — complete records for your tax tool (`solana-memecoin-trading-records`). Angle: many small buys/sells across pump.fun, Jupiter and Raydium, new token accounts and rent each time, spam tokens mixed in, unknown tickers. Note the tax tool adds prices (we don't). Link `pump-fun-trades-tax-software`, `solana-spam-tokens-airdrops-tax-software`, `koinly-solana-rent-not-merged`.
- [ ] Guide: Which tax tool to import a Solana CSV into — Koinly, CoinTracker, CoinLedger or Awaken (`solana-csv-which-tax-tool`). Angle: what each import needs and which file format to pick on our site. Only use facts already in our four tool guides and `src/export/formats.ts`; no prices, rankings or claims about their features. Link the four tool guides.
- [ ] Guide: Closed token accounts and old transactions missing from Solana tax imports (`closed-token-accounts-solana-tax`). Angle: older token-account activity that importers drop; our discovery reads every token account the wallet ever owned, including closed ones. Link `koinly-solana-balance-wrong`, `koinly-solana-rent-not-merged`.
- [ ] Guide: Failed Solana transactions still cost a fee — how they appear in tax software (`failed-solana-transactions-tax`). Angle: failed swaps (common with bots and memecoins) move no tokens but pay a network fee; we export them as fee-only rows (`src/engine/classify.ts`). Link `solana-swap-split-into-multiple-transactions`, `solana-memecoin-trading-records` if it exists.
- [ ] Guide: Solana network fees and priority fees in tax software (`solana-transaction-fees-tax-software`). Angle: on a swap the fee goes in the Fee columns of the same row; fee-only transactions get their own `cost` row (SPEC §7). Don't say how fees are taxed. Link `failed-solana-transactions-tax`, `solana-swap-split-into-multiple-transactions`.
- [ ] Guide: Solana CSV import errors in tax software — wrong date format, unknown token, duplicate rows (`solana-csv-import-errors-tax-software`). Angle: pick the right format before download (each has its own date format; CoinTracker is MM/DD/YYYY UTC), edit unknown tickers, never import the same wallet twice. Link `koinly-solana-sync-vs-csv-import` and the tool guides.
- [ ] Guide: Giving your accountant a clean Solana transaction report (`solana-transaction-report-for-accountant`). Angle: the CSV plus the printable `report.html` (period covered, assets totals, balance check, needs-review list with Solscan links; see `src/export/report.ts`). We don't calculate tax. Link `solana-crypto-taxes-transaction-history`, `koinly-solana-balance-wrong`.
- [ ] Guide: Ledger with a Solana address — clean history for your tax tool (`ledger-solana-transactions-tax`). Angle: a Ledger account is just a Solana address; copy it from Ledger Live or the wallet it's connected to, never type the 24 words anywhere. Link `export-phantom-transaction-history-csv`, `transfers-between-own-solana-wallets-tax`.
- [ ] Internal links: for each guide added since 2026-10-24, add one natural link to it from the most related older guide (one link per older guide at most). Check every `../<slug>/` link points to an existing file in `content/`.
- [ ] Pillar update: in `solana-crypto-taxes-transaction-history`, add a short "Common problems" list linking every guide in `content/` that it doesn't link yet (one line each), so it works as a hub page.
- [ ] Landing page: review the hero and pricing copy for clarity to a first-time visitor from a guide; make at most two small wording improvements in `src/App.tsx`. Don't change prices or claims.

## Done
