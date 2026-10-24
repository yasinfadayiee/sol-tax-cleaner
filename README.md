# SolTax Cleaner — clean Solana transaction history for Koinly, CoinTracker, CoinLedger and Awaken

**[Open SolTax Cleaner](https://yasinfadayiee.github.io/sol-tax-cleaner/)** · [Guides](https://yasinfadayiee.github.io/sol-tax-cleaner/guides/) · [Try a sample wallet](https://yasinfadayiee.github.io/sol-tax-cleaner/#sample)

Crypto tax software often gets Solana wallets wrong: one swap shows up as several rows, token-account rent and
wrapped SOL look like costs and refunds, Jupiter DCA and limit-order fills go missing, and staking rewards never
arrive. SolTax Cleaner rebuilds a wallet's full on-chain history and exports a clean CSV that imports correctly.

- **One swap = one row** for Jupiter, Raydium, Orca, Meteora, pump.fun and Phantom's swapper.
- **Rent and wrapped SOL netted out.**
- **Jupiter DCA and limit orders recovered**, each fill as its own trade.
- **Native staking rewards** per epoch as staking income.
- **Closed token accounts included.**
- **Balance check:** the rows are compared with current on-chain balances, asset by asset.
- **Formats:** Koinly Universal, CoinTracker, CoinLedger and Awaken Tax templates.

## Private by design

Everything runs in your browser from a **public** wallet address. No sign-up, no wallet connection, no server,
no analytics. The only network calls go to the Solana RPC endpoint, token-metadata sources and a public SOL/USD price. This repository is
the complete source.

## Pricing

Analysis, preview and the sample wallet are free. Downloading the full file costs 0.25 SOL or 29 USDC once, for
12 months and up to 5 wallets, paid on-chain; the payment itself unlocks the download.

SolTax Cleaner reformats transaction data. It does not calculate tax and is not tax advice.

## Popular guides

- [Solana crypto taxes: how to get a correct transaction history](https://yasinfadayiee.github.io/sol-tax-cleaner/solana-crypto-taxes-transaction-history/)
- [Koinly shows the wrong Solana balance](https://yasinfadayiee.github.io/sol-tax-cleaner/koinly-solana-balance-wrong/)
- [Jupiter DCA trades missing in Koinly](https://yasinfadayiee.github.io/sol-tax-cleaner/koinly-jupiter-dca-missing/)
- [One Solana swap showing as several transactions](https://yasinfadayiee.github.io/sol-tax-cleaner/solana-swap-split-into-multiple-transactions/)
- [Export Phantom transaction history to CSV](https://yasinfadayiee.github.io/sol-tax-cleaner/export-phantom-transaction-history-csv/)
- [All guides](https://yasinfadayiee.github.io/sol-tax-cleaner/guides/)

Found a problem? [Open an issue](https://github.com/yasinfadayiee/sol-tax-cleaner/issues/new).

## Development

TypeScript, React and Vite; static site on GitHub Pages. See [AGENTS.md](AGENTS.md) and [docs/SPEC.md](docs/SPEC.md).

```sh
npm ci
npm test
npm run build
```
