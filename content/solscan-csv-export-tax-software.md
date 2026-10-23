---
title: Solscan CSV export for taxes — why it doesn't import cleanly
description: A Solscan CSV export lists raw transfers, not trades, so Koinly or CoinTracker turn one Solana swap into several rows. Here is why, and a cleaner export.
category: tools
---
# Solscan CSV export for taxes: why it doesn't import cleanly

Many people download their history from Solscan (or another Solana explorer) and upload that CSV to Koinly, CoinTracker or CoinLedger. It looks complete, but the tax tool usually ends up with far more rows than trades, and many of them are wrong.

## Why an explorer CSV is the wrong shape

- **It lists transfers, not trades.** A Jupiter swap that routes through three pools shows up as many token transfers. The tax tool sees separate sends and receives instead of one trade.
- **Rent looks like spending.** Opening a token account moves about 0.00203928 SOL into an account you own. In the CSV it looks like SOL leaving your wallet, and later like income when the account is closed.
- **Wrapped SOL appears as its own token.** Swaps that wrap and unwrap SOL show WSOL moving in and out, so SOL can look like it was sold twice.
- **Token-account activity can be missing.** Jupiter DCA and limit-order fills land in token accounts, and the export for your main address may not include them.

## How SolTax Cleaner differs

It reads the full history straight from a Solana RPC in your browser, including every token account you own or have owned. Your wallet and its token accounts are treated as one pot, so each transaction becomes what actually changed for you: one swap row with the real network fee, with rent and WSOL netted out. The export is in the exact template your tax tool expects (Koinly, CoinTracker, CoinLedger or Awaken).

## What to do

1. [Analyse your wallet free](../#analyse) and compare the row count with your Solscan CSV.
2. Download the CSV for your tax tool and import it as one custom wallet.
3. Delete the explorer CSV import (and any auto-synced Solana wallet) so nothing is counted twice.

SolTax Cleaner doesn't calculate tax and isn't tax advice. It only rebuilds your transactions into clean rows.
