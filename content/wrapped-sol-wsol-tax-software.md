---
title: Wrapped SOL (WSOL) showing in Koinly or CoinTracker — why and fix
description: Swaps on Solana briefly wrap SOL into WSOL. Tax tools can show WSOL as a separate coin with odd balances. Here's why, and how to export swaps without it.
category: accounts
---
# Wrapped SOL (WSOL) in tax software

You may see a coin called WSOL or "Wrapped SOL" in your tax tool even though you never bought it, sometimes with a negative or leftover balance.

## Why it happens

Solana programs trade tokens, and SOL itself isn't a token. To swap SOL, apps wrap it into a temporary WSOL token account, trade the WSOL and unwrap whatever is left. Usually this happens inside a single transaction. If a tool records the wrap and unwrap as separate events, WSOL appears as its own asset.

## How SolTax Cleaner handles it

Wrapped SOL is counted as SOL. Because the temporary WSOL account belongs to you, wrapping and unwrapping cancel out and only the SOL you actually traded remains. A swap from SOL to USDC is exported as SOL sent and USDC received, with no WSOL rows at all.

If you hold WSOL in a long-lived token account, its balance still counts as SOL in the export, so totals reconcile with what your wallet holds on-chain.

[Analyse your wallet free](../#analyse) to check your own history.
