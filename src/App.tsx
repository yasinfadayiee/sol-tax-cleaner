import { APP_NAME, MAX_WALLETS, PRICE_SOL, UNLOCK_DAYS } from './config'
import { Analyzer } from './ui/Analyzer'
import { Icon, Logo, type IconName } from './ui/Icon'

const base = import.meta.env.BASE_URL
const YEAR = new Date().getFullYear()

const TRUST: Array<{ icon: IconName; text: string }> = [
  { icon: 'user', text: 'No sign-up or email' },
  { icon: 'browser', text: 'Runs in your browser' },
  { icon: 'lock', text: 'Public address only, never keys' },
  { icon: 'scale', text: 'Rows reconcile to on-chain balances' },
]

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
    text: 'Download a Koinly Universal CSV plus a short report of anything worth a second look.',
  },
]

const INCLUDED = [
  `Full CSV export for up to ${MAX_WALLETS} wallets`,
  `Unlimited re-exports for ${UNLOCK_DAYS} days`,
  'Review report for unusual transactions',
  'Custom token names and tickers',
]

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
            <Logo size={28} />
            <span>{APP_NAME}</span>
          </a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a className="nav-cta" href="#analyse">
              Analyse free
            </a>
          </nav>
        </div>
      </header>

      <div className="hero-band">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">For Solana traders who use Koinly</p>
            <h1>
              Messy Solana history in. <span className="grad">One clean CSV out.</span>
            </h1>
            <p className="lead">
              Swaps split into four rows, DCA fills that never show up, rent counted as income. Paste your wallet address
              and get a Koinly file where every transaction is rebuilt correctly.
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

        <section id="pricing" aria-labelledby="pricing-title">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-title">One payment, no subscription</h2>
          <div className="price-card">
            <div>
              <p className="amount">
                {PRICE_SOL} <span>SOL</span>
              </p>
              <p className="muted">per year, paid once from your own wallet</p>
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
          <p className="eyebrow">Guides</p>
          <h2 id="guides-title">Fixes for common Solana import problems</h2>
          <ul className="guides">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <a href={`${base}${g.slug}/`}>
                  <Icon name="doc" size={18} />
                  <span>{g.title}</span>
                  <Icon name="arrow" size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <a className="brand" href={base}>
            <Logo size={22} />
            <span>{APP_NAME}</span>
          </a>
          <p>
            © {YEAR} {APP_NAME}. Not tax advice. <a href={`${base}terms/`}>Terms</a> ·{' '}
            <a href={`${base}privacy/`}>Privacy</a>
          </p>
        </div>
      </footer>
    </>
  )
}
