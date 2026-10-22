import { accountKeys } from '../engine/deltas'
import type { RpcTransaction } from '../engine/types'
import { getSignaturesForAddress, getTransaction, type RpcClient } from '../rpc/client'

export interface PaymentTerms {
  merchant: string
  priceSol: string
  memoPrefix: string
  label: string
  validDays: number
}

/** "0.2" → 200000000n lamports. */
export function solToLamports(sol: string): bigint {
  const m = /^(\d+)(?:\.(\d{0,9}))?$/.exec(sol.trim())
  if (!m) throw new Error(`Bad SOL amount: ${sol}`)
  return BigInt(m[1]) * 1_000_000_000n + BigInt((m[2] ?? '').padEnd(9, '0'))
}

export function memoFor(terms: PaymentTerms, now = new Date()): string {
  return `${terms.memoPrefix}-${now.getUTCFullYear()}`
}

/** Solana Pay transfer request (https://docs.solanapay.com/spec). */
export function paymentUrl(terms: PaymentTerms, now = new Date()): string {
  const q = new URLSearchParams({ amount: terms.priceSol, label: terms.label, memo: memoFor(terms, now) })
  return `solana:${terms.merchant}?${q.toString()}`
}

/**
 * True when `tx` moved at least the price from one of `wallets` to the merchant.
 * Uses balance changes so it works however the wallet app built the transfer.
 */
export function isQualifyingPayment(tx: RpcTransaction, wallets: Set<string>, terms: PaymentTerms): boolean {
  const meta = tx.meta
  if (!meta || meta.err != null) return false
  const keys = accountKeys(tx)
  const price = solToLamports(terms.priceSol)
  const delta = (i: number) => BigInt(meta.postBalances[i] ?? 0) - BigInt(meta.preBalances[i] ?? 0)
  const m = keys.indexOf(terms.merchant)
  if (m < 0 || delta(m) < price) return false
  return keys.some((k, i) => wallets.has(k) && -delta(i) >= price)
}

/** Payment-memo marker as returned by getSignaturesForAddress, e.g. "[8] STC-2026". */
function memoMatches(memo: string | null, prefix: string): boolean {
  return !!memo && memo.includes(`${prefix}-`)
}

/**
 * Looks for a recent qualifying payment from any of the wallets. No server and no keys:
 * the payment itself on-chain is the licence.
 */
export async function findPayment(
  rpc: RpcClient,
  wallets: string[],
  terms: PaymentTerms,
  now = Date.now(),
): Promise<string | null> {
  const set = new Set(wallets)
  const since = now / 1000 - terms.validDays * 86_400
  for (const w of wallets) {
    const sigs = await getSignaturesForAddress(rpc, w, { limit: 1000 })
    for (const s of sigs) {
      if (s.blockTime && s.blockTime < since) break
      if (s.err != null || !memoMatches(s.memo, terms.memoPrefix)) continue
      const tx = await getTransaction<RpcTransaction>(rpc, s.signature)
      if (tx && isQualifyingPayment(tx, set, terms)) return s.signature
    }
  }
  return null
}

const UNLOCK_KEY = 'stc.unlock.v1'

export function walletSetKey(wallets: string[]): string {
  return [...wallets].sort().join(',')
}

/** Remembers a found payment so the UI unlocks instantly next time (it is re-verified in the background). */
export function rememberUnlock(wallets: string[], signature: string) {
  try {
    const all = JSON.parse(localStorage.getItem(UNLOCK_KEY) ?? '{}') as Record<string, string>
    all[walletSetKey(wallets)] = signature
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked: the payment is simply looked up again.
  }
}

export function rememberedUnlock(wallets: string[]): string | null {
  try {
    const all = JSON.parse(localStorage.getItem(UNLOCK_KEY) ?? '{}') as Record<string, string>
    return all[walletSetKey(wallets)] ?? null
  } catch {
    return null
  }
}
