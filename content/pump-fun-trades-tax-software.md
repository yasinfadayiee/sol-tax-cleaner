---
title: pump.fun trades in Koinly or CoinTracker — fix rent and missing rows
description: pump.fun buys open a new token account and pay rent and fees. See why tax tools mis-read them and how to export each buy and sell as one clean trade.
---
# pump.fun trades in tax software

Memecoin traders often make hundreds of pump.fun buys and sells. Each one can turn into several confusing rows in a tax tool, multiplied across every trade.

## Why pump.fun trades look wrong

A pump.fun buy usually:

- sends SOL to the bonding curve,
- pays a small platform fee to a fee account,
- opens a token account for the new coin, locking about 0.002 SOL as rent.

When you later sell everything and close the account, the rent comes back. A tool that reads your SOL balance alone sees extra costs on the buy and mystery income on the close.

## How SolTax Cleaner handles it

- The rent stays inside your own accounts, so it cancels out and is never booked as a cost or as income.
- The SOL you actually paid, including the platform fee, is the amount sent; the tokens are the amount received. One buy is one row.
- A sell that closes the account is one row too: tokens out, SOL in.
- Failed transactions are kept as fee-only rows, because the network fee was still paid.

Coins without a well-known ticker are listed in the report with their mint address, so you can check that your tax tool matched the right token.

[Try the sample wallet](../#sample) to see a pump.fun buy and sell exported, or analyse your own address.
