---
title: Koinly shows the wrong Solana balance — find the missing transactions
description: If Koinly's Solana balance doesn't match your wallet, transactions are missing or duplicated. The usual causes on Solana and how to rebuild a history that reconciles.
category: tools
---
# Koinly shows the wrong Solana balance

Koinly warns about "missing purchase history" or shows a SOL or token balance that doesn't match Phantom, Solflare or Solscan. That gap is a symptom: some transactions never reached Koinly, or reached it twice. Until the balance matches, gains and losses calculated from it are unreliable.

## Common causes on Solana

- **Activity in token accounts only.** Transfers and fills that touch a token account but not your main address are easy to miss. This includes accounts you have since closed.
- **Jupiter DCA and limit orders.** The keeper's fill transactions don't include your wallet, so the bought tokens appear from nowhere. See [Jupiter DCA trades missing](../koinly-jupiter-dca-missing/).
- **Stake account rewards.** Inflation rewards and validator payouts land in stake accounts. See [staking rewards missing](../solana-staking-rewards-tax-software/).
- **Rent and wrapped SOL** booked as separate costs and refunds, which shifts the SOL balance by small amounts.
- **The same wallet imported twice**, for example once by address sync and once from a CSV.

## How to fix it

1. Paste your public address on the [analyser](../#analyse) and run the free analysis.
2. Look at the **balance check** at the top of the results. It compares the rebuilt history with your current on-chain balances, asset by asset. "Balance check passed" means every token adds up.
3. Download the Koinly file. In Koinly, delete the auto-synced Solana wallet (or its transactions) and import the file into one custom wallet.
4. Re-check Koinly's balance for that wallet; it should now match your real wallet.

If some asset still differs, the report lists it so you can review the specific transactions.
