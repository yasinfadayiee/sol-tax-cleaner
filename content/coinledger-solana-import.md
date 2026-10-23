---
title: Import Solana DeFi history into CoinLedger with a clean CSV
description: How to get Jupiter swaps, pump.fun trades and token-account rent into CoinLedger correctly using its universal import template.
category: tools
---
# Import Solana DeFi history into CoinLedger

CoinLedger's universal import template accepts any transaction history, but only if each row is a whole trade, deposit or withdrawal. Raw Solana history isn't shaped that way.

## The problem with raw Solana data

One Jupiter swap can wrap SOL, open a token account (locking about 0.002 SOL of rent), trade through several pools and close temporary accounts. Read naively, that is four or five unrelated movements. Rent refunds look like income and the actual trade is split in two.

## What SolTax Cleaner produces

- One row per swap, with the asset sent, the asset received and the network fee.
- Deposits and withdrawals marked with CoinLedger's `Deposit` and `Withdrawal` types, and the Type left blank for trades, as the template asks.
- Dates in `MM/DD/YYYY HH:MM:SS` UTC, the transaction hash and, for less common tokens, the mint address in the description.

## Steps

1. [Analyse your wallet free](../#analyse) and check the preview.
2. Choose **CoinLedger** in the download box.
3. In CoinLedger, remove any auto-synced Solana account for the same address, then upload the file through the manual import option.

This is a data clean-up, not tax advice.
