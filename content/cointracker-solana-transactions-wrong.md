---
title: Solana transactions wrong in CoinTracker — clean CSV fix
description: Split swaps, rent rows and one-sided limit-order fills make Solana history look wrong in CoinTracker. Rebuild it into a clean CoinTracker CSV in your browser.
---
# Solana transactions wrong in CoinTracker

If you trade on Solana, your CoinTracker history can show swaps with no matching side, tiny SOL "rent" movements as separate transactions, and tokens arriving from nowhere. Each of these can change your gains.

## Why it happens

Solana apps move funds through several accounts in one transaction: a temporary wrapped-SOL account, a token account for each coin you hold, and program-owned accounts for DCA and limit orders. An importer that reads balance changes one account at a time sees pieces of a trade instead of the trade.

## How SolTax Cleaner fixes it

- It treats your wallet and every token account it ever owned as one pot, so rent and wrapped SOL cancel out and each swap becomes one row.
- It reads the history of your token accounts too, so fills that never touch your main address are found.
- It writes CoinTracker's own CSV template (Date, Received Quantity, Received Currency, Sent Quantity, Sent Currency, Fee Amount, Fee Currency, Tag) with UTC dates.

## Importing into CoinTracker

1. Remove the auto-synced Solana wallet for the same address, so nothing is counted twice.
2. Add a wallet using the CoinTracker CSV option and upload the file.
3. Check the short report for anything flagged for a manual look.

SolTax Cleaner doesn't calculate tax. It gives CoinTracker clean rows to work from.
