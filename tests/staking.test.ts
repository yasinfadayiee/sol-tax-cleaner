import { describe, expect, it } from 'vitest'
import { processHistory, STAKE_PROGRAM, withExtraRows } from '../src/engine'
import type { ParsedInstruction, RpcTransaction } from '../src/engine/types'
import { toKoinlyCsv } from '../src/export/koinly'
import { toCoinLedgerCsv, toCoinTrackerCsv } from '../src/export/formats'
import type { RpcClient } from '../src/rpc/client'
import { epochOfSlot, fetchStakingRewards } from '../src/rpc/staking'
import { tx, W } from './helpers'

const STAKE = 'StakeAcct1111111111111111111111111111111111'
const VOTE = 'Vote111111111111111111111111111111111111111'
const SOL1 = 1_000_000_000

function withIx(t: RpcTransaction, ixs: ParsedInstruction[]): RpcTransaction {
  return { ...t, transaction: { ...t.transaction, message: { ...t.transaction.message, instructions: ixs } } }
}

const stakeTx = withIx(
  tx({
    accounts: [
      { key: W, pre: 10 * SOL1, post: 5 * SOL1 - 5000 },
      { key: STAKE, pre: 0, post: 5 * SOL1 },
      { key: VOTE, pre: 1, post: 1 },
    ],
  }),
  [
    { program: 'system', programId: '11111111111111111111111111111111', parsed: { type: 'createAccount', info: { source: W, newAccount: STAKE, lamports: 5 * SOL1, owner: STAKE_PROGRAM } } },
    { program: 'stake', programId: STAKE_PROGRAM, parsed: { type: 'initialize', info: { stakeAccount: STAKE, authorized: { staker: W, withdrawer: W } } } },
    { program: 'stake', programId: STAKE_PROGRAM, parsed: { type: 'delegate', info: { stakeAccount: STAKE, voteAccount: VOTE, stakeAuthority: W } } },
  ],
)

const withdrawTx = withIx(
  tx({
    accounts: [
      { key: W, pre: 5 * SOL1 - 5000, post: 10.2 * SOL1 - 10_000 },
      { key: STAKE, pre: 5.2 * SOL1, post: 0 },
    ],
  }),
  [{ program: 'stake', programId: STAKE_PROGRAM, parsed: { type: 'withdraw', info: { stakeAccount: STAKE, destination: W, withdrawAuthority: W, lamports: 5.2 * SOL1 } } }],
)

describe('native staking', () => {
  it('staking and withdrawing are moves inside the estate: fee-only rows', () => {
    const { rows, estate } = processHistory([stakeTx, withdrawTx], [W])
    expect([...estate.stakeAccounts]).toEqual([STAKE])
    expect(rows.map((r) => r.kind)).toEqual(['fee', 'fee'])
  })

  it('ignores stake accounts the user does not control', () => {
    const other = withIx(tx({ accounts: [{ key: W, pre: SOL1, post: SOL1 - 5000 }, { key: STAKE, pre: SOL1, post: SOL1 }] }), [
      { program: 'stake', programId: STAKE_PROGRAM, parsed: { type: 'deactivate', info: { stakeAccount: STAKE, stakeAuthority: 'Someone' } } },
    ])
    expect(processHistory([other], [W]).estate.stakeAccounts.size).toBe(0)
  })

  it('maps slots to epochs', () => {
    const mainnet = { slotsPerEpoch: 432_000, firstNormalEpoch: 0, firstNormalSlot: 0 }
    expect(epochOfSlot(0, mainnet)).toBe(0)
    expect(epochOfSlot(431_999, mainnet)).toBe(0)
    expect(epochOfSlot(300_000_000, mainnet)).toBe(694)
  })

  it('reads rewards per epoch and exports them as staking income', async () => {
    const result = processHistory([stakeTx, withdrawTx], [W])
    const calls: string[] = []
    const rpc = {
      call: async (method: string, params: unknown[]) => {
        calls.push(method)
        if (method === 'getEpochSchedule') return { slotsPerEpoch: 432_000, firstNormalEpoch: 0, firstNormalSlot: 0 }
        if (method === 'getEpochInfo') return { epoch: Math.floor(stakeTx.slot / 432_000) + 3 }
        if (method === 'getInflationReward') {
          const epoch = (params[1] as { epoch: number }).epoch
          return [{ epoch, effectiveSlot: (epoch + 1) * 432_000, amount: 100_000_000, postBalance: 0 }]
        }
        if (method === 'getBlockTime') return 1_760_000_000 + (params[0] as number)
        throw new Error(method)
      },
    } as unknown as RpcClient
    const rewards = await fetchStakingRewards(rpc, [stakeTx, withdrawTx], result.estate)
    expect(rewards).toHaveLength(3)
    expect(rewards[0]).toMatchObject({ kind: 'deposit', tag: 'staking', received: { mint: 'SOL', amount: 100_000_000n } })

    const all = withExtraRows(result, rewards)
    expect(all.stats.rows).toBe(5)
    expect(all.stats.byKind.deposit).toBe(3)
    const tokens = new Map([['SOL', { symbol: 'SOL', decimals: 9, source: 'builtin' as const }]])
    expect(toKoinlyCsv(all.rows, tokens)).toContain(',0.1,SOL,,,reward,')
    expect(toCoinTrackerCsv(all.rows, tokens)).toContain(',0.1,SOL,,,,,staking')
    expect(toCoinLedgerCsv(all.rows, tokens)).toContain(',SOL,0.1,,,Staking,')
  })

  it('makes no calls when there are no stake accounts', async () => {
    const rpc = { call: async () => { throw new Error('should not call') } } as unknown as RpcClient
    expect(await fetchStakingRewards(rpc, [], processHistory([], [W]).estate)).toEqual([])
  })
})
