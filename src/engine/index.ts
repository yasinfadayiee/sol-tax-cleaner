import { classify } from './classify'
import { computeDeltas, discoverEscrowAccounts, discoverStakeAccounts, discoverTokenAccounts } from './deltas'
import { newEstate, type Estate, type Row, type RowKind, type RpcTransaction } from './types'

export * from './types'
export { classify } from './classify'
export {
  accountKeys,
  collectDecimals,
  computeDeltas,
  discoverEscrowAccounts,
  discoverStakeAccounts,
  discoverTokenAccounts,
  ESCROW_PROGRAMS,
  instructions,
  STAKE_PROGRAM,
} from './deltas'

export interface Stats {
  transactions: number
  rows: number
  byKind: Record<RowKind, number>
  /** Transactions with at least one row that needs a human look. */
  needsReview: number
  failed: number
  skippedNoMeta: number
}

export interface Result {
  rows: Row[]
  stats: Stats
  estate: Estate
}

export function processHistory(txs: RpcTransaction[], wallets: Iterable<string>, known?: Estate): Result {
  const estate = known ?? newEstate(wallets)
  for (const tx of txs) {
    discoverTokenAccounts(tx, estate)
    discoverStakeAccounts(tx, estate)
    discoverEscrowAccounts(tx, estate)
  }

  const sorted = [...txs].sort((a, b) => (a.blockTime ?? 0) - (b.blockTime ?? 0) || a.slot - b.slot)
  const stats: Stats = {
    transactions: 0,
    rows: 0,
    byKind: { swap: 0, deposit: 0, withdrawal: 0, fee: 0, complex: 0 },
    needsReview: 0,
    failed: 0,
    skippedNoMeta: 0,
  }
  const rows: Row[] = []
  const seen = new Set<string>()

  for (const tx of sorted) {
    const signature = tx.transaction.signatures[0]
    if (seen.has(signature)) continue
    seen.add(signature)
    if (!tx.meta) {
      stats.skippedNoMeta++
      continue
    }
    stats.transactions++
    const d = computeDeltas(tx, estate)
    if (d.failed) stats.failed++
    const out = classify({ signature, blockTime: tx.blockTime ?? 0 }, d)
    for (const r of out) stats.byKind[r.kind]++
    if (out.some((r) => r.needsReview)) stats.needsReview++
    rows.push(...out)
  }
  stats.rows = rows.length
  return { rows, stats, estate }
}

/** Adds rows made outside transactions (staking rewards) to a result, keeping rows in time order. */
export function withExtraRows(result: Result, extra: Row[]): Result {
  if (!extra.length) return result
  const rows = [...result.rows, ...extra].sort((a, b) => a.blockTime - b.blockTime)
  const byKind = { ...result.stats.byKind }
  for (const r of extra) byKind[r.kind]++
  return { ...result, rows, stats: { ...result.stats, rows: rows.length, byKind } }
}
