import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS script without types
import { MERCHANT, USDC_MINT, fmt, saleFromTx, summarize } from '../scripts/monitor.mjs'

const payer = 'Payer11111111111111111111111111111111111111'

function tx(opts: { sol?: number; usdc?: number; err?: unknown }) {
  const sol = BigInt(opts.sol ?? 0)
  const usdc = BigInt(opts.usdc ?? 0)
  const tb = (owner: string, amount: bigint) => ({ mint: USDC_MINT, owner, uiTokenAmount: { amount: amount.toString() } })
  return {
    transaction: { message: { accountKeys: [{ pubkey: payer }, { pubkey: MERCHANT }] } },
    meta: {
      err: opts.err ?? null,
      preBalances: [1_000_000_000, 5_000_000],
      postBalances: [Number(1_000_000_000n - sol), Number(5_000_000n + sol)],
      preTokenBalances: [tb(payer, 100_000_000n), tb(MERCHANT, 0n)],
      postTokenBalances: [tb(payer, 100_000_000n - usdc), tb(MERCHANT, usdc)],
    },
  }
}

describe('monitor', () => {
  it('counts SOL and USDC payments at or above the price', () => {
    expect(saleFromTx(tx({ sol: 250_000_000 }))).toEqual({ sol: 250_000_000n, usdc: 0n })
    expect(saleFromTx(tx({ usdc: 29_000_000 }))).toEqual({ sol: 0n, usdc: 29_000_000n })
  })

  it('ignores small or failed transfers', () => {
    expect(saleFromTx(tx({ sol: 1_000_000 }))).toBeNull()
    expect(saleFromTx(tx({ usdc: 1_000_000 }))).toBeNull()
    expect(saleFromTx(tx({ sol: 250_000_000, err: { InstructionError: [0, 'x'] } }))).toBeNull()
  })

  it('formats and sums sales', () => {
    expect(fmt(250_000_000n, 9)).toBe('0.25')
    expect(fmt(29_000_000n, 6)).toBe('29')
    const sales = [
      { time: 100, sol: 250_000_000n, usdc: 0n },
      { time: 200, sol: 0n, usdc: 29_000_000n },
    ]
    expect(summarize(sales)).toEqual({ count: 2, sol: '0.25', usdc: '29' })
    expect(summarize(sales, 150)).toEqual({ count: 1, sol: '0', usdc: '29' })
  })
})
