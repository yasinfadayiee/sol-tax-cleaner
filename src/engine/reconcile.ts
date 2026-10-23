import { SOL, type Row } from './types'

export interface Mismatch {
  asset: string
  /** Net amount the exported rows add up to, in base units. */
  rows: bigint
  /** What the user's accounts hold now, in base units. */
  onChain: bigint
}

export interface BalanceCheck {
  /** Assets whose rows add up exactly to what is held now. */
  matched: number
  mismatches: Mismatch[]
}

/** Net change per asset across all rows: received minus sent minus fees. */
export function netFromRows(rows: Row[]): Map<string, bigint> {
  const net = new Map<string, bigint>()
  const add = (asset: string, v: bigint) => net.set(asset, (net.get(asset) ?? 0n) + v)
  for (const r of rows) {
    if (r.received) add(r.received.mint, r.received.amount)
    if (r.sent) add(r.sent.mint, -r.sent.amount)
    if (r.fee) add(SOL, -r.fee)
  }
  return net
}

/**
 * For a full history, the rows of every asset must add up to what the user holds today. Assets that are zero on
 * both sides are left out.
 */
export function reconcile(rows: Row[], held: Map<string, bigint>): BalanceCheck {
  const net = netFromRows(rows)
  let matched = 0
  const mismatches: Mismatch[] = []
  for (const asset of new Set([...net.keys(), ...held.keys()])) {
    const a = net.get(asset) ?? 0n
    const b = held.get(asset) ?? 0n
    if (a === b) {
      if (a !== 0n) matched++
    } else mismatches.push({ asset, rows: a, onChain: b })
  }
  return { matched, mismatches }
}
