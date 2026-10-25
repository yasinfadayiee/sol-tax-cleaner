---
title: Get a free Solana RPC URL for SolTax Cleaner (2 minutes)
description: The public Solana RPC refuses most browser requests. Get a free RPC URL from Helius, QuickNode or Alchemy to read your full wallet history.
category: tools
---
# Get a free Solana RPC URL

SolTax Cleaner reads your wallet history straight from the Solana blockchain in your browser, through an **RPC endpoint**. The free public endpoint (`api.mainnet-beta.solana.com`) only allows a few requests and refuses most requests that come from web pages. For a full history you need your own RPC URL. Providers offer free plans, and the free tier is plenty for one person's tax history.

## Steps

1. Sign up for a free plan at an RPC provider, for example [Helius](https://www.helius.dev/), [QuickNode](https://www.quicknode.com/) or [Alchemy](https://www.alchemy.com/).
2. In the dashboard, find your **Solana mainnet** RPC URL and copy it. It usually contains your API key, for example `https://mainnet.helius-rpc.com/?api-key=...`.
3. On SolTax Cleaner, open **Use your own RPC URL**, paste it, and press **Analyse free**.

## Is it safe?

- The URL is saved only in your browser (local storage) and used only for reading public blockchain data. It is never sent to us.
- An RPC key can't move funds. It only lets you read the blockchain, and you can revoke or rotate it at any time from the provider's dashboard.
- You still never enter a private key or seed phrase anywhere.

## Why it's faster

A keyed endpoint allows many more requests per second, so a wallet with thousands of transactions takes minutes instead of much longer. Results are cached in your browser, so re-running later is instant.

[Analyse your wallet](../#analyse) once your URL is in.
