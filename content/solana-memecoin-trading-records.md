---
title: Memecoin trading on Solana — complete records for your tax tool
description: Hundreds of small pump.fun, Jupiter and Raydium trades can import as split sends and receives. Export every memecoin swap as one row, with tickers you can fix.
category: trades
---
# Memecoin trading on Solana: complete records for your tax tool

Active memecoin trading means hundreds of small buys and sells across pump.fun, Jupiter and Raydium. A few bad rows per trade quickly become thousands of bad rows in a tax tool.

## What goes wrong with memecoin history

- **Brand-new tokens have no name or price.** A tax tool may not recognise a token that launched hours ago, and can leave one swap as a separate send and a separate receive instead of a trade.
- **A new token account each time.** Every new coin opens an account that locks about 0.002 SOL as rent, and the rent comes back when you close it. See [rent not merged](../koinly-solana-rent-not-merged/).
- **Spam mixed in.** Unwanted tokens and airdrops land in the same wallet and add noise. See [spam tokens and airdrops](../solana-spam-tokens-airdrops-tax-software/).
- **Volume.** Hundreds of trades make one wrong pattern very hard to find by hand.

## What SolTax Cleaner does

- Each swap is one row with both sides written together: what you paid and what you received. This holds whatever the token's price or name.
- Rent stays inside your own accounts and nets out, so it is not booked as a cost or as income.
- Closed token accounts are included, so tokens you fully sold are not lost.
- The rows are compared with your current on-chain balances, asset by asset, so you can see whether anything is missing.

For how the buys themselves are read, see [pump.fun trades](../pump-fun-trades-tax-software/).

## Fix tickers before you download

Tax tools match tokens by ticker. After the analysis, a token table lists every token with its ticker. If a new coin has no name or the wrong one, edit the ticker there before downloading. The mint address is also written into each row.

## Prices are added by your tax tool

SolTax Cleaner does not add prices and does not calculate tax. Your tax tool adds prices and does the maths. This is not tax advice.

## Next step

Paste your public wallet address into the [free analysis](../#analyse). The preview, the token table and the balance check are free; you pay once only to download the file.
