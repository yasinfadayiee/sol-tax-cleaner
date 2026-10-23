---
title: Jupiter limit orders show as one-sided receives — fix for tax tools
description: Jupiter limit orders on Solana can import into CoinTracker or Koinly as a receive with no matching sale. Here is how to export them as proper swaps.
category: trades
---
# Jupiter limit orders imported as one-sided receives

Users of CoinTracker report that Jupiter limit orders on Solana show up as a plain receive of USDC (or another token), with no matching disposal: [Jupiter limit orders classified as one-sided USDC receives](https://feedback.cointracker.io/product-feedback/p/jupiter-limit-orders-on-solana-classified-as-one-sided-usdc-receives). Koinly users report a similar problem: [BONK disposal not recorded in Jupiter limit order execution](https://feedback.koinly.io/apicsv-issues-public/p/solana-bonk-api-bonk-disposal-not-recorded-in-jupiter-limit-order-execution).

## Why it happens

When you place a limit order, your tokens move into the order program first. The fill happens later, in a transaction executed by someone else, that sends the proceeds to your token account. Seen one transaction at a time, the fill looks like money arriving from nowhere, and the original deposit looks like a transfer out.

## How SolTax Cleaner handles it

- Fills that touch only your token account are found, as with DCA.
- Each transaction is reduced to what actually left and entered your accounts.
- The order deposit is exported as a withdrawal and the fill as a deposit, each with its own transaction hash. In Koinly you can merge the two into one trade, so the sale and the purchase are both recorded.

[Analyse your wallet free](../#analyse).
