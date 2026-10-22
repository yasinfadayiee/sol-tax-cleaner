import type { Stats } from '../engine'
import type { Row } from '../engine/types'
import { formatDate, type TokenTable } from './koinly'

export interface ReportInput {
  wallets: string[]
  stats: Stats
  rows: Row[]
  tokens: TokenTable
  missing: string[]
  generatedAt: Date
}

/** Tickers Koinly may match to the wrong coin: unknown, or shared by several of the user's tokens. */
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
    `| Rows in koinly.csv | ${s.rows} |`,
    `| Swaps (one row each) | ${s.byKind.swap} |`,
    `| Deposits | ${s.byKind.deposit} |`,
    `| Withdrawals | ${s.byKind.withdrawal} |`,
    `| Fee-only rows (incl. ${s.failed} failed transactions) | ${s.byKind.fee} |`,
    `| Transactions to review | ${s.needsReview} |`,
    '',
    '## How to import into Koinly',
    '',
    '1. In Koinly, remove (or exclude) any Solana wallets Koinly synced automatically for these addresses, so nothing is counted twice.',
    '2. Add a new wallet in Koinly, choose the custom / "Other" wallet option and pick "Import from file".',
    '3. Upload `koinly.csv`. Import it as ONE wallet: transfers between your own addresses are already netted out.',
    '4. Check the transactions listed below.',
    '',
  ]

  if (reviewSigs.length) {
    lines.push('## Transactions to check', '', 'These move more than two assets at once (for example adding or removing liquidity). Each asset is a separate row with the same TxHash. In Koinly, group or tag them as you see fit.', '')
    for (const sig of reviewSigs) {
      const first = review.find((row) => row.signature === sig)!
      lines.push(`- ${formatDate(first.blockTime)} — https://solscan.io/tx/${sig}`)
    }
    lines.push('')
  }

  const ambiguous = ambiguousTokens(r.tokens)
  if (ambiguous.length) {
    lines.push(
      '## Tokens to double-check in Koinly',
      '',
      'Koinly matches tokens by ticker. For these, open the token in Koinly and use "Change currency" if it picked the wrong coin. The mint address is also in each row\'s Description.',
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
  lines.push('- Staking rewards paid automatically each epoch (no transaction) are not included. Koinly can add them from its own Solana staking sync.')
  lines.push('- Prices are not included; Koinly fills them in. Tokens without a market price may need a manual price in Koinly.')
  if (r.missing.length) lines.push(`- ${r.missing.length} transaction(s) could not be fetched from the RPC node and are missing. Try again with another RPC endpoint.`)
  if (s.skippedNoMeta) lines.push(`- ${s.skippedNoMeta} transaction(s) had no status data and were skipped.`)
  lines.push('')
  return lines.join('\n')
}
