// Renders content/*.md into static pages under dist/<slug>/index.html, a /guides/ index, sitemap.xml and robots.txt.
// Runs after `vite build`. Static HTML so guides and legal pages work without JavaScript and index well.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const SITE_URL = (process.env.SITE_URL ?? 'https://yasinfadayiee.github.io/sol-tax-cleaner/').replace(/\/?$/, '/')
const APP_NAME = 'SolTax Cleaner'
const root = new URL('..', import.meta.url).pathname
const contentDir = join(root, 'content')
const dist = join(root, 'dist')
// Legal pages; every other content file is a guide.
const LEGAL = new Set(['terms', 'privacy'])
// Sections of the guides index, in order; each guide names one in its `category` front matter.
const CATEGORIES = {
  tools: 'Tax tools and exports',
  trades: 'Swaps, DCA and DeFi trades',
  accounts: 'Rent, staking and tokens',
}

// First and last commit dates of a content file (YYYY-MM-DD); today when git history isn't available.
function gitDates(file) {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const dates = execFileSync('git', ['log', '--follow', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    return { published: dates.at(-1) ?? today, modified: dates[0] ?? today }
  } catch {
    return { published: today, modified: today }
  }
}

const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
      const external = /^https?:/.test(href)
      return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${t}</a>`
    })
}

export function markdown(md) {
  const out = []
  let para = []
  let list = null
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`)
    list = null
  }
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    const h = /^(#{1,3}) (.*)$/.exec(line)
    const ul = /^- (.*)$/.exec(line)
    const ol = /^\d+\. (.*)$/.exec(line)
    if (h) {
      flushPara()
      flushList()
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`)
    } else if (ul || ol) {
      flushPara()
      const tag = ul ? 'ul' : 'ol'
      if (!list || list.tag !== tag) {
        flushList()
        list = { tag, items: [] }
      }
      list.items.push((ul ?? ol)[1])
    } else if (!line) {
      flushPara()
      flushList()
    } else if (list) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else {
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return out.join('\n')
}

function parse(file) {
  const src = readFileSync(file, 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src)
  if (!m) throw new Error(`${file}: missing front matter`)
  const meta = Object.fromEntries(m[1].split('\n').map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]))
  return { meta, body: m[2] }
}

function page({ title, description, url, body, jsonLd, cta = true, image = `${SITE_URL}og.png` }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${image}" />
<link rel="apple-touch-icon" href="../apple-touch-icon.png" />
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<link rel="stylesheet" href="../pages.css" />
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>
<body>
<header class="site-header"><div class="wrap"><a class="brand" href="../"><img src="../favicon.svg" width="28" height="28" alt="" />${APP_NAME}</a><nav aria-label="Main"><a class="wide" href="../#how">How it works</a><a class="wide" href="../#pricing">Pricing</a><a href="../guides/">Guides</a><a class="nav-cta" href="../#analyse">Analyse free</a></nav></div></header>
<main class="wrap prose">
${body}
${cta ? '<p class="cta"><a class="button" href="../#analyse">Analyse your wallet free</a></p>' : ''}
</main>
<footer class="site-footer"><div class="wrap footer-grid">
<div><a class="brand" href="../"><img src="../favicon.svg" width="22" height="22" alt="" />${APP_NAME}</a><p>Clean Solana history for crypto tax tools. Runs in your browser. We don't calculate tax; this is not tax advice.</p></div>
<nav aria-label="Product"><h3>Product</h3><a href="../#analyse">Analyse a wallet</a><a href="../#sample">Try the sample wallet</a><a href="../#pricing">Pricing</a><a href="../#faq">FAQ</a></nav>
<nav aria-label="Guides"><h3>Guides</h3>${footerGuides}<a href="../guides/">All guides</a></nav>
<nav aria-label="Help and legal"><h3>Help &amp; legal</h3><a href="../terms/">Terms</a><a href="../privacy/">Privacy</a><a href="https://github.com/yasinfadayiee/sol-tax-cleaner/issues/new" rel="noopener">Report a problem</a></nav>
</div><div class="wrap footer-bottom"><p>© ${YEAR} ${APP_NAME}. Not affiliated with Koinly, CoinTracker, CoinLedger or Awaken.</p></div></footer>
</body>
</html>
`
}

// Guides sharing the most slug words come first, so each page links to its closest neighbours.
const COMMON = new Set(['solana', 'tax', 'software', 'into', 'import'])
function related(guide, guides, n = 4) {
  const words = new Set(guide.slug.split('-').filter((w) => w.length > 2 && !COMMON.has(w)))
  return guides
    .filter((g) => g !== guide)
    .map((g) => ({ g, score: g.slug.split('-').filter((w) => words.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.g.slug.localeCompare(b.g.slug))
    .slice(0, n)
    .map((x) => x.g)
}

const guideList = (items) =>
  `<ul class="guide-list">${items.map((g) => `<li><a href="../${g.slug}/"><strong>${inline(g.heading)}</strong><span>${esc(g.meta.description)}</span></a></li>`).join('')}</ul>`

const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
})

if (!existsSync(dist)) throw new Error('Run vite build first')
const pages = readdirSync(contentDir)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((file) => {
    const slug = file.replace(/\.md$/, '')
    const { meta, body } = parse(join(contentDir, file))
    const heading = /^# (.*)$/m.exec(body)?.[1] ?? meta.title
    return { slug, meta, body, heading, url: `${SITE_URL}${slug}/`, dates: gitDates(join(contentDir, file)) }
  })
const guides = pages.filter((p) => !LEGAL.has(p.slug))
for (const g of guides) if (!CATEGORIES[g.meta.category]) throw new Error(`${g.slug}.md: category must be one of ${Object.keys(CATEGORIES).join(', ')}`)
const guidesUrl = `${SITE_URL}guides/`
const YEAR = new Date().getUTCFullYear()
// The same four guides the landing page footer lists.
const footerGuides = ['koinly-jupiter-dca-missing', 'koinly-solana-rent-not-merged', 'cointracker-jupiter-limit-order-one-sided', 'solana-swap-split-into-multiple-transactions']
  .map((slug) => guides.find((g) => g.slug === slug))
  .map((g) => `<a href="../${g.slug}/">${inline(g.heading)}</a>`)
  .join('')

// pages.css uses the Inter font the app bundles; point it at the hashed file Vite emitted.
const inter = readdirSync(join(dist, 'assets')).find((f) => /^inter-latin-wght-normal-.*\.woff2$/.test(f))
if (inter) {
  const css = join(dist, 'pages.css')
  writeFileSync(css, `@font-face{font-family:'Inter Variable';font-style:normal;font-display:swap;font-weight:100 900;src:url(assets/${inter}) format('woff2')}\n${readFileSync(css, 'utf8')}`)
}

for (const p of pages) {
  const isGuide = !LEGAL.has(p.slug)
  let body = markdown(p.body)
  if (isGuide) {
    body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a><span aria-hidden="true">›</span><a href="../guides/">Guides</a></nav>\n${body.replace(
      '</h1>',
      `</h1>\n<p class="meta">Updated <time datetime="${p.dates.modified}">${longDate(p.dates.modified)}</time> · Not tax advice</p>`,
    )}`
    body += `\n<aside class="cta-card"><p><strong>Fix this in your own history.</strong> Paste your public address and preview the cleaned rows free. Everything runs in your browser.</p><p><a class="button" href="../#analyse">Analyse your wallet free</a> <a href="../#sample">or try a sample wallet</a></p></aside>\n<h2>Related guides</h2>\n${guideList(related(p, guides))}\n<p><a href="../guides/">All guides</a></p>`
  }
  // Per-guide social preview from scripts/brand/render.mjs, when one has been rendered.
  const image = isGuide && existsSync(join(root, 'public', 'og', `${p.slug}.jpg`)) ? `${SITE_URL}og/${p.slug}.jpg` : undefined
  const jsonLd = isGuide && {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: p.heading,
        description: p.meta.description,
        url: p.url,
        image: image ?? `${SITE_URL}og.png`,
        datePublished: p.dates.published,
        dateModified: p.dates.modified,
        publisher: { '@type': 'Organization', name: APP_NAME, url: SITE_URL },
      },
      breadcrumb([[APP_NAME, SITE_URL], ['Guides', guidesUrl], [p.heading, p.url]]),
    ],
  }
  mkdirSync(join(dist, p.slug), { recursive: true })
  writeFileSync(join(dist, p.slug, 'index.html'), page({ title: p.meta.title, description: p.meta.description, url: p.url, body, jsonLd, cta: !isGuide, image }))
}

mkdirSync(join(dist, 'guides'), { recursive: true })
writeFileSync(
  join(dist, 'guides', 'index.html'),
  page({
    title: `Solana tax import guides — ${APP_NAME}`,
    description: 'Fixes for the most common problems when importing Solana wallets into Koinly, CoinTracker, CoinLedger and Awaken: rent, split swaps, DCA, staking and more.',
    url: guidesUrl,
    body: `<nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a></nav>\n<h1>Solana tax import guides</h1>\n<p class="lede">Short fixes for the problems people hit when they import a Solana wallet into crypto tax software. Each one explains why it happens and what to do about it.</p>\n${Object.entries(
      CATEGORIES,
    )
      .map(([key, name]) => `<h2>${name}</h2>\n${guideList(guides.filter((g) => g.meta.category === key))}`)
      .join('\n')}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'Solana tax import guides',
          url: guidesUrl,
          hasPart: guides.map((g) => ({ '@type': 'TechArticle', headline: g.heading, url: g.url })),
        },
        breadcrumb([[APP_NAME, SITE_URL], ['Guides', guidesUrl]]),
      ],
    },
  }),
)

// GitHub Pages serves 404.html for any missing path, at any depth, so its links must be absolute.
const basePath = new URL(SITE_URL).pathname
writeFileSync(
  join(dist, '404.html'),
  page({
    title: `Page not found — ${APP_NAME}`,
    description: 'This page does not exist.',
    url: SITE_URL,
    body: `<h1>Page not found</h1>\n<p>That page doesn't exist. It may have moved, or the link may be mistyped.</p>\n<p><a href="../">Go to the home page</a> or <a href="../guides/">browse the guides</a>.</p>`,
  })
    .replaceAll('href="../', `href="${basePath}`)
    .replaceAll('src="../', `src="${basePath}`)
    .replace('<link rel="canonical"', '<meta name="robots" content="noindex" />\n<link rel="canonical"'),
)

const newest = pages.map((p) => p.dates.modified).sort().at(-1)
const urls = [[SITE_URL], [guidesUrl, newest], ...pages.map((p) => [p.url, p.dates.modified])]
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`)
console.log(`Rendered ${pages.length} pages and the guides index`)
