import type { Stats } from '../engine'
import type { Row } from '../engine/types'
import { FORMATS, type FormatId } from './formats'
import { formatDate, type TokenTable } from './koinly'

export interface ReportInput {
  wallets: string[]
  stats: Stats
  rows: Row[]
  tokens: TokenTable
  missing: string[]
  generatedAt: Date
  format?: FormatId
  stakingIncomplete?: boolean
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

export function buildReport(r: ReportInput): string {
  const s = r.stats
  const format = FORMATS[r.format ?? 'koinly']
  const tool = format.name
  const review = r.rows.filter((row) => row.needsReview)
  const reviewSigs = [...new Set(review.map((row) => row.signature))]
  const lines: string[] = [
    '# Solana transaction clean-up report',
    '',
    `Generated ${formatDate(Math.floor(r.generatedAt.getTime() / 1000))} UTC for ${r.wallets.length} wallet(s):`,
    ...r.wallets.map((w) => `- \`${w}\``),
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
    `| Deposits | ${s.byKind.deposit} |`,
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

  lines.push('## Known limitations', '')
  const rewards = r.rows.filter((row) => row.tag === 'staking').length
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
