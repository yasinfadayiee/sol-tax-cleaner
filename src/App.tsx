import { APP_NAME, MAX_WALLETS, PRICE_SOL, PRICE_USDC, REPO_URL, SUPPORT_URL, UNLOCK_DAYS } from './config'
import { FAQ } from './faq'
import { Analyzer } from './ui/Analyzer'
import { Icon, Logo, type IconName } from './ui/Icon'
import { usdLabel, useSolPrice } from './ui/useSolPrice'

const base = import.meta.env.BASE_URL
const YEAR = new Date().getFullYear()

const TRUST: Array<{ icon: IconName; text: string }> = [
  { icon: 'user', text: 'No sign-up or email' },
  { icon: 'browser', text: 'Runs in your browser' },
  { icon: 'lock', text: 'Public address only, never keys' },
  { icon: 'scale', text: 'Rows reconcile to on-chain balances' },
]

const TOOLS = ['Koinly', 'CoinTracker', 'CoinLedger', 'Awaken']

const PROBLEMS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'split',
    title: 'One swap, four rows',
    text: 'A Jupiter swap touches several accounts, so tax tools import it as separate sends and receives instead of one trade.',
  },
  {
    icon: 'coins',
    title: 'Rent counted as income',
    text: 'The 0.002 SOL locked when a token account opens is booked as a cost, then its refund as income, inflating both sides.',
  },
  {
    icon: 'search',
    title: 'DCA and limit fills missing',
    text: 'Fills that land only in your token accounts never show up, or show up as receives with nothing paid for them.',
  },
]

const STEPS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'search',
    title: 'Read',
    text: 'Your browser pulls every transaction for your wallets and every token account they ever owned, straight from Solana.',
  },
  {
    icon: 'layers',
    title: 'Rebuild',
    text: 'Each transaction is reduced to what actually left and entered your wallets. Rent and wrapped SOL cancel out.',
  },
  {
    icon: 'download',
    title: 'Export',
    text: 'Download a CSV for Koinly, CoinTracker, CoinLedger or Awaken, plus a short report of anything worth a second look.',
  },
]

const COVERAGE: Array<{ title: string; text: string; guide?: string; review?: boolean }> = [
  { title: 'Jupiter swaps', text: 'Every route, one row with what left and what arrived.', guide: 'solana-swap-split-into-multiple-transactions' },
  { title: 'Jupiter DCA and limit orders', text: 'Each keeper fill becomes its own swap, even when it only touched the order account.', guide: 'koinly-jupiter-dca-missing' },
  { title: 'pump.fun trades', text: 'Bonding-curve buys and sells as plain swaps.', guide: 'pump-fun-trades-tax-software' },
  { title: 'Raydium, Orca, Meteora', text: 'Pool swaps as one row each.', guide: 'raydium-orca-meteora-swaps-tax-software' },
  { title: 'Native staking rewards', text: 'One income row per stake account per epoch.', guide: 'solana-staking-rewards-tax-software' },
  { title: 'Rent and wrapped SOL', text: 'Token-account rent and WSOL wrapping cancel out instead of looking like trades.', guide: 'wrapped-sol-wsol-tax-software' },
  { title: 'Your own wallets', text: `Transfers between up to ${MAX_WALLETS} of your addresses are netted out.` },
  { title: 'Failed transactions', text: 'Kept as a fee-only row, because the fee was still paid.' },
  { title: 'Spam tokens and airdrops', text: 'Plain deposits, with a note when a stranger paid the rent.', guide: 'solana-spam-tokens-airdrops-tax-software' },
  { title: 'Liquidity adds and removals', text: 'Moves of three or more assets are exported per asset and listed for you to check.', review: true },
]

const INCLUDED = [
  `Full CSV export for up to ${MAX_WALLETS} wallets`,
  `Unlimited re-exports for ${UNLOCK_DAYS} days`,
  'Review report for unusual transactions',
  'Custom token names and tickers',
]

