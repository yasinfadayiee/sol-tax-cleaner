---
title: Raydium, Orca and Meteora swaps in Koinly or CoinTracker — fix
description: Swaps on Raydium, Orca or Meteora often import as several rows or one-sided transfers. Learn why, and how to export one clean row per swap.
category: trades
---
# Raydium, Orca and Meteora swaps in your tax software

If you trade directly on Raydium, Orca or Meteora (or through Jupiter, which routes through them), your tax tool may show one swap as several rows, as a send with no matching receive, or with extra SOL costs that you never paid.

## Why it happens

A DEX swap on Solana moves tokens between your token accounts and the pool's vaults, often creates or closes a token account (rent), and may wrap or unwrap SOL. Tax tools that read each transfer on its own don't see one trade. They see a list of movements.

## How SolTax Cleaner handles it

- It doesn't need to know each DEX. It looks at what changed in your wallet and all of your token accounts, taken together, in each transaction.
- One token out and one token in is exported as **one swap row**, with only the real network fee. Rent and wrapped SOL net out.
- Liquidity adds and removes, where more than one token moves on a side, are exported one row per token with the same transaction hash and flagged **needs review** in the report, so you can tag them the way your tax tool or accountant prefers.

## What to do

1. [Analyse your wallet free](../#analyse) and check the preview.
2. Look at the review report for any rows flagged for review, such as liquidity positions.
3. Download the CSV for Koinly, CoinTracker, CoinLedger or Awaken and import it as one custom wallet.

SolTax Cleaner doesn't calculate tax and isn't tax advice.
