---
title: Phantom wallet in Koinly — fix split swaps, rent rows and duplicates
description: Phantom wallet showing split swaps, rent rows or duplicates in Koinly? Replace the synced wallet with one clean Koinly file built from your public address.
category: tools
---
# Phantom wallet in Koinly — fix split swaps, rent rows and duplicates

Syncing a Phantom address in Koinly often gives one swap as several rows, token-account rent as separate costs and refunds, and duplicates when you also import a file. The fix is to replace the synced wallet with one clean file in Koinly's Universal format.

## What you need

Only your **public** Solana address. In Phantom, tap your account name and copy the Solana address. Never share your secret recovery phrase or private key with any website, including this one.

## What the clean file fixes

- Each swap from the in-app swapper or Jupiter as one row.
- Rent and wrapped SOL netted out.
- Transactions from closed token accounts included.
- Transfers between your own addresses cancel out, so several Phantom accounts (up to five) import as one wallet.

## Steps in Koinly

1. Paste the address on the [analyser](../#analyse), run the free analysis and choose the Koinly format.
2. Download the file.
3. In Koinly, remove the synced Phantom/Solana wallet, so the same transactions are not counted twice.
4. Import the file as one custom wallet.
5. Compare the balance Koinly shows with your wallet. The analyser also checks the rows against current on-chain balances, asset by asset.

Koinly's Solana balance still off? See [Koinly shows the wrong Solana balance](../koinly-solana-balance-wrong/).

Want the file for another tax tool, or the plain CSV export? See [Export Phantom transaction history to CSV](../export-phantom-transaction-history-csv/).

SolTax Cleaner reformats transaction data. It does not calculate tax and is not tax advice.
