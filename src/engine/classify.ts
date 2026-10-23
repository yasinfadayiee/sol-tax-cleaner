import type { Deltas } from './deltas'
import { SOL, type Leg, type Row } from './types'

/** SOL flows up to this size next to a token-for-token swap: outflows are fees (platform fees, tips), inflows a separate deposit. */
export const SOL_FEE_FOLD_LAMPORTS = 10_000_000n // 0.01 SOL

export interface TxRef {
  signature: string
  blockTime: number
}

function legsOf(d: Deltas): { out: Leg[]; in: Leg[] } {
  const out: Leg[] = []
  const inn: Leg[] = []
  const push = (mint: string, v: bigint) => {
    if (v < 0n) out.push({ mint, amount: -v })
    else if (v > 0n) inn.push({ mint, amount: v })
  }
  push(SOL, d.solLamports)
  for (const mint of [...d.tokens.keys()].sort()) push(mint, d.tokens.get(mint)!)
  return { out, in: inn }
}

export function classify(ref: TxRef, d: Deltas): Row[] {
  const base = { signature: ref.signature, blockTime: ref.blockTime, tag: '' as const, needsReview: false }
  let { out, in: inn } = legsOf(d)
  let fee = d.fee
  const notes: string[] = []

  if (d.failed || (out.length === 0 && inn.length === 0)) {
    if (fee === 0n) return []
    return [
      {
        ...base,
        kind: 'fee',
        sent: { mint: SOL, amount: fee },
        tag: 'cost',
        note: d.failed ? 'Failed transaction (network fee only)' : 'Network fee only',
      },
    ]
  }

  // Token-for-token swap with a small extra SOL outflow (aggregator/platform fee, tip): fold it into the fee.
  if (out.length === 2 && inn.length === 1 && inn[0].mint !== SOL) {
    const solLeg = out.find((l) => l.mint === SOL)
    if (solLeg && solLeg.amount <= SOL_FEE_FOLD_LAMPORTS) {
      fee += solLeg.amount
      out = out.filter((l) => l !== solLeg)
      notes.push('Small SOL outflow added to fee')
    }
  }

  const feeField = fee > 0n ? { fee } : {}
  const note = notes.length ? notes.join('; ') : undefined

  // Token-for-token swap that also leaves a little SOL with the user (gasless/relayed swaps where someone else
  // pays rent or refunds SOL): one swap row plus a SOL deposit, so it doesn't need a manual look.
  if (out.length === 1 && inn.length === 2 && out[0].mint !== SOL) {
    const solLeg = inn.find((l) => l.mint === SOL)
    const tokenLeg = inn.find((l) => l.mint !== SOL)
    if (solLeg && tokenLeg && solLeg.amount <= SOL_FEE_FOLD_LAMPORTS) {
      return [
        { ...base, kind: 'swap', sent: out[0], received: tokenLeg, ...feeField, note },
        {
          ...base,
          kind: 'deposit',
          received: solLeg,
          note: 'Small SOL received alongside the swap (often rent or a refund paid by a gasless-swap relayer)',
        },
      ]
    }
  }

  if (out.length === 1 && inn.length === 1) {
    return [{ ...base, kind: 'swap', sent: out[0], received: inn[0], ...feeField, note }]
  }

  if (out.length === 0) {
    return inn.map((leg, i) => ({
      ...base,
      kind: 'deposit' as const,
      received: leg,
      ...(i === 0 ? feeField : {}),
      note: d.rentFromOthers ? 'Rent for a token account someone else opened for you (often a spam airdrop)' : note,
    }))
  }

  if (inn.length === 0) {
    return out.map((leg, i) => ({ ...base, kind: 'withdrawal' as const, sent: leg, ...(i === 0 ? feeField : {}), note }))
  }

  // More than one asset on a side: liquidity adds/removes, multi-asset claims, routing leftovers.
  const legs: Array<{ sent?: Leg; received?: Leg }> = [
    ...out.map((sent) => ({ sent })),
    ...inn.map((received) => ({ received })),
  ]
  return legs.map((leg, i) => ({
    ...base,
    kind: 'complex' as const,
    ...leg,
    ...(i === 0 ? feeField : {}),
    needsReview: true,
    note: `Multi-asset transaction (${out.length} out, ${inn.length} in) — check in Koinly`,
  }))
}
