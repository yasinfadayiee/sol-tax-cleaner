---
title: Phantom wallet history in Koinly — export clean Solana transactions
description: Phantom has no tax-ready CSV. Turn your wallet's full Solana history into a clean Koinly, CoinTracker or CoinLedger file from its public address.
category: tools
---
# Phantom wallet history in Koinly

Phantom is a wallet, not a tax tool, so it has no export built for Koinly. Syncing the address directly often gives split swaps and rent rows. You can build a clean file from the wallet's public address instead.

## What you need

Only your **public** Solana address. In Phantom, tap your account name and copy the Solana address. Never share your secret recovery phrase or private key with any website, including this one.

## What the clean file contains

- Every transaction for the address and for every token account it ever owned, including closed ones.
- Each swap from the in-app swapper or Jupiter as one row.
- Rent and wrapped SOL netted out.
- Incoming and outgoing transfers as deposits and withdrawals.

## Several Phantom accounts?

Add up to five addresses you own. Transfers between them cancel out, so you can import everything as one wallet without duplicates.

## Steps

1. Paste the address on the [analyser](../#analyse) and run the free analysis.
2. Pick your tax tool and download the file.
3. Remove the auto-synced Phantom/Solana wallet in your tax tool and import the file as one custom wallet.
