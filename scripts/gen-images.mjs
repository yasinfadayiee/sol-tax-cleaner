// Makes the pictures queued in docs/IMAGES.md with Gemini (no Claude usage). Run by the daily maintenance workflow
// when the GEMINI_API_KEY secret exists: up to 3 open queue lines per run, each saved as public/img/<name>.jpg
// (1200 px wide JPEG, via sharp) and ticked in the queue. A failed image stays open and is retried the next day.
// GEMINI_IMAGE_MODEL picks another image model.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const root = new URL('..', import.meta.url).pathname
const queueFile = join(root, 'docs', 'IMAGES.md')
const key = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
const LIMIT = 3

if (!key) {
  console.log('GEMINI_API_KEY is not set; skipping images.')
  process.exit(0)
}
const sharp = createRequire(import.meta.url)('sharp')

let queue = readFileSync(queueFile, 'utf8')
const open = [...queue.matchAll(/^- \[ \] ([a-z0-9-]+\.jpg) — (.+)$/gm)].slice(0, LIMIT)
let made = 0
for (const [line, name, prompt] of open) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const data = await res.json()
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
    if (!part) throw new Error(`no image in the answer: ${JSON.stringify(data).slice(0, 300)}`)
    await sharp(Buffer.from(part.inlineData.data, 'base64'))
      .resize({ width: 1200, height: 675, fit: 'cover' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(join(root, 'public', 'img', name))
    queue = queue.replace(line, line.replace('- [ ] ', `- [x] (${new Date().toISOString().slice(0, 10)}) `))
    made++
    console.log(`Made public/img/${name}`)
  } catch (e) {
    console.error(`${name}: ${e.message}`)
  }
}
writeFileSync(queueFile, queue)
console.log(`${made} image(s) made, ${open.length - made} failed.`)
// A failure fails this step so the owner hears about it; the workflow carries on with the rest of the upkeep.
if (made < open.length) process.exit(1)
