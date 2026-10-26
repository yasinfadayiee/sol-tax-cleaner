---
title: Koinly "missing purchase history" on a Solana token — find where it came from
description: Koinly says a Solana token has missing purchase history? It saw you send out more than you received. Find the missing buy: split swaps, DCA fills, closed accounts.
category: tools
---
# Koinly "missing purchase history" on a Solana token

The warning means the imported history shows you **sold or sent out more of a token than it saw you receive**. For one token, the buy that should explain the difference is not in the data. This page helps you find where that buy went on Solana. For a wrong balance across your whole wallet, see [Koinly shows the wrong Solana balance](../koinly-solana-balance-wrong/).

## Where a Solana "buy" goes missing

Pick the token with the warning, open its transactions in Koinly, and compare them with the same token on a block explorer. These are the usual causes:

- **A swap split into one-sided rows.** One swap can import as a send in one row and a receive in another, or only half of it may appear. The side that brought you the token is missing or sits under a different hash. See [one swap showing as several transactions](../solana-swap-split-into-multiple-transactions/).
- **A Jupiter DCA or limit-order fill.** The fills are made by a keeper, not by a transaction you signed, so the tokens seem to arrive from nowhere. See [Jupiter DCA trades missing](../koinly-jupiter-dca-missing/).
- **Tokens that moved through a token account you later closed.** If the buy happened in an account that no longer exists, a sync that follows only your main address can miss it.
- **A transfer from your own other wallet.** If you bought the token in wallet A and moved it to wallet B, wallet B only shows a receive. The buy is in wallet A's history, which may not be imported at all.
- **Staking rewards.** Native SOL staking rewards are paid each epoch without a transaction you can see, so they never appear as received. See [staking rewards missing](../solana-staking-rewards-tax-software/).

## How to fix it

1. Paste your public address (and your other wallets, up to five in one analysis) on the [analyser](../#analyse) and run the free analysis.
2. Find the token in the results and check the **balance check**. It compares the rebuilt rows with your current on-chain balance for each asset.
3. If the rows add up, download the Koinly file. In Koinly, remove the synced Solana wallet (or its transactions) and import the file into one custom wallet, so nothing is counted twice.
4. Check the token again in Koinly. The buy should now be there as a trade, so the warning for that token should be gone.

If the warning stays, the token probably came from somewhere outside Solana, such as an exchange or another chain. Add that history to Koinly separately.

SolTax Cleaner reformats transaction data. It does not calculate tax and is not tax advice.
