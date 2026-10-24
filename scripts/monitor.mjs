// Daily autopilot check, run by .github/workflows/monitor.yml. Plain Node, no dependencies, no AI.
//  - Is the live site up, and does the site's RPC key still answer from the site's origin?
//  - Which payments reached the merchant wallet (sales)?
//  - Opens a GitHub issue for each new sale, keeps one "alert" issue open while something is broken,
//    and posts a weekly report issue on Mondays. Issues mention the owner, so GitHub emails them.
//  - Sends the same news, in Persian, to the owner's Telegram bot when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const SITE_URL = 'https://yasinfadayiee.github.io/sol-tax-cleaner/'
export const SITE_ORIGIN = 'https://yasinfadayiee.github.io'
export const MERCHANT = 'C6fwRzwGVLBhBnLmiWqKgR25qBz4U3ysNuEKse519G6V'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const MEMO_PREFIX = 'STC-'
// Lowest amounts that count as a sale (current prices 0.25 SOL / 29 USDC; older 39 USDC payments still count).
export const MIN_SOL_LAMPORTS = 200_000_000n
export const MIN_USDC_RAW = 20_000_000n
const OWNER = 'yasinfadayiee'
const PUBLIC_RPC = 'https://api.mainnet-beta.solana.com'

/** The merchant's gain from one transaction, if it is a sale: { sol, usdc } in raw units, or null. */
export function saleFromTx(tx, merchant = MERCHANT) {
  const meta = tx?.meta
  if (!meta || meta.err != null) return null
  const keys = [
    ...tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey)),
    ...(meta.loadedAddresses?.writable ?? []),
    ...(meta.loadedAddresses?.readonly ?? []),
  ]
  const m = keys.indexOf(merchant)
  const sol = m >= 0 ? BigInt(meta.postBalances[m] ?? 0) - BigInt(meta.preBalances[m] ?? 0) : 0n
  let usdc = 0n
  for (const [list, sign] of [[meta.postTokenBalances, 1n], [meta.preTokenBalances, -1n]]) {
    for (const tb of list ?? []) {
      if (tb.mint === USDC_MINT && tb.owner === merchant) usdc += sign * BigInt(tb.uiTokenAmount.amount)
    }
  }
  if (sol >= MIN_SOL_LAMPORTS || usdc >= MIN_USDC_RAW) return { sol: sol > 0n ? sol : 0n, usdc: usdc > 0n ? usdc : 0n }
  return null
}

export function fmt(raw, decimals) {
  const s = raw.toString().padStart(decimals + 1, '0')
  const frac = s.slice(-decimals).replace(/0+$/, '')
  return frac ? `${s.slice(0, -decimals)}.${frac}` : s.slice(0, -decimals)
}

/** Totals of the sales made at or after `since` (unix seconds). */
export function summarize(sales, since = 0) {
  const list = sales.filter((s) => s.time >= since)
  return {
    count: list.length,
    sol: fmt(list.reduce((a, s) => a + s.sol, 0n), 9),
    usdc: fmt(list.reduce((a, s) => a + s.usdc, 0n), 6),
  }
}

async function rpc(url, method, params, origin) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const body = res.ok ? await res.json().catch(() => null) : null
    if (body && !body.error) return body.result
    if (attempt >= 3) throw new Error(`${method}: ${body?.error?.message ?? `HTTP ${res.status}`}`)
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
}

async function checkSite() {
  const problems = []
  for (const path of ['', 'guides/', 'sitemap.xml']) {
    try {
      const res = await fetch(SITE_URL + path)
      const text = await res.text()
      if (!res.ok) problems.push(`${SITE_URL}${path} answered HTTP ${res.status}`)
      else if (path === '' && !text.includes('SolTax Cleaner')) problems.push('The home page no longer shows "SolTax Cleaner"')
    } catch (e) {
      problems.push(`${SITE_URL}${path} did not load: ${e.message}`)
    }
  }
  return problems
}

