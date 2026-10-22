import { describe, expect, it } from 'vitest'
import { findPayment, isQualifyingPayment, paymentUrl, solToLamports, type PaymentTerms } from '../src/license/license'
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
