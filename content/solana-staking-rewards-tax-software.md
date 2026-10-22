---
title: Solana staking rewards missing from your crypto tax software
description: Native SOL staking rewards are paid every epoch without a transaction, so most tax tools never see them. Here is how to get them into Koinly, CoinTracker, CoinLedger or Awaken.
---
# Solana staking rewards missing from your tax software

If you stake SOL natively (delegating a stake account to a validator), your rewards arrive roughly every two to three days, at the end of each epoch. There is no transaction for them: the network simply raises the stake account's balance. A tool that only reads transactions sees your stake going in and a larger amount coming out, and nothing in between.

Two other things often go wrong:

- **Staking is booked as a sale.** Moving SOL from your wallet into a stake account is a transfer to an account you control, not a disposal. Some imports show it as a withdrawal to an unknown address.
- **Withdrawing is booked as income.** When you withdraw, the whole balance (your stake plus every reward) arrives in one transaction, so it can look like a large deposit from a stranger.

## What SolTax Cleaner does

- It finds the stake accounts your wallet controls and treats them as part of your own funds, so staking and withdrawing are fee-only.
- It reads the reward for every epoch from the network and adds one row per epoch, dated when the reward was paid, as staking income.
- If the network can't return some epochs, the results and the report say so, so you know the list is incomplete.

## Steps

1. [Analyse your wallet free](../#analyse). The analysis reads staking rewards after your transactions.
2. Pick your tool (Koinly, CoinTracker, CoinLedger or Awaken) and download the file.
3. Remove any auto-synced Solana wallet for the same address in your tax tool before importing, so nothing is counted twice.

Liquid staking tokens (such as JitoSOL or mSOL) are ordinary tokens and appear as swaps when you buy or sell them. Their value growth is not a separate reward row.

This is a data clean-up, not tax advice.
