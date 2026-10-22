import { SOL, type Row } from '../engine/types'
import type { TokenInfo } from '../rpc/tokens'

/** Koinly "Universal" template — header names must match exactly. */
export const KOINLY_COLUMNS = [
  'Date',
  'Sent Amount',
  'Sent Currency',
  'Received Amount',
  'Received Currency',
  'Fee Amount',
  'Fee Currency',
  'Tag',
  'Description',
  'TxHash',
] as const

/** Base units → plain decimal string (no exponent, no trailing zeros). */
export function formatAmount(amount: bigint, decimals: number): string {
  const negative = amount < 0n
  const abs = negative ? -amount : amount
  const s = abs.toString().padStart(decimals + 1, '0')
  const int = decimals ? s.slice(0, -decimals) : s
  const frac = decimals ? s.slice(-decimals).replace(/0+$/, '') : ''
  return `${negative ? '-' : ''}${int}${frac ? `.${frac}` : ''}`
}

/** Koinly date format, UTC: YYYY-MM-DD HH:mm:ss */
export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

export function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export type TokenTable = Map<string, TokenInfo>

function symbolOf(tokens: TokenTable, mint: string): string {
  return tokens.get(mint)?.symbol ?? (mint === SOL ? 'SOL' : `UNKNOWN-${mint.slice(0, 4)}`)
}

function decimalsOf(tokens: TokenTable, mint: string): number {
  return tokens.get(mint)?.decimals ?? (mint === SOL ? 9 : 0)
}

function describe(row: Row, tokens: TokenTable): string {
  const parts: string[] = []
  if (row.note) parts.push(row.note)
  for (const leg of [row.sent, row.received]) {
    if (!leg || leg.mint === SOL) continue
    const src = tokens.get(leg.mint)?.source
    if (src !== 'builtin') parts.push(`${symbolOf(tokens, leg.mint)} mint ${leg.mint}`)
  }
  return parts.join(' | ')
}

export function toKoinlyCsv(rows: Row[], tokens: TokenTable): string {
  const lines = [KOINLY_COLUMNS.join(',')]
  for (const r of rows) {
    const cells = [
      formatDate(r.blockTime),
      r.sent ? formatAmount(r.sent.amount, decimalsOf(tokens, r.sent.mint)) : '',
      r.sent ? symbolOf(tokens, r.sent.mint) : '',
      r.received ? formatAmount(r.received.amount, decimalsOf(tokens, r.received.mint)) : '',
      r.received ? symbolOf(tokens, r.received.mint) : '',
      r.fee ? formatAmount(r.fee, 9) : '',
      r.fee ? 'SOL' : '',
      r.tag,
      describe(r, tokens),
      r.signature,
    ]
    lines.push(cells.map(csvCell).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
