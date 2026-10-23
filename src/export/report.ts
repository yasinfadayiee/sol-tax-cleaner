import type { BalanceCheck, Stats } from '../engine'
import type { Row } from '../engine/types'
import { FORMATS, type FormatId } from './formats'
import { decimalsOf, formatAmount, formatDate, symbolOf, type TokenTable } from './koinly'
import { SOL } from '../engine/types'

export interface ReportInput {
  wallets: string[]
  stats: Stats
  rows: Row[]
  tokens: TokenTable
  missing: string[]
  generatedAt: Date
  format?: FormatId
  stakingIncomplete?: boolean
  balanceCheck?: BalanceCheck
}

/** Tickers a tax tool may match to the wrong coin: unknown, or shared by several of the user's tokens. */
export function ambiguousTokens(tokens: TokenTable): Array<{ mint: string; symbol: string; why: string }> {
  const bySymbol = new Map<string, string[]>()
  for (const [mint, t] of tokens) bySymbol.set(t.symbol, [...(bySymbol.get(t.symbol) ?? []), mint])
  const out: Array<{ mint: string; symbol: string; why: string }> = []
  for (const [mint, t] of tokens) {
    if (t.source === 'builtin') continue
    if (t.source === 'fallback') out.push({ mint, symbol: t.symbol, why: 'no on-chain name found' })
    else if ((bySymbol.get(t.symbol)?.length ?? 0) > 1) out.push({ mint, symbol: t.symbol, why: 'ticker shared by several tokens' })
  }
  return out
}

/** Total received, sent and paid in fees per asset across the export, most active first. */
export function assetTotals(rows: Row[]): Array<{ mint: string; received: bigint; sent: bigint; fees: bigint; rows: number }> {
  const by = new Map<string, { mint: string; received: bigint; sent: bigint; fees: bigint; rows: number }>()
  const get = (mint: string) => by.get(mint) ?? by.set(mint, { mint, received: 0n, sent: 0n, fees: 0n, rows: 0 }).get(mint)!
  for (const row of rows) {
    if (row.received) {
      get(row.received.mint).received += row.received.amount
      get(row.received.mint).rows++
    }
    if (row.sent) {
      get(row.sent.mint).sent += row.sent.amount
      get(row.sent.mint).rows++
    }
    if (row.fee) get(SOL).fees += row.fee
  }
  return [...by.values()].sort((a, b) => b.rows - a.rows || a.mint.localeCompare(b.mint))
}

