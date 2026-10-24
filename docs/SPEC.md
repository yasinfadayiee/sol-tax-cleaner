# SPEC — SolTax Cleaner (working name)

## 1. Problem
Crypto tax tools (Koinly, CoinTracker) mis-import Solana DeFi activity. Their own public bug boards show
open issues, for example:
- Jupiter DCA trades not recorded: https://feedback.koinly.io/apicsv-issues-public/p/solana-sol-api-jupiter-dca-trades-not-recorded
- Token-account rent not merged into the transaction: https://feedback.koinly.io/bug-reports-public/p/solana-sol-transactions-that-include-token-account-creation-rent-are-not-merged
- Jupiter limit orders recorded as one-sided receives: https://feedback.cointracker.io/product-feedback/p/jupiter-limit-orders-on-solana-classified-as-one-sided-usdc-receives

Users report a single swap becoming several rows with the same hash, which creates fake gains and hours
of manual fixing.

## 2. Product in one sentence
Paste your Solana wallet address(es), get a clean Koinly-ready CSV where every transaction is rebuilt
correctly, plus a short report of anything that still needs a human look.

## 3. Users and pricing
- Solana DeFi users who file taxes in the UK, Canada, Australia, the EU and similar. Not offered to US
  persons (state this in the Terms).
- Free: full analysis and summary, plus a preview of the first 20 rows.
- Paid: full CSV export for up to 5 wallets, valid 12 months from payment.
- Price and currency: `PRICE_SOL` in `src/config.ts` (set by the owner; around USD 29 equivalent).
  Also payable in USDC (`PRICE_USDC`), kept close to the SOL price in dollars.

## 4. Data source
- Default RPC: `https://api.mainnet-beta.solana.com` (public; about 100 requests per 10 s per IP and
  40 per method per 10 s). The user can paste their own RPC URL (for example a free Helius key) for
  speed. Store it only in `localStorage`.
- Client must: limit concurrency, honour 429 with exponential backoff, show progress, and cache fetched
  transactions in IndexedDB keyed by signature so re-runs are instant.

### 4.1 Finding all transactions (key differentiator)
`getSignaturesForAddress(wallet)` misses transactions that touch only the user's token accounts (incoming
SPL transfers, DCA fills, limit-order fills). So:
1. Fetch signatures for each wallet address.
2. Fetch current token accounts: `getTokenAccountsByOwner` for both the SPL Token and Token-2022 programs.
3. While parsing transactions, collect any token account whose `owner` (from `preTokenBalances` /
   `postTokenBalances`) is a user wallet, including accounts that were later closed.
4. Fetch signatures for every discovered token account too. Repeat until no new accounts appear.
5. De-duplicate by signature. Fetch each transaction with `getTransaction` using
   `{"encoding":"jsonParsed","maxSupportedTransactionVersion":0}`.

Export the user's full history by default (cost basis needs it), with an optional date filter.

## 5. Engine: estate accounting
Treat all of the user's accounts as one "estate": every wallet address plus every token account whose
owner is one of those wallets.

For each transaction:
1. **SOL delta** = sum over estate accounts of `postBalances[i] - preBalances[i]` (lamports). Because
   token accounts are part of the estate, rent deposits and refunds and wrapped-SOL (WSOL) movements net
   out automatically.
2. **Network fee**: if the fee payer (`accountKeys[0]`) is in the estate, add `meta.fee` back to the SOL
   delta and record it as the transaction's fee.
3. **Token deltas**: for each mint except the native mint
   (`So11111111111111111111111111111111111111112`), the sum over estate token accounts of
   post amount minus pre amount (raw integer amount, `uiTokenAmount.amount`). A missing entry counts as 0.
4. Drop zero deltas.
5. Classify:
   - **Failed transaction** (`meta.err` not null): fee only.
   - **Fee only**: no non-zero deltas, fee > 0. Export as a standalone fee: `Sent` = fee in SOL,
     tag `cost`.
   - **Swap**: exactly one negative and one positive asset. One row: Sent and Received, with the fee in the
     Fee columns.
   - **Deposit**: only positive assets. One row per asset. No tag (the user may tag rewards or airdrops
     in Koinly).
   - **Withdrawal**: only negative assets. One row per asset. The fee goes on the first row.
   - **Complex** (more than one asset on either side, such as liquidity adds or multi-hop leftovers):
     one row per asset, all sharing the same TxHash, each marked "needs review" in the report.
6. Internal transfers between the user's own wallets net to zero inside the estate, leaving only the
   fee. That is the intended behaviour, so tell users to import our CSV into Koinly as **one** custom wallet
   and to remove Koinly's own auto-synced Solana wallets to avoid duplicates.

Staking inflation rewards (credited per epoch without a transaction) are out of scope for v1. List them
in the report as a known limitation.

## 6. Token names
Koinly needs a currency for every row.
1. Resolve each mint's symbol from token metadata (the Jupiter token API, falling back to the on-chain
   Metaplex metadata account).
2. Let the user override any symbol in the UI.
3. A research subtask must confirm how Koinly identifies SPL tokens in custom CSVs (ticker only, or by
   contract address). Follow Koinly's documented method. If no method exists, export the ticker and put
   the mint address in `Description`.

## 7. Export: Koinly Universal template
Source: https://support.koinly.io/en/articles/9489976-how-to-create-a-custom-csv-file-with-your-data

Columns, in this order and spelled exactly:
`Date, Sent Amount, Sent Currency, Received Amount, Received Currency, Fee Amount, Fee Currency, Tag, Description, TxHash`

- Date format: `YYYY-MM-DD HH:mm:ss`, UTC.
- Amounts are gross (the fee is not deducted), written as decimal strings converted from base units.
- Standalone fees go in the Sent columns with Tag `cost`, not in the Fee columns.
- One tag per row, using only Koinly's allowed values.

Also produce `report.html` (a printable page built from the Markdown report) and an on-screen report listing: counts per category, transactions marked
"needs review" with Solscan links, token-symbol overrides, and known limitations.

## 8. Payment and license (no server)
- Payment: a Solana Pay link and QR code
  (`solana:<MERCHANT>?amount=<PRICE_SOL>&memo=<MEMO_PREFIX>-<YYYY>&label=<APP_NAME>`), paid **from one of
  the wallets being analysed**.
- Unlock check, all client-side: scan the user's wallets' signatures for a transfer to `MERCHANT_ADDRESS`
  of at least `PRICE_SOL`, with a memo starting with `MEMO_PREFIX`, made within the last 365 days. If
  found, unlock the full export for this wallet set (up to 5 wallets).
- This can be bypassed by someone editing the JavaScript. That is acceptable for this price.
- No accounts, no emails, no license keys.

## 9. Website
- An English single-page app with sections: problem, before/after example, "Analyse free" button, how it
  works, pricing, FAQ, Terms (not tax advice; not for US persons; no warranty), and Privacy (no data
  leaves your browser).
- SEO help pages (static Markdown rendered at build time), one per known error, such as "Koinly Jupiter
  DCA trades missing — fix" and "Koinly Solana rent transactions not merged — fix".
- Deployed to GitHub Pages via GitHub Actions.

## 10. Out of scope for v1
Staking epoch rewards, NFTs, other chains, CoinTracker and other export formats, price data, tax
calculation, and mobile apps.