const GUIDES = [
  { slug: 'solana-crypto-taxes-transaction-history', title: 'Solana crypto taxes: get a correct history' },
  { slug: 'koinly-solana-balance-wrong', title: 'Koinly shows the wrong Solana balance' },
  { slug: 'koinly-jupiter-dca-missing', title: 'Jupiter DCA trades missing in Koinly' },
  { slug: 'koinly-solana-rent-not-merged', title: 'Solana rent not merged into transactions' },
  { slug: 'cointracker-jupiter-limit-order-one-sided', title: 'Jupiter limit orders showing as one-sided' },
  { slug: 'solana-swap-split-into-multiple-transactions', title: 'One swap showing as several rows' },
  { slug: 'cointracker-solana-transactions-wrong', title: 'Solana transactions wrong in CoinTracker' },
  { slug: 'coinledger-solana-import', title: 'Import Solana DeFi history into CoinLedger' },
  { slug: 'pump-fun-trades-tax-software', title: 'pump.fun trades in tax software' },
  { slug: 'phantom-wallet-transactions-koinly', title: 'Phantom wallet history in Koinly' },
  { slug: 'export-phantom-transaction-history-csv', title: 'Export Phantom transaction history to CSV' },
  { slug: 'jupiter-swap-history-tax-csv', title: 'Jupiter swap history for taxes' },
  { slug: 'wrapped-sol-wsol-tax-software', title: 'Wrapped SOL (WSOL) showing in your tax tool' },
  { slug: 'solana-staking-rewards-tax-software', title: 'Solana staking rewards missing' },
  { slug: 'awaken-solana-csv-import', title: 'Import cleaned Solana history into Awaken' },
  { slug: 'solscan-csv-export-tax-software', title: 'Why a Solscan CSV export imports badly' },
  { slug: 'raydium-orca-meteora-swaps-tax-software', title: 'Raydium, Orca and Meteora swaps' },
  { slug: 'solana-spam-tokens-airdrops-tax-software', title: 'Spam tokens and airdrops in your tax tool' },
]

