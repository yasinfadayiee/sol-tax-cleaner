// Renders content/*.md into static pages under dist/<slug>/index.html, plus sitemap.xml and robots.txt.
// Runs after `vite build`. Static HTML so guides and legal pages work without JavaScript and index well.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SITE_URL = (process.env.SITE_URL ?? 'https://yasinfadayiee.github.io/sol-tax-cleaner/').replace(/\/?$/, '/')
const APP_NAME = 'SolTax Cleaner'
const root = new URL('..', import.meta.url).pathname
const contentDir = join(root, 'content')
const dist = join(root, 'dist')

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

function page({ title, description, url, body }) {
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
<meta property="og:image" content="${SITE_URL}og.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="apple-touch-icon" href="../apple-touch-icon.png" />
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<link rel="stylesheet" href="../pages.css" />
</head>
<body>
<header class="site-header"><div class="wrap"><a class="brand" href="../"><img src="../favicon.svg" width="28" height="28" alt="" />${APP_NAME}</a><nav><a class="nav-cta" href="../#analyse">Analyse free</a></nav></div></header>
<main class="wrap prose">
${body}
<p class="cta"><a class="button" href="../#analyse">Analyse your wallet free</a></p>
</main>
<footer class="site-footer"><div class="wrap"><p>${APP_NAME}. Not tax advice. <a href="../terms/">Terms</a> · <a href="../privacy/">Privacy</a></p></div></footer>
</body>
</html>
`
}

if (!existsSync(dist)) throw new Error('Run vite build first')
const urls = [SITE_URL]
for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '')
  const { meta, body } = parse(join(contentDir, file))
  const url = `${SITE_URL}${slug}/`
  mkdirSync(join(dist, slug), { recursive: true })
  writeFileSync(join(dist, slug, 'index.html'), page({ title: meta.title, description: meta.description, url, body: markdown(body) }))
  urls.push(url)
}
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`)
console.log(`Rendered ${urls.length - 1} pages`)