async function checkSiteRpc(url) {
  if (!url) return ['The RPC_URL repository variable is empty, so visitors without their own RPC cannot analyse']
  try {
    await rpc(url, 'getSlot', [], SITE_ORIGIN)
    await rpc(url, 'getSignaturesForAddress', [MERCHANT, { limit: 1 }], SITE_ORIGIN)
    return []
  } catch (e) {
    return [`The site's RPC key failed (${e.message}). Check the Helius dashboard: key, plan limits, allowed domain.`]
  }
}

async function fetchSales(url) {
  const accounts = [MERCHANT]
  const tokenAccounts = await rpc(url, 'getTokenAccountsByOwner', [MERCHANT, { mint: USDC_MINT }, { encoding: 'jsonParsed' }])
  accounts.push(...tokenAccounts.value.map((a) => a.pubkey))
  const seen = new Set()
  const sales = []
  for (const address of accounts) {
    let before
    for (;;) {
      const sigs = await rpc(url, 'getSignaturesForAddress', [address, { limit: 1000, ...(before ? { before } : {}) }])
      for (const s of sigs) {
        if (seen.has(s.signature) || s.err != null || !s.memo?.includes(MEMO_PREFIX)) continue
        seen.add(s.signature)
        const tx = await rpc(url, 'getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }])
        const sale = saleFromTx(tx)
        if (sale) sales.push({ signature: s.signature, time: s.blockTime ?? 0, ...sale })
      }
      if (sigs.length < 1000) break
      before = sigs.at(-1).signature
    }
  }
  return sales.sort((a, b) => b.time - a.time)
}

async function github(path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub ${path}: HTTP ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const openIssues = (label) => github(`/issues?state=open&labels=${label}&per_page=50`)
const createIssue = (title, body, label) => github('/issues', { method: 'POST', body: JSON.stringify({ title, body, labels: [label] }) })
const comment = (n, body) => github(`/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
const closeIssue = (n) => github(`/issues/${n}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) })

/** Sends a plain-text message to the owner's Telegram bot; does nothing until both secrets are set. */
export async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  })
  // A Telegram problem must not stop the GitHub issues, so it is only logged.
  if (!res.ok) console.error(`Telegram: HTTP ${res.status} ${await res.text()}`)
}

const ISSUES_URL = `https://github.com/${process.env.GITHUB_REPOSITORY ?? 'yasinfadayiee/sol-tax-cleaner'}/issues`

async function lastRun(workflow) {
  try {
    const { workflow_runs: runs } = await github(`/actions/workflows/${workflow}/runs?per_page=1&exclude_pull_requests=true`)
    const r = runs[0]
    return r ? `${r.conclusion ?? r.status} (${r.created_at.slice(0, 10)}, ${r.html_url})` : 'no runs yet'
  } catch {
    return 'unknown'
  }
}

