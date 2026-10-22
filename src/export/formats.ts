// Export formats. Koinly's Universal CSV is the original; the others follow each tool's published import template.
import type { Row } from '../engine/types'
import { csvCell, decimalsOf, describe, formatAmount, symbolOf, toKoinlyCsv, type TokenTable } from './koinly'

export type FormatId = 'koinly' | 'cointracker' | 'coinledger'

export interface ExportFormat {
  id: FormatId
  name: string
  filename: string
  toCsv: (rows: Row[], tokens: TokenTable) => string
  /** Numbered import steps for the report. */
  importSteps: string[]
}

/** MM/DD/YYYY HH:MM:SS in UTC, as CoinTracker and CoinLedger expect. */
export function formatUsDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

function writeCsv(header: readonly string[], rows: string[][]): string {
  return [header.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n') + '\r\n'
}

const amount = (leg: Row['sent'], tokens: TokenTable) => (leg ? formatAmount(leg.amount, decimalsOf(tokens, leg.mint)) : '')
const currency = (leg: Row['sent'], tokens: TokenTable) => (leg ? symbolOf(tokens, leg.mint) : '')
const fee = (r: Row) => (r.fee ? formatAmount(r.fee, 9) : '')
const feeCurrency = (r: Row) => (r.fee ? 'SOL' : '')

/** CoinTracker CSV: headers must match exactly; blank Tag for trades and transfers. */
export const COINTRACKER_COLUMNS = [
  'Date',
  'Received Quantity',
  'Received Currency',
  'Sent Quantity',
  'Sent Currency',
  'Fee Amount',
  'Fee Currency',
  'Tag',
] as const

export function toCoinTrackerCsv(rows: Row[], tokens: TokenTable): string {
  return writeCsv(
    COINTRACKER_COLUMNS,
    rows.map((r) => [
      formatUsDate(r.blockTime),
      amount(r.received, tokens),
      currency(r.received, tokens),
      amount(r.sent, tokens),
      currency(r.sent, tokens),
      fee(r),
      feeCurrency(r),
      '',
    ]),
  )
}

/** CoinLedger universal manual import template. Type is required for one-sided rows and blank for trades. */
export const COINLEDGER_COLUMNS = [
  'Date (UTC)',
  'Platform (Optional)',
  'Asset Sent',
  'Amount Sent',
  'Asset Received',
  'Amount Received',
  'Fee Currency (Optional)',
  'Fee Amount (Optional)',
  'Type',
  'Description (Optional)',
  'TxHash (Optional)',
] as const

export function toCoinLedgerCsv(rows: Row[], tokens: TokenTable): string {
  return writeCsv(
    COINLEDGER_COLUMNS,
    rows.map((r) => [
      formatUsDate(r.blockTime),
      'Solana',
      currency(r.sent, tokens),
      amount(r.sent, tokens),
      currency(r.received, tokens),
      amount(r.received, tokens),
      feeCurrency(r),
      fee(r),
      r.sent && r.received ? '' : r.received ? 'Deposit' : 'Withdrawal',
      describe(r, tokens),
      r.signature,
    ]),
  )
}

export const FORMATS: Record<FormatId, ExportFormat> = {
  koinly: {
    id: 'koinly',
    name: 'Koinly',
    filename: 'koinly.csv',
    toCsv: toKoinlyCsv,
    importSteps: [
      'In Koinly, remove (or exclude) any Solana wallets Koinly synced automatically for these addresses, so nothing is counted twice.',
      'Add a new wallet in Koinly, choose the custom / "Other" wallet option and pick "Import from file".',
      'Upload `koinly.csv`. Import it as ONE wallet: transfers between your own addresses are already netted out.',
    ],
  },
  cointracker: {
    id: 'cointracker',
    name: 'CoinTracker',
    filename: 'cointracker.csv',
    toCsv: toCoinTrackerCsv,
    importSteps: [
      'In CoinTracker, remove any Solana wallets synced automatically for these addresses, so nothing is counted twice.',
      'Add a wallet, search for "CoinTracker CSV" (Add Wallet → CSV import) and give it a name such as "Solana (cleaned)".',
      'Upload `cointracker.csv` into that ONE wallet: transfers between your own addresses are already netted out.',
    ],
  },
  coinledger: {
    id: 'coinledger',
    name: 'CoinLedger',
    filename: 'coinledger.csv',
    toCsv: toCoinLedgerCsv,
    importSteps: [
      'In CoinLedger, remove any Solana wallets synced automatically for these addresses, so nothing is counted twice.',
      'Choose "Add Account", then the manual import / universal template option.',
      'Upload `coinledger.csv`. Transfers between your own addresses are already netted out.',
    ],
  },
}

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[]

