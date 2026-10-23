import { APP_NAME } from '../config'

/**
 * Turns the Markdown report into a standalone HTML page that opens in any browser and prints cleanly to PDF.
 * Handles only the Markdown the report writes: headings, paragraphs, lists, tables, `code` and bare links.
 */
export function reportToHtml(markdown: string): string {
  const out: string[] = []
  const lines = markdown.split('\n')
  let list: 'ul' | 'ol' | null = null
  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const heading = /^(#{1,3}) (.*)$/.exec(line)
    const bullet = /^- (.*)$/.exec(line)
    const numbered = /^\d+\. (.*)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      if (list !== kind) {
        closeList()
        out.push(`<${kind}>`)
        list = kind
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`)
    } else if (line.startsWith('|')) {
      closeList()
      const rows: string[][] = []
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(cells(lines[i]))
      i--
      const [head, , ...body] = rows
      out.push(
        '<table>',
        `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`,
        `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`,
        '</table>',
      )
    } else if (line.trim()) {
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    } else {
      closeList()
    }
  }
  closeList()

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${APP_NAME} report</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${out.join('\n')}
<footer>Made with ${APP_NAME}. Print this page or save it as PDF to keep it with your tax records.</footer>
</main>
</body>
</html>
`
}

function cells(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return `<code>${escape(part.slice(1, -1))}</code>`
      return escape(part).replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url.replace('https://', '')}</a>`)
    })
    .join('')
}

const STYLE = `
:root { color-scheme: light; }
body { margin: 0; background: #f6f6fb; color: #14141f; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 860px; margin: 32px auto; padding: 40px 48px; background: #fff; border: 1px solid #e3e3ee; border-radius: 16px; }
h1 { margin: 0 0 8px; font-size: 1.7rem; letter-spacing: -0.01em; }
h2 { margin: 32px 0 10px; padding-top: 18px; border-top: 1px solid #e3e3ee; font-size: 1.15rem; }
p, li { margin: 6px 0; }
ul, ol { padding-left: 22px; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e3e3ee; vertical-align: top; }
th { background: #f1f1f8; font-weight: 600; }
td:last-child { word-break: break-word; }
code { font: 0.85em ui-monospace, SFMono-Regular, Menlo, monospace; background: #f1f1f8; padding: 1px 5px; border-radius: 5px; word-break: break-all; }
a { color: #5b3ce0; word-break: break-all; }
footer { margin-top: 36px; color: #5b5b6e; font-size: 0.85rem; }
@media (max-width: 640px) { main { margin: 0; padding: 24px 18px; border: 0; border-radius: 0; } }
@media print { body { background: #fff; } main { margin: 0; padding: 0; border: 0; } a { color: inherit; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
`