async function main() {
  const now = Math.floor(Date.now() / 1000)
  const siteRpc = process.env.RPC_URL || ''
  const problems = [...(await checkSite()), ...(await checkSiteRpc(siteRpc))]
  if (process.env.GITHUB_ACTIONS) {
    const mainnet = await lastRun('mainnet.yml')
    if (mainnet.startsWith('failure')) problems.push(`The last Mainnet check failed: ${mainnet}`)
  }

  let sales = null
  try {
    // The site key works server-side too when the site's Origin is sent; the public RPC is the fallback.
    sales = await fetchSales(PUBLIC_RPC).catch(() => fetchSales(siteRpc))
  } catch (e) {
    problems.push(`Could not read payments to the merchant wallet: ${e.message}`)
  }

  const summary = [
    `Site: ${problems.length ? 'PROBLEM' : 'OK'}`,
    sales ? `Sales all time: ${summarize(sales).count}` : 'Sales: unknown',
  ].join(' | ')
  console.log(summary)
  for (const p of problems) console.log(`- ${p}`)

  if (!process.env.GITHUB_ACTIONS) return // local dry run

  if (process.env.TELEGRAM_TEST === '1') {
    await telegram(
      `✅ ربات گزارش SolTax Cleaner وصل شد.\n\nسایت: ${problems.length ? '❌ مشکل دارد' : 'سالم'}\nکل فروش تا امروز: ${sales ? summarize(sales).count : 'نامعلوم'}\n\nاز این به بعد فروش‌ها، هشدارها و گزارش هفتگی اینجا می‌آیند.`,
    )
  }

  // New sales since the last run (daily schedule; 26 h window so nothing slips between runs).
  if (sales) {
    for (const s of sales.filter((s) => s.time >= now - 26 * 3600).reverse()) {
      const amount = s.usdc > 0n ? `${fmt(s.usdc, 6)} USDC` : `${fmt(s.sol, 9)} SOL`
      const existing = await github(`/issues?state=all&labels=sale&per_page=100`)
      if (existing.some((i) => i.body?.includes(s.signature))) continue
      await createIssue(
        `New sale: ${amount}`,
        `@${OWNER} someone paid for SolTax Cleaner.\n\n- Amount: **${amount}**\n- Time: ${new Date(s.time * 1000).toISOString()}\n- Transaction: https://solscan.io/tx/${s.signature}\n\nAll-time sales: ${summarize(sales).count}`,
        'sale',
      )
      await telegram(
        `💰 فروش تازه!\n\nمبلغ: ${amount}\nزمان: ${new Date(s.time * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC\nتراکنش: https://solscan.io/tx/${s.signature}\n\nکل فروش تا امروز: ${summarize(sales).count}`,
      )
    }
  }

  // One open alert issue while anything is broken; closed automatically when all checks pass again.
  const [alert] = await openIssues('alert')
  if (problems.length) {
    const body = `@${OWNER} the daily check found a problem:\n\n${problems.map((p) => `- ${p}`).join('\n')}`
    if (alert) await comment(alert.number, body)
    else {
      const issue = await createIssue('Site check failed', body, 'alert')
      await telegram(`⚠️ چک روزانه مشکلی پیدا کرد:\n\n${problems.map((p) => `• ${p}`).join('\n')}\n\nجزئیات: ${issue.html_url}`)
      // Tells the workflow to call Claude once for this new alert (only if the owner set up a token).
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `new_alert=${issue.number}\n`)
    }
  } else if (alert) {
    await comment(alert.number, 'All checks pass again. Closing.')
    await closeIssue(alert.number)
    await telegram('✅ مشکل برطرف شد. همه‌ی چک‌ها دوباره سالم‌اند.')
  }

  // Weekly report on Mondays (UTC) or when run by hand with WEEKLY=1.
  if (new Date().getUTCDay() === 1 || process.env.WEEKLY === '1') {
    const week = sales && summarize(sales, now - 7 * 86400)
    const month = sales && summarize(sales, now - 30 * 86400)
    const all = sales && summarize(sales)
    const line = (s) => (s ? `${s.count} sales, ${s.sol} SOL + ${s.usdc} USDC` : 'unknown')
    const body = [
      `@${OWNER} weekly report for SolTax Cleaner.`,
      '',
      `- Last 7 days: ${line(week)}`,
      `- Last 30 days: ${line(month)}`,
      `- All time: ${line(all)}`,
      `- Site and RPC key: ${problems.length ? 'PROBLEM (see the alert issue)' : 'OK'}`,
      `- Last Mainnet check: ${await lastRun('mainnet.yml')}`,
      `- Last deploy: ${await lastRun('deploy.yml')}`,
    ].join('\n')
    for (const old of await openIssues('weekly-report')) await closeIssue(old.number)
    await createIssue(`Weekly report ${new Date().toISOString().slice(0, 10)}`, body, 'weekly-report')
    const fa = (s) => (s ? `${s.count} فروش (${s.sol} SOL + ${s.usdc} USDC)` : 'نامعلوم')
    await telegram(
      [
        '📊 گزارش هفتگی SolTax Cleaner',
        '',
        `۷ روز گذشته: ${fa(week)}`,
        `۳۰ روز گذشته: ${fa(month)}`,
        `کل: ${fa(all)}`,
        `سایت و کلید RPC: ${problems.length ? '❌ مشکل دارد' : '✅ سالم'}`,
        '',
        ISSUES_URL,
      ].join('\n'),
    )
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
