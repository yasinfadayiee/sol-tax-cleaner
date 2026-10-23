// Prerenders the landing page into dist/index.html and adds its structured data, so search engines and
// visitors get the full page before JavaScript loads. Runs after `vite build` and the SSR build of
// src/entry-server.ts into dist-ssr/.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SITE_URL = (process.env.SITE_URL ?? 'https://yasinfadayiee.github.io/sol-tax-cleaner/').replace(/\/?$/, '/')
const root = new URL('..', import.meta.url).pathname
const ssrDir = join(root, 'dist-ssr')
const { render, FAQ, APP_NAME, PRICE_SOL, PRICE_USDC } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: APP_NAME,
      url: SITE_URL,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (runs in the browser)',
      description:
        'Rebuilds Solana wallet history into a clean CSV for Koinly, CoinTracker, CoinLedger or Awaken: one row per swap, rent and wrapped SOL netted out, Jupiter DCA and limit-order fills recovered.',
      image: `${SITE_URL}og.png`,
      offers: [
        { '@type': 'Offer', name: '1-year export licence (SOL)', price: PRICE_SOL, priceCurrency: 'SOL' },
        { '@type': 'Offer', name: '1-year export licence (USDC)', price: PRICE_USDC, priceCurrency: 'USD' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
}

const file = join(root, 'dist', 'index.html')
let html = readFileSync(file, 'utf8')
if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill')
html = html
  .replace('<div id="root"></div>', `<div id="root">${render()}</div>`)
  .replace(
    '</head>',
    `  <link rel="canonical" href="${SITE_URL}" />\n    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`,
  )
writeFileSync(file, html)
rmSync(ssrDir, { recursive: true, force: true })
console.log('Prerendered the landing page')
