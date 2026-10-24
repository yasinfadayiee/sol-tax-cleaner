import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS script without types
import { addToRoadmap, findProblems } from '../scripts/seo-check.mjs'

const guide = (slug: string, description: string, body = '') => ({
  slug,
  meta: { title: `Title ${slug}`, description, category: 'tools' },
  src: `---\ntitle: x\n---\n# H\n${body}`,
})
const ok = 'x'.repeat(130)

describe('seo-check', () => {
  it('finds long descriptions, broken links, orphans and guides missing from the landing list', () => {
    const guides = [guide('a', 'x'.repeat(170), 'see [b](../b/) and [gone](../gone/)'), guide('b', ok, 'see [a](../a/)'), guide('c', ok)]
    const keys = Object.fromEntries(findProblems(guides, "'a' 'b'").map((p: { key: string; text: string }) => [p.key, p.text]))
    expect(keys['desc-long']).toContain('`a`')
    expect(keys['broken-links']).toContain('a -> gone')
    expect(keys.orphans).toContain('`c`')
    expect(keys['not-on-landing']).toContain('`c`')
    expect(keys['desc-short']).toBeUndefined()
  })

  it('counts links in built pages when given', () => {
    const guides = [guide('a', ok), guide('b', ok)]
    const pages = { a: '<a href="../b/">b</a>', b: '<a href="../a/">a</a>' }
    expect(findProblems(guides, "'a' 'b'", pages)).toEqual([])
  })

  it('adds each problem type to the roadmap once', () => {
    const roadmap = '# R\n\n## Backlog\n- [ ] Guide: x\n'
    const problems = [{ key: 'orphans', text: 'orphans: `c`' }]
    const first = addToRoadmap(roadmap, problems)
    expect(first.added).toBe(1)
    expect(first.roadmap).toContain('## Backlog\n- [ ] Fix (auto-check) [auto:orphans] orphans: `c`.\n- [ ] Guide: x')
    expect(addToRoadmap(first.roadmap, problems).added).toBe(0)
  })
})
