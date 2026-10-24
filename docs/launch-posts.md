# Launch kit — ready-to-post texts

Site: https://yasinfadayiee.github.io/sol-tax-cleaner/

Rules that keep posts from being removed as spam:
- Always say you made the tool ("I built…"). Reddit removes undisclosed self-promotion.
- Answer the person's actual problem first; the link is the last line.
- One post per subreddit. Space them out (a few days apart). Don't post the same text twice.
- Reply to every comment in the first few hours; that is what makes a post rise.

---

## 1. r/solana (post)

**Title:** I built a free tool that turns messy Solana history into a clean Koinly CSV (one swap = one row)

**Body:**

If you've imported a Solana wallet into Koinly, you've probably seen this: one Jupiter swap shows up as 3–5 separate
transactions, token-account rent (0.00203928 SOL) appears as a cost and then as income, and DCA / limit-order fills
are missing or one-sided.

I got tired of fixing this by hand, so I built SolTax Cleaner:

- Paste your wallet address (public address only, never a key). It reads your history straight from Solana in your
  browser. There's no server and no account, and your data never leaves your machine.
- It rebuilds each transaction: one swap = one row, rent and wrapped SOL are netted out, and Jupiter DCA and
  limit-order fills are recovered.
- Exports a CSV for Koinly, CoinTracker, CoinLedger or Awaken, plus a short report of anything that needs a manual look.
- Native staking rewards are added too, one row per epoch.

Analysis and preview are free. The full export is a one-time 0.25 SOL or 29 USDC for a year (up to 5 wallets).

I tested it against real wallets and checked that the rows add up to the wallets' actual on-chain balances.
Feedback is very welcome, especially transactions it gets wrong.

https://yasinfadayiee.github.io/sol-tax-cleaner/

---

## 2. r/CryptoTax (post)

**Title:** Why Solana swaps look wrong in Koinly (rent, split swaps, missing DCA), and a free way to clean them up

**Body:**

A lot of Solana users here ask why their Koinly numbers look off. There are three main causes:

1. **Split swaps.** A single Jupiter swap touches several accounts, so it's imported as several transactions instead
   of one trade.
2. **Rent.** Opening a token account locks ~0.002 SOL, which is refunded when it's closed. Tools often book it as a
   cost and then as income, which inflates both sides.
3. **DCA / limit orders.** These fills land in token accounts, not your main address, so they're often missing or show
   up as receives with no matching send.

I wrote up each one here:
- Rent: https://yasinfadayiee.github.io/sol-tax-cleaner/koinly-solana-rent-not-merged/
- Split swaps: https://yasinfadayiee.github.io/sol-tax-cleaner/solana-swap-split-into-multiple-transactions/
- DCA: https://yasinfadayiee.github.io/sol-tax-cleaner/koinly-jupiter-dca-missing/

Disclosure: I built a tool (SolTax Cleaner) that fixes these and exports a clean Koinly CSV. It runs entirely in your
browser, and the preview is free. It doesn't calculate tax and isn't tax advice. It just gives Koinly clean rows.

---

## 3. Short reply (for threads/comments where someone has this problem)

> That's the usual Solana import issue: Koinly sees each account a Jupiter swap touches as its own transaction, and it
> books token-account rent as a cost and then a refund. You can fix it by hand by merging the rows and ignoring the
> 0.00203928 SOL rent movements. Or, disclosure, I built a free-to-preview tool that does it automatically and exports a
> clean Koinly CSV, all in your browser: https://yasinfadayiee.github.io/sol-tax-cleaner/

## 4. Koinly community / feedback board reply

> Until this is fixed in the importer, a workaround: SolTax Cleaner (I made it) reads the wallet history in your browser,
> merges each swap into one row with rent netted out, and exports a Koinly Universal CSV you can import instead of the
> API sync. Guide for this exact issue: https://yasinfadayiee.github.io/sol-tax-cleaner/koinly-solana-rent-not-merged/

## 5. X / Twitter

> Solana + Koinly = one swap split into 5 rows, rent counted as income, DCA fills missing.
>
> I built a fix: paste your address and get a clean Koinly CSV, one swap = one row. It runs 100% in your browser
> with no signup.
>
> https://yasinfadayiee.github.io/sol-tax-cleaner/

---

## Free one-time setup (owner)
- Google Search Console: add the site so Google indexes the guides faster (search.google.com/search-console →
  URL prefix → paste the site URL → verify with the HTML tag; send the tag to Claude to add).
