import { describe, expect, it } from 'vitest'
import { reconcile, SOL, type Row } from '../src/engine'
import { buildReport } from '../src/export/report'
import { processHistory } from '../src/engine'
import { currentHoldings } from '../src/rpc/holdings'
import type { RpcClient } from '../src/rpc/client'
import { USDC } from './helpers'

const row = (r: Partial<Row>): Row => ({ signature: 's', blockTime: 1, kind: 'deposit', tag: '', needsReview: false, ...r })

describe('balance check', () => {
  const rows = [
    row({ received: { mint: SOL, amount: 5_000_000_000n } }),
    row({ kind: 'swap', sent: { mint: SOL, amount: 1_000_000_000n }, received: { mint: USDC, amount: 150_000_000n }, fee: 5000n }),
  ]

  it('passes when every asset adds up to what is held', () => {
    const held = new Map([
      [SOL, 3_999_995_000n],
      [USDC, 150_000_000n],
    ])
    expect(reconcile(rows, held)).toEqual({ matched: 2, mismatches: [] })
  })

  it('lists assets that differ, including ones only held on-chain', () => {
    const held = new Map([
      [SOL, 4_000_000_000n],
      [USDC, 150_000_000n],
      ['Other', 7n],
    ])
    const check = reconcile(rows, held)
    expect(check.matched).toBe(1)
    expect(check.mismatches).toEqual([
      { asset: SOL, rows: 3_999_995_000n, onChain: 4_000_000_000n },
      { asset: 'Other', rows: 0n, onChain: 7n },
    ])
    const { stats } = processHistory([], ['W'])
    const tokens = new Map([[SOL, { symbol: 'SOL', decimals: 9, source: 'builtin' as const }]])
    const md = buildReport({ wallets: ['W'], rows, stats, tokens, missing: [], generatedAt: new Date(0), balanceCheck: check })
    expect(md).toContain('| SOL | 3.999995 | 4 | 0.000005 |')
  })

  it('reads lamports of every account and token amounts, counting WSOL through lamports', async () => {
    const rpc = {
      call: async (method: string, params: unknown[]) => {
        expect(method).toBe('getMultipleAccounts')
        expect(params[0]).toEqual(['W', 'ATA', 'WSOL_ATA', 'STAKE'])
        return {
          value: [
            { lamports: 1_000, data: ['', 'base64'] },
            { lamports: 2_039_280, data: { parsed: { info: { mint: USDC, tokenAmount: { amount: '42' } } } } },
            { lamports: 2_039_280 + 500, data: { parsed: { info: { mint: 'So11111111111111111111111111111111111111112', tokenAmount: { amount: '500' } } } } },
            null,
          ],
        }
      },
    } as unknown as RpcClient
    const held = await currentHoldings(rpc, ['W'], ['ATA', 'WSOL_ATA', 'STAKE'])
    expect(held).toEqual(new Map([[SOL, 1_000n + 2_039_280n * 2n + 500n], [USDC, 42n]]))
  })
})
