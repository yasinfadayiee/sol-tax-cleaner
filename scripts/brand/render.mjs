// Renders brand images into public/: og.png (social preview) and apple-touch-icon.png.
// Needs Playwright with Chromium: PW=<path to playwright> node scripts/brand/render.mjs
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const { chromium } = createRequire(import.meta.url)(process.env.PW ?? 'playwright')
const here = (f) => new URL(f, import.meta.url).href
const out = (f) => fileURLToPath(new URL(`../../public/${f}`, import.meta.url))

const browser = await chromium.launch()
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await og.goto(here('og.html'), { waitUntil: 'networkidle' })
await og.screenshot({ path: out('og.png') })
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
await icon.setContent(`<body style="margin:0;background:linear-gradient(135deg,#19D3A2,#7C5CFF)"><img src="${here('../../public/favicon.svg')}" width="180" height="180">`)
await icon.screenshot({ path: out('apple-touch-icon.png') })
await browser.close()
