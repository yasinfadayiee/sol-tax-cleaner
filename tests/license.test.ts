import { describe, expect, it } from 'vitest'
import { findPayment, isQualifyingPayment, paymentUrl, solToLamports, usdcToRaw, type PaymentTerms } from '../src/license/license'
import { RpcClient } from '../src/rpc/client'
import type { RpcTransaction } from '../src/engine/types'
import { tx, W, W2 } from './helpers'

const M = 'Merchant11111111111111111111111111111111111'
const terms: PaymentTerms = { merchant: M, priceSol: '0.2', memoPrefix: 'STC', label: 'SolTax Cleaner', validDays: 365 }
const NOW = 1_800_000_000

function payment(from: string, lamports: number, sig: string, blockTime = NOW - 100): RpcTransaction {
  return tx({
    sig,
    blockTime,
    accounts: [
      { key: from, pre: 5e9, post: 5e9 - lamports - 5000 },
      { key: M, pre: 1e9, post: 1e9 + lamports },
    ],
  })
}

describe('payment helpers', () => {
  it('converts SOL to lamports exactly', () => {
    expect(solToLamports('0.2')).toBe(200_000_000n)
    expect(solToLamports('1')).toBe(1_000_000_000n)
    expect(solToLamports('0.000000001')).toBe(1n)
    expect(() => solToLamports('1e3')).toThrow()
  })

  it('builds a Solana Pay URL with amount, label and memo', () => {
    const url = paymentUrl(terms, new Date('2026-10-22T00:00:00Z'))
    expect(url).toBe(`solana:${M}?amount=0.2&label=SolTax+Cleaner&memo=STC-2026`)
  })

  it('accepts only payments of the full price from an analysed wallet', () => {
    const wallets = new Set([W])
    expect(isQualifyingPayment(payment(W, 200_000_000, 'ok'), wallets, terms)).toBe(true)
    expect(isQualifyingPayment(payment(W, 100_000_000, 'small'), wallets, terms)).toBe(false)
    expect(isQualifyingPayment(payment(W2, 200_000_000, 'other'), wallets, terms)).toBe(false)
  })
})

describe('findPayment', () => {
  function node(sigs: Array<{ signature: string; memo: string | null; blockTime: number; err?: unknown }>, txs: RpcTransaction[]) {
    return new RpcClient({
      url: 'x',
      ratePerSec: 10_000,
      fetchImpl: async (_u, init) => {
        const { method, params } = JSON.parse(String(init?.body))
        const result =
          method === 'getSignaturesForAddress'
            ? sigs.map((s) => ({ slot: 1, err: null, ...s }))
            : (txs.find((t) => t.transaction.signatures[0] === params[0]) ?? null)
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }))
      },
    })
  }

  it('finds a valid recent payment with the memo', async () => {
    const rpc = node([{ signature: 'pay', memo: '[8] STC-2026', blockTime: NOW - 100 }], [payment(W, 200_000_000, 'pay')])
    await expect(findPayment(rpc, [W], terms, NOW * 1000)).resolves.toBe('pay')
  })

  it('ignores payments without the memo, too old, or failed', async () => {
    const rpc = node(
      [
        { signature: 'nomemo', memo: null, blockTime: NOW - 100 },
        { signature: 'failed', memo: '[8] STC-2026', blockTime: NOW - 200, err: { x: 1 } },
        { signature: 'old', memo: '[8] STC-2024', blockTime: NOW - 400 * 86_400 },
      ],
      [payment(W, 2e8, 'nomemo'), payment(W, 2e8, 'failed'), payment(W, 2e8, 'old', NOW - 400 * 86_400)],
    )
    await expect(findPayment(rpc, [W], terms, NOW * 1000)).resolves.toBeNull()
  })
})

describe('USDC payments', () => {
  const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  const withUsdc: PaymentTerms = { ...terms, priceUsdc: '39' }

  function usdcPayment(from: string, raw: number, merchantAtaExisted = true): RpcTransaction {
    return tx({
      accounts: [
        { key: from, pre: 5e9, post: 5e9 - 5000 },
        { key: 'FromAta', pre: 2_039_280, post: 2_039_280 },
        { key: 'MerchAta', pre: merchantAtaExisted ? 2_039_280 : 0, post: 2_039_280 },
      ],
      pre: [
        { account: 'FromAta', mint: USDC, owner: from, amount: '100000000' },
        ...(merchantAtaExisted ? [{ account: 'MerchAta', mint: USDC, owner: M, amount: '5000000' }] : []),
      ],
      post: [
        { account: 'FromAta', mint: USDC, owner: from, amount: String(100_000_000 - raw) },
        { account: 'MerchAta', mint: USDC, owner: M, amount: String((merchantAtaExisted ? 5_000_000 : 0) + raw) },
      ],
    })
  }

  it('builds a USDC Solana Pay URL', () => {
    const url = paymentUrl(withUsdc, new Date('2026-10-22T00:00:00Z'), 'USDC')
    expect(url).toBe(`solana:${M}?amount=39&spl-token=${USDC}&label=SolTax+Cleaner&memo=STC-2026`)
  })

  it('accepts the full USDC price from an analysed wallet, even into a new merchant account', () => {
    const wallets = new Set([W])
    expect(isQualifyingPayment(usdcPayment(W, 39_000_000), wallets, withUsdc)).toBe(true)
    expect(isQualifyingPayment(usdcPayment(W, 39_000_000, false), wallets, withUsdc)).toBe(true)
    expect(isQualifyingPayment(usdcPayment(W, 38_990_000), wallets, withUsdc)).toBe(false)
    expect(isQualifyingPayment(usdcPayment(W2, 39_000_000), wallets, withUsdc)).toBe(false)
    expect(isQualifyingPayment(usdcPayment(W, 39_000_000), wallets, terms)).toBe(false)
  })

  it('converts USDC amounts exactly', () => {
    expect(usdcToRaw('39')).toBe(39_000_000n)
    expect(usdcToRaw('0.5')).toBe(500_000n)
    expect(() => usdcToRaw('0.0000001')).toThrow()
  })
})