export default function App() {
  const usdPrice = useSolPrice()
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href={base}>
            <Logo size={28} />
            <span>{APP_NAME}</span>
          </a>
          <nav aria-label="Main">
            <a className="wide" href="#how">How it works</a>
            <a className="wide" href="#pricing">Pricing</a>
            <a className="wide" href="#faq">FAQ</a>
            <a href={`${base}guides/`}>Guides</a>
            <a className="nav-cta" href="#analyse">
              Analyse free
            </a>
          </nav>
        </div>
      </header>

      <div className="hero-band">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">For Solana traders and DeFi users</p>
            <h1>
              Messy Solana history in. <span className="grad">One clean CSV out.</span>
            </h1>
            <p className="lead">
              Swaps split into four rows, DCA fills that never show up, rent counted as income. Paste your wallet address
              and get a tax-tool CSV where every transaction is rebuilt correctly.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#analyse">
                Analyse my wallet free <Icon name="arrow" size={18} />
              </a>
              <a className="button secondary" href="#sample">
                Try a sample wallet
              </a>
            </div>
            <p className="hero-note muted small">No address handy? The sample wallet shows real output in one click.</p>
            <p className="works-with">
              <span className="muted small">Exports for</span>
              {TOOLS.map((t) => (
                <span className="tool" key={t}>
                  {t}
                </span>
              ))}
            </p>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="stack">
              <div className="row-card messy m1"><span>Withdrawal</span><b>0.00204 SOL</b><i>rent</i></div>
              <div className="row-card messy m2"><span>Withdrawal</span><b>1 SOL</b><i>sale?</i></div>
              <div className="row-card messy m3"><span>Deposit</span><b>150 USDC</b><i>income?</i></div>
              <div className="row-card messy m4"><span>Deposit</span><b>0.00204 SOL</b><i>refund</i></div>
            </div>
            <div className="merge-arrow">
              <Icon name="arrow" size={28} />
            </div>
            <div className="row-card clean">
              <span className="pill">Swap</span>
              <b>1 SOL → 150 USDC</b>
              <em>
                <Icon name="check" size={16} /> one row
              </em>
            </div>
          </div>
        </section>

        <ul className="trust wrap">
          {TRUST.map((t) => (
            <li key={t.text}>
              <Icon name={t.icon} size={18} />
              {t.text}
            </li>
          ))}
        </ul>
      </div>

      <main className="wrap">
        <Analyzer />

        <section aria-labelledby="problems-title">
          <p className="eyebrow">The problem</p>
          <h2 id="problems-title">Why Solana looks wrong in tax tools</h2>
          <div className="grid-3">
            {PROBLEMS.map((p) => (
              <div className="feature" key={p.title}>
                <span className="feature-icon bad-bg">
                  <Icon name={p.icon} />
                </span>
                <h3>{p.title}</h3>
                <p className="muted">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="before-after">
          <p className="eyebrow">Example</p>
          <h2 id="before-after">Before and after</h2>
          <p className="muted">One Jupiter swap of 1 SOL for 150 USDC, as tax tools often import it, and as we export it.</p>
          <div className="compare">
            <div className="compare-col">
              <h3 className="small-caps">Typical import</h3>
              <div className="table-wrap">
                <table>
                  <thead className="sr-only">
                    <tr><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">How a tax tool reads it</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Withdrawal</td><td>0.00203928 SOL</td><td className="bad">rent counted as a cost</td></tr>
                    <tr><td>Withdrawal</td><td>1 SOL</td><td className="bad">looks like a sale</td></tr>
                    <tr><td>Deposit</td><td>150 USDC</td><td className="bad">unknown income</td></tr>
                    <tr><td>Deposit</td><td>0.00203928 SOL</td><td className="bad">rent refund as income</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="compare-arrow" aria-hidden="true">
              <Icon name="arrow" size={24} />
            </div>
            <div className="compare-col">
              <h3 className="small-caps">{APP_NAME}</h3>
              <div className="table-wrap good-wrap">
                <table>
                  <thead className="sr-only">
                    <tr><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">Fee</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Swap</td><td>1 SOL → 150 USDC</td><td className="good">fee 0.000015 SOL</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">Three steps, about a minute</h2>
          <ol className="grid-3 steps-list">
            {STEPS.map((s, i) => (
              <li className="feature" key={s.title}>
                <span className="feature-icon">
                  <Icon name={s.icon} />
                </span>
                <h3>
                  <span className="step-n">{i + 1}</span> {s.title}
                </h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="coverage" aria-labelledby="coverage-title">
          <p className="eyebrow">What it handles</p>
          <h2 id="coverage-title">Built for how Solana actually works</h2>
          <ul className="coverage">
            {COVERAGE.map((c) => (
              <li key={c.title} className={c.review ? 'review' : undefined}>
                <span className="coverage-icon" aria-hidden="true">
                  <Icon name={c.review ? 'search' : 'check'} size={16} />
                </span>
                <div>
                  <h3>{c.guide ? <a href={`${base}${c.guide}/`}>{c.title}</a> : c.title}</h3>
                  <p className="muted">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="pricing" aria-labelledby="pricing-title">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-title">One payment, no subscription</h2>
          <div className="price-card">
            <div>
              <p className="amount">
                {PRICE_SOL} <span>SOL</span>
              </p>
              <p className="muted">
                {usdPrice && <strong className="usd">{usdLabel(PRICE_SOL, usdPrice)} today. </strong>}
                Or pay {PRICE_USDC} USDC. Per year, paid once from your own wallet.
              </p>
              <a className="button primary" href="#analyse">
                Start with a free analysis
              </a>
            </div>
            <ul className="included">
              {INCLUDED.map((t) => (
                <li key={t}>
                  <Icon name="check" size={18} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="muted small">The analysis and preview are free, so you see the result before you pay.</p>
        </section>

        <section id="faq" aria-labelledby="faq-title">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title">Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section aria-labelledby="guides-title">
          <p className="eyebrow">Guides</p>
          <h2 id="guides-title">Fixes for common Solana import problems</h2>
          <ul className="guides">
            {GUIDES.slice(0, 6).map((g) => (
              <li key={g.slug}>
                <a href={`${base}${g.slug}/`}>
                  <Icon name="doc" size={18} />
                  <span>{g.title}</span>
                  <Icon name="arrow" size={16} />
                </a>
              </li>
            ))}
          </ul>
          <p>
            <a className="button secondary" href={`${base}guides/`}>
              Browse all guides <Icon name="arrow" size={16} />
            </a>
          </p>
        </section>

        <section className="final-cta" aria-labelledby="final-cta-title">
          <h2 id="final-cta-title">See your own history cleaned up</h2>
          <p className="muted">
            The analysis and preview are free and run in your browser. Pay only when you want the full CSV.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#analyse">
              Analyse my wallet free <Icon name="arrow" size={18} />
            </a>
            <a className="button secondary" href="#sample">
              Try a sample wallet
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <a className="brand" href={base}>
              <Logo size={22} />
              <span>{APP_NAME}</span>
            </a>
            <p className="muted small">
              Clean Solana history for crypto tax tools. Runs in your browser. We don't calculate tax; this is not tax advice.
            </p>
          </div>
          <nav aria-label="Product">
            <h3>Product</h3>
            <a href="#analyse">Analyse a wallet</a>
            <a href="#sample">Try the sample wallet</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav aria-label="Popular guides">
            <h3>Guides</h3>
            {GUIDES.slice(0, 4).map((g) => (
              <a key={g.slug} href={`${base}${g.slug}/`}>
                {g.title}
              </a>
            ))}
            <a href={`${base}guides/`}>All guides</a>
          </nav>
          <nav aria-label="Help and legal">
            <h3>Help &amp; legal</h3>
            <a href={`${base}terms/`}>Terms</a>
            <a href={`${base}privacy/`}>Privacy</a>
            <a href={REPO_URL} target="_blank" rel="noopener">
              Source code
            </a>
            <a href={SUPPORT_URL} target="_blank" rel="noopener">
              Report a problem
            </a>
          </nav>
        </div>
        <div className="wrap footer-bottom">
          <p>
            © {YEAR} {APP_NAME}. Not affiliated with Koinly, CoinTracker, CoinLedger or Awaken.
          </p>
        </div>
      </footer>
    </>
  )
}
