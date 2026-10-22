---
title: Jupiter DCA trades missing in Koinly — why and how to fix it
description: Jupiter DCA (recurring) fills on Solana often never show up in Koinly. Here is why it happens and how to get every fill into your tax report.
---
# Jupiter DCA trades missing in Koinly

If you used Jupiter DCA (recurring orders), you may notice that Koinly shows your deposits into the DCA program but not the individual fills. Koinly users have reported this on Koinly's own feedback board: [Solana API: Jupiter DCA trades not recorded](https://feedback.koinly.io/apicsv-issues-public/p/solana-sol-api-jupiter-dca-trades-not-recorded).

## Why it happens

Each DCA fill is executed by a Jupiter "keeper", not by you. The bought tokens land in your **token account**, and your main wallet address often does not appear in that transaction at all. A tool that only lists transactions for your wallet address never sees the fill.

## How SolTax Cleaner fixes it

- It finds every token account your wallet owns or has ever owned, including closed ones.
- It reads the history of each of those accounts too, so fills that only touch a token account are found.
- Moving funds into the DCA order is exported as a withdrawal, and each fill as a deposit of the token you bought, each with its own transaction hash. In Koinly you can merge them into trades, so both the sale and the purchases are recorded.

## What to do

1. [Analyse your wallet free](../#analyse) and check the preview: each DCA fill appears as a deposit of the token you bought.
2. Download the CSV and import it into Koinly as one custom wallet, after removing Koinly's auto-synced Solana wallet for the same address.
