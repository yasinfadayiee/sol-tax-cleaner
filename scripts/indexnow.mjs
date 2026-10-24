// Tells Bing (and through IndexNow, Yandex, Seznam, Naver) which pages changed, right after a deploy.
// ChatGPT search draws on Bing's index, so fresh pages there show up in AI answers sooner.
// Reads the live sitemap; sends pages modified today (UTC), or every page with ALL=1. No dependencies.
const SITE_URL = (process.env.SITE_URL ?? 'https://yasinfadayiee.github.io/sol-tax-cleaner/').replace(/\/?$/, '/')
// Public by design: IndexNow proves site ownership by serving this key at keyLocation (public/<key>.txt).
const KEY = '52a3f4cdf5b63aacb02b00a49c4ab214'

const sitemap = await (await fetch(`${SITE_URL}sitemap.xml`)).text()
const today = new Date().toISOString().slice(0, 10)
const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ url: m[1], lastmod: m[2] }))
const urlList = entries.filter((e) => process.env.ALL === '1' || e.url === SITE_URL || e.lastmod === today).map((e) => e.url)

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE_URL).host, key: KEY, keyLocation: `${SITE_URL}${KEY}.txt`, urlList }),
})
console.log(`IndexNow: sent ${urlList.length} URLs, HTTP ${res.status} ${await res.text()}`)
// 200/202 accepted; anything else is logged but never fails the deploy.
