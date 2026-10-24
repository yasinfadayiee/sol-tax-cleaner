---
title: Jupiter swap history for taxes — one clean row per swap
description: Get your Jupiter swaps, DCA and limit-order fills into Koinly, CoinTracker, CoinLedger or Awaken as clean trades, with rent and wrapped SOL removed.
category: trades
---
# Jupiter swap history for taxes

Jupiter is the most used swap aggregator on Solana, so for many people "Solana taxes" mostly means "Jupiter trades". Jupiter routes a swap through several pools inside one transaction, often wrapping SOL and opening token accounts on the way. Tax tools that read those movements one by one can turn a single swap into several rows.

## What goes wrong

- **One swap, several rows.** Intermediate hops, WSOL wrapping and rent show as separate entries: [one Solana swap showing as several transactions](../solana-swap-split-into-multiple-transactions/).
- **DCA orders missing.** Each DCA fill is executed by a keeper from an order account, without your wallet: [Jupiter DCA trades missing](../koinly-jupiter-dca-missing/).
- **Limit orders look one-sided.** The tokens arrive but the payment seems to be missing: [limit orders show as one-sided receives](../cointracker-jupiter-limit-order-one-sided/).

## What a clean export looks like

- Each swap is one trade row: what you sent, what you received, and the network fee.
- Each DCA or limit-order fill is its own trade, at the moment it filled.
- Placing or cancelling an order is a fee only, not a trade.
- Rent and wrapped SOL are netted out.

## How to get it

Paste your public address on the [analyser](../#analyse) and preview the rows free. Filter the preview by type to check your swaps, then download the file for your tax tool.