export function buildReport(r: ReportInput): string {
  const s = r.stats
  const format = FORMATS[r.format ?? 'koinly']
  const tool = format.name
  const review = r.rows.filter((row) => row.needsReview)
  const reviewSigs = [...new Set(review.map((row) => row.signature))]
  const rewards = r.rows.filter((row) => row.tag === 'staking').length
  const times = r.rows.map((row) => row.blockTime).filter((t) => t > 0)
  const period = times.length ? `${formatDate(Math.min(...times)).slice(0, 10)} to ${formatDate(Math.max(...times)).slice(0, 10)}` : 'no transactions'
  const lines: string[] = [
    '# Solana transaction clean-up report',
    '',
    `Generated ${formatDate(Math.floor(r.generatedAt.getTime() / 1000))} UTC for ${r.wallets.length} wallet(s):`,
    ...r.wallets.map((w) => `- \`${w}\``),
    '',
    `Period covered: ${period} (UTC), the wallets' full history.`,
    '',
    'This file reformats on-chain data for import. It is not tax advice and contains no tax calculations.',
    '',
    '## Summary',
    '',
    '| | Count |',
    '| --- | --- |',
    `| Transactions analysed | ${s.transactions} |`,
    `| Rows in ${format.filename} | ${s.rows} |`,
    `| Swaps (one row each) | ${s.byKind.swap} |`,
    `| Deposits | ${s.byKind.deposit - rewards} |`,
    ...(rewards ? [`| Staking rewards (income) | ${rewards} |`] : []),
    `| Withdrawals | ${s.byKind.withdrawal} |`,
    `| Fee-only rows (incl. ${s.failed} failed transactions) | ${s.byKind.fee} |`,
    `| Transactions to review | ${s.needsReview} |`,
    '',
    `## How to import into ${tool}`,
    '',
    ...format.importSteps.map((step, i) => `${i + 1}. ${step}`),
    ...(reviewSigs.length ? [`${format.importSteps.length + 1}. Check the transactions listed below.`] : []),
    '',
  ]

  if (reviewSigs.length) {
    lines.push('## Transactions to check', '', `These move more than two assets at once (for example adding or removing liquidity). Each asset is a separate row with the same TxHash. In ${tool}, group or tag them as you see fit.`, '')
    for (const sig of reviewSigs) {
      const first = review.find((row) => row.signature === sig)!
      lines.push(`- ${formatDate(first.blockTime)} — https://solscan.io/tx/${sig}`)
    }
    lines.push('')
  }

  const check = r.balanceCheck
  if (check) {
    lines.push('## Balance check', '')
    if (!check.mismatches.length) {
      lines.push(`For all ${check.matched} asset(s), the rows add up exactly to what the wallets and their accounts held when the report was made.`, '')
    } else {
      const amt = (mint: string, v: bigint) => {
        const t = r.tokens.get(mint)
        const s = formatAmount(v < 0n ? -v : v, t?.decimals ?? (mint === 'SOL' ? 9 : 0))
        return `${v < 0n ? '-' : ''}${s}`
      }
      lines.push(
        `${check.mismatches.length} asset(s) don't add up to what the accounts held when the report was made. A transaction during the analysis can cause this; running it again usually fixes it. Otherwise, add the difference by hand in ${tool}.`,
        '',
        '| Asset | Rows add up to | Held on-chain | Difference |',
        '| --- | --- | --- | --- |',
        ...check.mismatches.map((m) => `| ${r.tokens.get(m.asset)?.symbol ?? m.asset} | ${amt(m.asset, m.rows)} | ${amt(m.asset, m.onChain)} | ${amt(m.asset, m.onChain - m.rows)} |`),
        '',
      )
    }
  }

  const ambiguous = ambiguousTokens(r.tokens)
  if (ambiguous.length) {
    lines.push(
      `## Tokens to double-check in ${tool}`,
      '',
      `${tool} matches tokens by ticker. For these, check which coin ${tool} picked and change it if it is wrong. The mint address is listed here${format.id === 'cointracker' ? '' : " and in each row's Description"}.`,
      '',
      '| Ticker | Mint | Why |',
      '| --- | --- | --- |',
      ...ambiguous.map((a) => `| ${a.symbol} | \`${a.mint}\` | ${a.why} |`),
      '',
    )
  }

  const overrides = [...r.tokens.entries()].filter(([, t]) => t.source === 'user')
  if (overrides.length) {
    lines.push('## Tickers you changed', '', ...overrides.map(([mint, t]) => `- \`${mint}\` → ${t.symbol}`), '')
  }

  const assets = assetTotals(r.rows)
  if (assets.length) {
    const amt = (mint: string, v: bigint) => (v ? formatAmount(v, decimalsOf(r.tokens, mint)) : '')
    lines.push(
      '## Assets in this export',
      '',
      `Totals of every row in ${format.filename}, so you can check them against ${tool} after the import. Transfers between your own wallets are not counted; fee-only rows count as Sent.`,
      '',
      '| Asset | Received | Sent | Fees | Rows |',
      '| --- | --- | --- | --- | --- |',
      ...assets.map((a) => `| ${symbolOf(r.tokens, a.mint)} | ${amt(a.mint, a.received)} | ${amt(a.mint, a.sent)} | ${amt(a.mint, a.fees)} | ${a.rows} |`),
      '',
    )
  }

  lines.push('## Known limitations', '')
  lines.push(
    rewards
      ? `- Native staking rewards are included (${rewards} rows tagged as staking income, one per stake account per epoch). Rewards from liquid staking tokens (such as JitoSOL) are in the token's price, not paid out, so they have no rows.`
      : '- No native stake accounts were found. Rewards from liquid staking tokens (such as JitoSOL) are in the token\'s price, not paid out, so they have no rows.',
  )
  lines.push(`- Prices are not included; ${tool} fills them in. Tokens without a market price may need a manual price in ${tool}.`)
  if (r.stakingIncomplete) lines.push('- Some staking rewards could not be read from the RPC node and are missing. Run the analysis again with another RPC endpoint to include them.')
  if (r.missing.length) lines.push(`- ${r.missing.length} transaction(s) could not be fetched from the RPC node and are missing. Try again with another RPC endpoint.`)
  if (s.skippedNoMeta) lines.push(`- ${s.skippedNoMeta} transaction(s) had no status data and were skipped.`)
  lines.push('')
  return lines.join('\n')
}
