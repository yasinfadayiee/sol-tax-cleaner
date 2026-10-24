---
title: One Solana swap showing as several transactions in Koinly — fix
description: A single Jupiter or Raydium swap can import as three or four rows with the same hash, creating fake gains. Export each swap as one clean row instead.
category: trades
---
# One Solana swap showing as several rows

Solana DeFi users often see a single swap appear as several rows with the same transaction hash in their tax software. Each extra row can look like a separate sale or income, which can create gains that never happened.

## Why it happens

A Jupiter swap typically:

1. wraps SOL into a temporary wrapped-SOL account,
2. pays rent to open accounts,
3. swaps through one or more pools,
4. closes the temporary accounts and refunds the rent.

If each balance change is imported separately, one trade becomes several unrelated deposits and withdrawals.

## How SolTax Cleaner fixes it

It adds up everything that left and entered **all** of your accounts in the transaction. Temporary accounts, wrapped SOL and rent cancel out, which leaves exactly what you traded: one asset out, one asset in. That becomes one swap row, with the network fee in the fee column.
