import { APP_NAME, MAX_WALLETS, PRICE_SOL, UNLOCK_DAYS } from './config'
import { Analyzer } from './ui/Analyzer'

const base = import.meta.env.BASE_URL
const YEAR = new Date().getFullYear()

const GUIDES = [
  { slug: 'koinly-jupiter-dca-missing', title: 'Jupiter DCA trades missing in Koinly' },
  { slug: 'koinly-solana-rent-not-merged', title: 'Solana rent not merged into transactions' },
  { slug: 'cointracker-jupiter-limit-order-one-sided', title: 'Jupiter limit orders showing as one-sided' },
  { slug: 'solana-swap-split-into-multiple-transactions', title: 'One swap showing as several rows' },
]

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href={base}>
            {APP_NAME}
          </a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Fix your Solana transactions for Koinly in minutes</h1>
          <p className="lead">
            Swaps split into four rows. DCA fills that never show up. Rent counted as a loss. Paste your wallet address and
            get one clean CSV where every Solana transaction is rebuilt correctly.
          </p>
          <ul className="ticks">
            <li>Runs entirely in your browser: no sign-up, no upload</li>
            <li>Finds transactions Koinly misses, such as fills that touch only your token accounts</li>
            <li>Free analysis and preview; pay only to download</li>
          </ul>
        </section>

        <Analyzer />

        <section aria-labelledby="before-after">
          <h2 id="before-after">Before and after</h2>
          <p className="muted">One Jupiter swap of 1 SOL for 150 USDC, as tax tools often import it, and as we export it.</p>
          <div className="compare">
            <div>
              <h3 className="small-caps">Typical import</h3>
              <div className="table-wrap">
                <table>
                  <tbody>
                    <tr><td>Withdrawal</td><td>0.00203928 SOL</td><td className="bad">rent counted as a cost</td></tr>
                    <tr><td>Withdrawal</td><td>1 SOL</td><td className="bad">looks like a sale</td></tr>
                    <tr><td>Deposit</td><td>150 USDC</td><td className="bad">unknown income</td></tr>
                    <tr><td>Deposit</td><td>0.00203928 SOL</td><td className="bad">rent refund as income</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="small-caps">{APP_NAME}</h3>
              <div className="table-wrap">
                <table>
                  <tbody>
                    <tr><td>Swap</td><td>1 SOL → 150 USDC</td><td className="good">fee 0.000015 SOL</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title">
          <h2 id="how-title">How it works</h2>
          <ol className="how">
            <li>
              <strong>Read.</strong> Your browser pulls every transaction for your wallets and every token account they ever
              owned, straight from a Solana RPC node.
            </li>
            <li>
              <strong>Rebuild.</strong> Each transaction is reduced to what actually left and entered your wallets. Rent,
              wrapped SOL and temporary accounts cancel out; one swap becomes one row.
            </li>
            <li>
              <strong>Export.</strong> Download a CSV in Koinly’s Universal format plus a short report of anything worth a
              second look.
            </li>
          </ol>
        </section>

        <section id="pricing" aria-labelledby="pricing-title">
          <h2 id="pricing-title">Pricing</h2>
          <div className="card price">
            <p className="amount">{PRICE_SOL} SOL</p>
            <p>
              One payment unlocks the full export for up to {MAX_WALLETS} wallets for {UNLOCK_DAYS} days, including re-exports
              after new trades.
            </p>
            <p className="muted small">The analysis and preview are free, so you see the result before you pay.</p>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title">FAQ</h2>
          <details>
            <summary>Do you calculate my tax?</summary>
            <p>No. We only clean and reformat your transaction history. Koinly (or your accountant) does the tax calculation. This is not tax advice.</p>
          </details>
          <details>
            <summary>Is my data sent anywhere?</summary>
            <p>No. Everything runs in your browser. The only network requests go to the Solana RPC endpoint (to read public blockchain data) and nowhere else.</p>
          </details>
          <details>
            <summary>Which tax tools are supported?</summary>
            <p>Koinly’s Universal CSV format today. Other tools that accept a generic CSV can usually import it too.</p>
          </details>
          <details>
            <summary>How do I import it without duplicates?</summary>
            <p>Remove or exclude the Solana wallets Koinly synced automatically for these addresses, then import our CSV as one custom wallet. Transfers between your own addresses are already netted out.</p>
          </details>
          <details>
            <summary>What isn’t included?</summary>
            <p>Automatic staking rewards paid each epoch without a transaction, NFT-specific handling and price data. The report lists anything that needs a manual look.</p>
          </details>
          <details>
            <summary>Why pay in SOL?</summary>
            <p>Paying from your own wallet is also how the site recognises you, so there are no accounts, emails or licence keys.</p>
          </details>
        </section>

        <section aria-labelledby="guides-title">
          <h2 id="guides-title">Guides</h2>
          <ul className="guides">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <a href={`${base}${g.slug}/`}>{g.title}</a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            © {YEAR} {APP_NAME}. Not tax advice. <a href={`${base}terms/`}>Terms</a> ·{' '}
            <a href={`${base}privacy/`}>Privacy</a>
          </p>
        </div>
      </footer>
    </>
  )
}
