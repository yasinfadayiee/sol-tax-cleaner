// Renders brand images into public/: og.png (social preview), og/<guide>.jpg (one per guide) and apple-touch-icon.png.
// Needs Playwright with Chromium: PW=<path to playwright> node scripts/brand/render.mjs
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const { chromium } = createRequire(import.meta.url)(process.env.PW ?? 'playwright')
const here = (f) => new URL(f, import.meta.url).href
const out = (f) => fileURLToPath(new URL(`../../public/${f}`, import.meta.url))

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await og.goto(here('og.html'), { waitUntil: 'networkidle' })
await og.screenshot({ path: out('og.png') })
// Guide previews: the guide's H1 and its section name (CATEGORIES in scripts/build-pages.mjs).
const SECTIONS = { tools: 'Tax tools and exports', trades: 'Swaps, DCA and DeFi trades', accounts: 'Rent, staking and tokens' }
const content = fileURLToPath(new URL('../../content/', import.meta.url))
mkdirSync(out('og'), { recursive: true })
const guide = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await guide.goto(here('og-guide.html'), { waitUntil: 'networkidle' })
for (const file of readdirSync(content).filter((f) => f.endsWith('.md'))) {
  const src = readFileSync(content + file, 'utf8')
  const category = /^category: (.*)$/m.exec(src)?.[1]
  if (!category) continue
  const title = /^# (.*)$/m.exec(src)[1]
  await guide.evaluate(([t, s]) => {
    document.getElementById('title').textContent = t
    document.getElementById('section').textContent = s
  }, [title, SECTIONS[category]])
  await guide.screenshot({ path: out(`og/${file.replace(/\.md$/, '.jpg')}`), type: 'jpeg', quality: 86 })
}
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
await icon.setContent(`<body style="margin:0;background:linear-gradient(135deg,#19D3A2,#7C5CFF)"><img src="${here('../../public/favicon.svg')}" width="180" height="180">`)
await icon.screenshot({ path: out('apple-touch-icon.png') })
await browser.close()
