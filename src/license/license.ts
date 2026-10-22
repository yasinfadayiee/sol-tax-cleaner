import { accountKeys } from '../engine/deltas'
import type { RpcTransaction } from '../engine/types'
import { getSignaturesForAddress, getTransaction, type RpcClient } from '../rpc/client'

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export type PayCurrency = 'SOL' | 'USDC'

export interface PaymentTerms {
  merchant: string
  priceSol: string
  /** Price in USDC; when set, paying in USDC is accepted too. */
  priceUsdc?: string
  memoPrefix: string
  label: string
  validDays: number
}

function toRaw(value: string, decimals: number): bigint {
  const m = new RegExp(`^(\\d+)(?:\\.(\\d{0,${decimals}}))?$`).exec(value.trim())
  if (!m) throw new Error(`Bad amount: ${value}`)
  return BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt((m[2] ?? '').padEnd(decimals, '0'))
}

/** "0.2" → 200000000n lamports. */
export function solToLamports(sol: string): bigint {
  return toRaw(sol, 9)
}

/** "39" → 39000000n (USDC has 6 decimals). */
export function usdcToRaw(usdc: string): bigint {
  return toRaw(usdc, 6)
}

export function memoFor(terms: PaymentTerms, now = new Date()): string {
  return `${terms.memoPrefix}-${now.getUTCFullYear()}`
}

/** Solana Pay transfer request (https://docs.solanapay.com/spec), in SOL or USDC. */
export function paymentUrl(terms: PaymentTerms, now = new Date(), currency: PayCurrency = 'SOL'): string {
  const usdc = currency === 'USDC' && terms.priceUsdc
  const q = new URLSearchParams({ amount: usdc ? terms.priceUsdc! : terms.priceSol })
  if (usdc) q.set('spl-token', USDC_MINT)
  q.set('label', terms.label)
  q.set('memo', memoFor(terms, now))
  return `solana:${terms.merchant}?${q.toString()}`
}

/**
 * True when `tx` moved at least the price, in SOL or (if priced) USDC, from one of `wallets` to the merchant.
 * Uses balance changes so it works however the wallet app built the transfer.
 */
export function isQualifyingPayment(tx: RpcTransaction, wallets: Set<string>, terms: PaymentTerms): boolean {
  const meta = tx.meta
  if (!meta || meta.err != null) return false
  const keys = accountKeys(tx)
  const price = solToLamports(terms.priceSol)
  const delta = (i: number) => BigInt(meta.postBalances[i] ?? 0) - BigInt(meta.preBalances[i] ?? 0)
  const m = keys.indexOf(terms.merchant)
  if (m >= 0 && delta(m) >= price && keys.some((k, i) => wallets.has(k) && -delta(i) >= price)) return true
  if (!terms.priceUsdc) return false

  // USDC: net change per owner across their USDC token accounts.
  const usdcPrice = usdcToRaw(terms.priceUsdc)
  const byOwner = new Map<string, bigint>()
  const addUsdc = (list: typeof meta.preTokenBalances, sign: bigint) => {
    for (const tb of list ?? []) {
      if (tb.mint !== USDC_MINT || !tb.owner) continue
      byOwner.set(tb.owner, (byOwner.get(tb.owner) ?? 0n) + sign * BigInt(tb.uiTokenAmount.amount))
    }
  }
  addUsdc(meta.postTokenBalances, 1n)
  addUsdc(meta.preTokenBalances, -1n)
  if ((byOwner.get(terms.merchant) ?? 0n) < usdcPrice) return false
  return [...byOwner].some(([owner, d]) => wallets.has(owner) && -d >= usdcPrice)
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
