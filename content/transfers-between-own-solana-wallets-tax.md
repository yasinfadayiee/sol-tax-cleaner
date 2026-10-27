---
title: Transfers between your own Solana wallets showing as income or sales
description: Moving SOL or tokens between your own Solana wallets can look like income or a sale in tax software. Add all your wallets in one analysis so transfers net out.
category: accounts
---
# Transfers between your own Solana wallets showing as income or sales

You move SOL or tokens from one of your wallets to another. Your tax software should treat that as a non-event. Instead it sometimes shows a **sale** on one side and **income** (or a receive with no cost) on the other. The usual cause: each wallet was added on its own, so the software can't see that both ends belong to you.

## Why it happens

- Wallet A sends 10 SOL. Wallet B receives 10 SOL. If only one of them is in your tax tool, the other end looks like a stranger.
- If both are added separately, the two halves may not be matched, especially when the amounts differ by the network fee.
- Token-account rent and fees on the way make the amounts look slightly different on each side.

## How SolTax Cleaner handles it

Add up to five of your own wallets in a single analysis. Transfers between them net out inside that group, and only the network fee remains as a cost. The report is checked against today's on-chain balances, asset by asset.

## Steps

1. Open the [analyser](../#analyse) and paste the public addresses of every wallet you own, up to five. No wallet connection or sign-up is needed.
2. Run the analysis. Analysis, the balance check and a preview are free; you pay once to download the full file.
3. Download the file for your tax tool, for example Koinly.
4. In Koinly, import it as **one** custom wallet. Remove any Solana wallets Koinly synced by address for the same addresses, or the activity is counted twice. See [Koinly Solana wallet sync vs CSV import](../koinly-solana-sync-vs-csv-import/).

## If a wallet is missing from the group

A transfer to a wallet you left out still looks like money leaving to someone else. If a balance is off or a token shows [missing purchase history](../koinly-missing-purchase-history-solana/), check that every wallet involved was included.

Not sure where to find your address? See [Export your Phantom transaction history to CSV](../export-phantom-transaction-history-csv/).

This tool only cleans and reformats your data. It does not calculate tax and is not tax advice.
