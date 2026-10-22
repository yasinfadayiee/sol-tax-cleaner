---
title: Solana rent not merged into transactions in Koinly — fix
description: Koinly can show Solana token-account rent (0.00203928 SOL) as separate costs and refunds. Learn why, and how to export clean rows instead.
---
# Solana rent showing as separate transactions in Koinly

When you receive a new token on Solana, a small amount of SOL (usually 0.00203928 SOL) is locked as "rent" in a new token account. When the account is closed, the rent comes back. Koinly users report that these movements are not merged into the trade: [transactions that include token account creation rent are not merged](https://feedback.koinly.io/bug-reports-public/p/solana-sol-transactions-that-include-token-account-creation-rent-are-not-merged).

The result is noise: rent shows up as a cost when you buy, and as income when you close the account, across hundreds of transactions.

## Why it happens

Rent never leaves you. It moves from your wallet into a token account that you own. A tool that looks only at your main wallet's SOL balance sees SOL leaving and later coming back.

## How SolTax Cleaner fixes it

It treats your wallet and all of your token accounts as one pot. SOL moving between them cancels out, so a token purchase becomes a single swap row with only the real network fee.

[Analyse your wallet free](../#analyse) to see the cleaned rows before you download.
