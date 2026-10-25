// Writes one compact briefing for a Daily improvement run (path in argv[2], default /tmp/stc-context.md):
// the roadmap rules, the item to do, every guide's slug/title/description and the product facts from the README.
// Also the agent playbook (docs/AGENT.md) and, when a workflow collected them, the latest results
// (/tmp/stc-results.md: sales so far, last weekly report).
// Claude reads this single file instead of exploring the repo, which saves turns and Claude plan usage.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadGuides } from './seo-check.mjs'

const root = new URL('..', import.meta.url).pathname
const roadmap = readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8')
const rules = /## Rules for every run\n([\s\S]*?)\n## /.exec(roadmap)?.[1].trim() ?? ''
const next = roadmap.split('\n').find((l) => l.startsWith('- [ ] ')) ?? '(no open item: add 5 new items to the Backlog, then do the first)'
const open = roadmap.split('\n').filter((l) => l.startsWith('- [ ] ')).length
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const facts = readme.slice(readme.indexOf('Crypto tax software'), readme.indexOf('## Popular guides')).trim()
const agent = readFileSync(join(root, 'docs', 'AGENT.md'), 'utf8').replace(/^# .*\n/, '').trim()
const resultsFile = '/tmp/stc-results.md'
const results = existsSync(resultsFile) ? readFileSync(resultsFile, 'utf8').trim() : ''
const guides = loadGuides()
  .map((g) => `- \`${g.slug}\` [${g.meta.category}] ${g.meta.title} — ${g.meta.description}`)
  .join('\n')

const out = process.argv[2] ?? '/tmp/stc-context.md'
writeFileSync(
  out,
  `# Briefing for this run

## The item to do now
${next}

(${open} open items in docs/ROADMAP.md; when fewer than 5, add new ones at the end of its Backlog first.)

## Rules
${rules}

## Agent playbook (docs/AGENT.md)
${agent.replace(/^## /gm, '### ')}
${results ? `\n## Latest results\n${results}\n` : ''}
## Product facts (README; only claim what is here or in src/ and docs/SPEC.md)
${facts}

## Existing guides (content/<slug>.md) — don't duplicate a topic
${guides}
`,
)
console.log(`Wrote ${out}`)
