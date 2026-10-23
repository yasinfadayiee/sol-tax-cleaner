import { describe, expect, it } from 'vitest'
import { SOL } from '../src/engine/types'
import { SAMPLE_TOKENS, sampleResult } from '../src/demo/sample'

describe('sample wallet demo', () => {
  const { rows, stats } = sampleResult()

  it('turns the sample history into clean rows with nothing to review', () => {
    expect(stats.needsReview).toBe(0)
    expect(stats.byKind.complex).toBe(0)
    // One row per transaction, plus two staking rewards that have no transaction.
    expect(rows.length).toBe(stats.transactions + 2)
  })

  it('treats staking as the fee only and exports epoch rewards as staking income', () => {
    const rewards = rows.filter((r) => r.tag === 'staking')
    expect(rewards.length).toBe(2)
    expect(rewards.every((r) => r.kind === 'deposit' && r.received?.mint === SOL)).toBe(true)
    const stake = rows.find((r) => r.blockTime === Date.parse('2025-03-24T16:05:12Z') / 1000)
    expect(stake?.kind).toBe('fee')
  })

  it('shows swaps, DCA and limit fills, deposits and withdrawals', () => {
    expect(stats.byKind.swap).toBe(8)
    expect(stats.byKind.deposit).toBe(3)
    expect(stats.byKind.withdrawal).toBe(1)
    expect(stats.byKind.fee).toBe(4)
  })

  it('never counts rent as income or a cost', () => {
    const solMoves = rows.flatMap((r) => [r.sent, r.received]).filter((l) => l?.mint === SOL)
    expect(solMoves.some((l) => l!.amount === 2_039_280n)).toBe(false)
  })

  it('has a name for every asset it uses', () => {
    for (const r of rows) for (const l of [r.sent, r.received]) if (l) expect(SAMPLE_TOKENS.has(l.mint)).toBe(true)
  })
})
