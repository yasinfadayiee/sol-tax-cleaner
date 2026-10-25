---
title: Export Phantom wallet transaction history to CSV (Solana)
description: How to get your Phantom wallet's full Solana transaction history as a CSV, ready for Koinly, CoinTracker, CoinLedger or Awaken, using only your public address.
category: tools
---
# Export Phantom transaction history to CSV

Phantom shows your activity in the app but doesn't offer a tax-ready CSV export. Block explorers can export raw transfers, but those files list every low-level movement and don't import cleanly (see [Solscan CSV export for taxes](../solscan-csv-export-tax-software/)). Here is how to get a clean CSV instead.

## 1. Copy your public address

In Phantom, open the account menu and copy the **Solana** address. It is public information, like an account number. Never type your secret recovery phrase or private key into any website.

## 2. Build the CSV

Paste the address on the [analyser](../#analyse). It reads the address's full history straight from the Solana network in your browser: swaps from Phantom's swapper and Jupiter, transfers, staking, closed token accounts. Each swap becomes one row; rent and wrapped SOL are netted out.

To read the full history you need a Solana RPC URL; see [how to get a free one in 2 minutes](../free-solana-rpc-url/).

If you have several Phantom accounts, add up to five addresses. Transfers between your own accounts cancel out.

## 3. Pick the format

Choose Koinly, CoinTracker, CoinLedger or Awaken. Each file follows that tool's own import template, and the report includes the import steps for the tool you picked.

## 4. Import

Import the file as one custom wallet in your tax tool. If that tool also synced the Phantom address automatically, remove the synced copy so nothing is counted twice. More detail: [Phantom wallet history in Koinly](../phantom-wallet-transactions-koinly/).
