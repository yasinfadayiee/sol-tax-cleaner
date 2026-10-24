// Free SEO health check, no AI: run by .github/workflows/maintain.yml every day.
// Finds problems in content/*.md and the landing guide list that hurt search ranking, and
//  - prints them,
//  - with --roadmap, adds one "Fix (auto-check)" item per problem type to the top of docs/ROADMAP.md's Backlog
//    (once; skipped while an open item with the same [auto:key] exists), so a Claude run fixes real problems
//    instead of hunting for them,
//  - with --missing-og, prints the guides without a social preview image (one slug per line).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname
const LEGAL = new Set(['terms', 'privacy'])
// Helper pages that don't belong in the landing page's guide list.
const NOT_ON_LANDING = new Set(['free-solana-rpc-url'])

export function loadGuides(dir = join(root, 'content')) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const src = readFileSync(join(dir, f), 'utf8')
      const meta = Object.fromEntries([...(/^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? '').matchAll(/^(\w+): (.*)$/gm)].map((m) => [m[1], m[2].trim()]))
      return { slug: f.replace(/\.md$/, ''), meta, src }
    })
    .filter((g) => !LEGAL.has(g.slug))
}

/** Problems as { key, text }: key is stable per problem type, text lists the pages affected. */
export function findProblems(guides, appSource, pages = null) {
  const slugs = new Set(guides.map((g) => g.slug))
  const problems = []
  const add = (key, what, list) => list.length && problems.push({ key, text: `${what}: ${list.map((s) => `\`${s}\``).join(', ')}` })

  add('desc-long', 'meta description over 160 characters (Google cuts it); shorten to 120-160, problem first', guides.filter((g) => (g.meta.description ?? '').length > 160).map((g) => g.slug))
  add('desc-short', 'meta description under 70 characters; expand to 120-160, problem first', guides.filter((g) => (g.meta.description ?? '').length < 70).map((g) => g.slug))

  const broken = []
  for (const g of guides) for (const m of g.src.matchAll(/\]\(\.\.\/([a-z0-9-]+)\/\)/g)) if (m[1] !== 'guides' && !slugs.has(m[1])) broken.push(`${g.slug} -> ${m[1]}`)
  add('broken-links', 'links to guides that do not exist; point them to an existing guide or remove them', broken)

  // Inbound links between guide pages. With built pages (slug -> HTML) the "Related guides" blocks count too;
  // the guides index and the landing page are left out because they link to (almost) everything.
  const inbound = new Map([...slugs].map((s) => [s, 0]))
  const linkRe = pages ? /href="\.\.\/([a-z0-9-]+)\/"/g : /\]\(\.\.\/([a-z0-9-]+)\/\)/g
  for (const g of guides) for (const m of (pages?.[g.slug] ?? g.src).matchAll(linkRe)) if (m[1] !== g.slug && inbound.has(m[1])) inbound.set(m[1], inbound.get(m[1]) + 1)
  add('orphans', 'guides no other guide links to; add one natural link to each from the most related guide', [...inbound].filter(([, n]) => n === 0).map(([s]) => s))

  add('not-on-landing', "guides missing from GUIDES in src/App.tsx; add them at the end of the list with a short title", guides.filter((g) => !NOT_ON_LANDING.has(g.slug) && !appSource.includes(`'${g.slug}'`)).map((g) => g.slug))

  const byTitle = new Map()
  for (const g of guides) byTitle.set(g.meta.title, [...(byTitle.get(g.meta.title) ?? []), g.slug])
  add('dup-titles', 'guides with the same title; give each a distinct title', [...byTitle.values()].filter((l) => l.length > 1).flat())
  return problems
}

/** Inserts new problems at the top of the Backlog; returns how many were added. */
export function addToRoadmap(roadmap, problems) {
  const fresh = problems.filter((p) => !roadmap.includes(`- [ ] Fix (auto-check) [auto:${p.key}]`))
  if (!fresh.length) return { roadmap, added: 0 }
  const lines = fresh.map((p) => `- [ ] Fix (auto-check) [auto:${p.key}] ${p.text}.`).join('\n')
  return { roadmap: roadmap.replace('## Backlog\n', `## Backlog\n${lines}\n`), added: fresh.length }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const guides = loadGuides()
  if (process.argv.includes('--missing-og')) {
    for (const g of guides) if (!existsSync(join(root, 'public', 'og', `${g.slug}.jpg`))) console.log(g.slug)
  } else {
    const built = (slug) => join(root, 'dist', slug, 'index.html')
    const pages = guides.every((g) => existsSync(built(g.slug))) ? Object.fromEntries(guides.map((g) => [g.slug, readFileSync(built(g.slug), 'utf8')])) : null
    const problems = findProblems(guides, readFileSync(join(root, 'src', 'App.tsx'), 'utf8'), pages)
    for (const p of problems) console.log(`- [${p.key}] ${p.text}`)
    if (!problems.length) console.log('No SEO problems found.')
    if (process.argv.includes('--roadmap')) {
      const file = join(root, 'docs', 'ROADMAP.md')
      const { roadmap, added } = addToRoadmap(readFileSync(file, 'utf8'), problems)
      if (added) writeFileSync(file, roadmap)
      console.log(`Added ${added} roadmap item(s).`)
    }
  }
}
