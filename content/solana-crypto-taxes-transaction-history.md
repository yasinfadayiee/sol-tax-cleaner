---
title: Solana crypto taxes — how to get a correct transaction history
description: Your Solana tax report is only as good as its transaction history. What usually goes wrong with Solana wallets in tax software, and how to export a clean, complete CSV.
category: tools
---
# Solana crypto taxes: start with a correct transaction history

Every crypto tax tool (Koinly, CoinTracker, CoinLedger, Awaken) works from the same thing: a list of your transactions. If that list is wrong, the report is wrong, however good the tax tool is. On Solana the list is wrong surprisingly often. This guide explains why and how to fix it before you file.

This page is about data, not tax rules. Rules differ by country; ask a tax professional how they apply to you.

## Why Solana wallets import badly

Solana works differently from Ethereum, and most tax tools were built for Ethereum first.

- **Token accounts.** Every token you hold sits in a separate token account owned by your wallet. Activity that only touches those accounts can be missed when a tool reads just your main address.
- **Rent.** Opening a token account locks about 0.002 SOL, refunded when it closes. Tools often show this as a cost and later as income. See [rent not merged in Koinly](../koinly-solana-rent-not-merged/).
- **Wrapped SOL.** Swaps wrap and unwrap SOL in the same transaction, which can appear as extra trades. See [WSOL in tax software](../wrapped-sol-wsol-tax-software/).
- **Split swaps.** One swap can turn into two or three rows: [one swap showing as several transactions](../solana-swap-split-into-multiple-transactions/).
- **DCA and limit orders.** Jupiter fills them from an order account, so your wallet isn't in the fill transaction: [Jupiter DCA missing in Koinly](../koinly-jupiter-dca-missing/).
- **Staking.** Rewards are paid into stake accounts, not your wallet: [staking rewards missing](../solana-staking-rewards-tax-software/).
- **Spam.** Airdropped junk tokens clutter the history: [spam tokens and airdrops](../solana-spam-tokens-airdrops-tax-software/).

## How to check whether your history is right

Compare what the tax tool thinks you hold today with what your wallet actually holds. If the balances differ, transactions are missing or double counted, and every gain or loss after that point is suspect.

## How to get a clean file

1. Copy your **public** Solana address (never your recovery phrase).
2. Paste it on the [analyser](../#analyse). It reads the full on-chain history in your browser, including closed token accounts, DCA fills and staking rewards.
3. Check the preview and the balance check: rows should add up to your current balances.
4. Download the file for your tax tool and import it as one custom wallet, replacing the auto-synced Solana wallet so nothing is counted twice.

You can [try a sample wallet](../#sample) first to see the result without entering anything.
