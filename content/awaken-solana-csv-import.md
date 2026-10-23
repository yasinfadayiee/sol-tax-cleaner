---
title: Import cleaned Solana history into Awaken Tax with a CSV
description: How to turn Jupiter swaps, pump.fun trades, DCA fills and token-account rent into a clean Awaken Tax CSV, one row per trade.
category: tools
---
# Import cleaned Solana history into Awaken Tax

Awaken reads Solana wallets well, but there are still good reasons to upload a CSV instead: a wallet with years of history, several wallets you want treated as one, or trades you've already checked and want to keep exactly as they are. Awaken's CSV template expects each row to be one complete trade, deposit or withdrawal, so raw Solana history has to be cleaned up first.

## What SolTax Cleaner produces

- One row per swap: the amount received, the amount sent and the network fee, in Awaken's simple template.
- Token-account rent and wrapped SOL netted out, so a rent refund never shows up as income.
- Jupiter DCA and limit-order fills as trades, including fills a keeper made without your wallet signing.
- Native staking rewards, one row per epoch, marked as staking rewards in the Notes column.
- Dates in `MM/DD/YYYY HH:MM:SS` UTC, at most eight decimal places, and the transaction hash so Awaken can link each row to the explorer.

## Steps

1. [Analyse your wallet free](../#analyse) and check the preview.
2. Choose **Awaken** in the download box and download `awaken.csv`.
3. In Awaken, remove any auto-synced account for the same addresses so nothing is counted twice, then add the file through the CSV upload option.

This is a data clean-up, not tax advice.
