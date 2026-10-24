---
title: Koinly Solana wallet sync vs CSV import — which to use and how to avoid duplicates
description: Koinly shows duplicate or odd Solana rows? Compare syncing the wallet with importing a CSV, and how to use only one so nothing is counted twice.
category: tools
---
# Koinly Solana wallet sync vs CSV import

Koinly lets you add a Solana wallet by address (sync) or upload a file as a custom wallet (CSV). Both can work, but using **both for the same addresses** is the most common cause of duplicate rows and wrong balances.

## When to use each

- **Wallet sync** is quick and fine for a wallet that only holds and sends tokens. You don't have to prepare anything.
- **CSV import** is the better choice if you trade on DeFi apps. Swaps, rent and wrapped SOL can come through as several rows when synced, and you can fix that in the file before it reaches Koinly. See [Solana swaps split into several rows](../solana-swap-split-into-multiple-transactions/).

## How duplicates happen

1. You sync a wallet, notice problems, then upload a CSV for the same wallet.
2. Koinly now holds the same activity twice, so balances go negative or double and gains look wrong.
3. Transfers between your own wallets can also look like income or sales when each wallet is added separately.

## The safe way to switch to CSV

1. Remove the synced Solana wallet from Koinly, so only one source remains.
2. Paste your public address(es) on the [analyser](../#analyse). Add every wallet you own, up to five, so transfers between them cancel out.
3. Choose Koinly and download the file.
4. In Koinly, import it as **one** custom wallet.
5. Check the wallet balance against what the chain shows today. If it is off, read [Koinly shows the wrong Solana balance](../koinly-solana-balance-wrong/).

## Quick rule

One address, one source. Either Koinly's sync or the CSV, never both. This tool only cleans and reformats your data and does not calculate tax. It is not tax advice.
