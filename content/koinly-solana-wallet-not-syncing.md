---
title: Koinly Solana wallet not syncing or missing older transactions — use a CSV
description: Koinly Solana wallet stuck, not updating, or older token activity never arriving? Use one clean CSV built from your public address as the dependable fallback.
category: tools
---
# Koinly Solana wallet not syncing or missing older transactions

Your Solana wallet in Koinly is stuck, stops updating, or older activity (especially token-account transactions) never shows up. Balances then look wrong and "missing purchase history" warnings can follow.

This page does not try to diagnose why a sync stalls. It gives you a route that does not depend on it: a CSV import.

## Why a CSV is the dependable fallback

- SolTax Cleaner reads the wallet's history straight from a Solana RPC endpoint, including every token account the wallet ever owned, **closed ones too**.
- It rebuilds each transaction: one swap is one row, rent and wrapped SOL are netted out.
- It then runs a **balance check**, comparing the rows with the current on-chain balances, asset by asset, so you can see whether anything is still missing before you import.

## What to do

1. In Koinly, remove the synced Solana wallet. One address should have one source only. See [wallet sync vs CSV import](../koinly-solana-sync-vs-csv-import/).
2. Get a free RPC URL if the public one refuses your browser: [Get a free Solana RPC URL](../free-solana-rpc-url/).
3. Paste your public address(es) on the [analyser](../#analyse). Add every wallet you own, up to five.
4. Review the rows and the balance check for free. Pay only to download the Koinly file.
5. Import it into Koinly as **one** custom wallet.
6. Compare the wallet balance in Koinly with the chain. If it is still off, read [Koinly shows the wrong Solana balance](../koinly-solana-balance-wrong/).

## Quick rule

One address, one source: the sync or the CSV, never both. No wallet connection or sign-up is needed, only your public address. This tool only cleans and reformats your data and does not calculate tax. It is not tax advice.
