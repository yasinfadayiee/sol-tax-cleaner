/** Landing-page FAQ; also rendered as FAQPage structured data by scripts/prerender.mjs. */
export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Do you calculate my tax?',
    a: 'No. We only clean and reformat your transaction history. Your tax tool (or your accountant) does the tax calculation. This is not tax advice.',
  },
  {
    q: 'Is my data sent anywhere?',
    a: 'No. Everything runs in your browser. It reads public blockchain data from a Solana RPC endpoint and asks CoinGecko for the SOL price (with no wallet data). Your addresses, history and files are never sent to us.',
  },
  {
    q: 'Which tax tools are supported?',
    a: 'Koinly, CoinTracker, CoinLedger and Awaken, each in its own import format. Pick the tool before you download; you can switch at any time.',
  },
  {
    q: 'How do I import it without duplicates?',
    a: 'Remove or exclude the Solana wallets your tax tool synced automatically for these addresses, then import our CSV as one custom wallet. Transfers between your own addresses are already netted out.',
  },
  {
    q: "What isn't included?",
    a: 'NFT-specific handling and price data (your tax tool adds prices). Native staking rewards are included, one row per stake account per epoch. The report lists anything that needs a manual look.',
  },
  {
    q: 'Why pay from my wallet, in SOL or USDC?',
    a: "Paying from your own wallet is also how the site recognises you, so there are no accounts, emails or licence keys. Pay in SOL, or in USDC if you'd rather have a fixed dollar price.",
  },
]
