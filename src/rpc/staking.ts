// Native staking rewards are credited to stake accounts at each epoch boundary without any transaction, so the
// history alone never shows them. They are read per epoch with getInflationReward and exported as deposits.
import { accountKeys, SOL, type Estate, type Row, type RpcTransaction } from '../engine'
import type { RpcClient } from './client'

interface EpochSchedule {
  slotsPerEpoch: number
  firstNormalEpoch: number
  firstNormalSlot: number
}

interface InflationReward {
  epoch: number
  effectiveSlot: number
  amount: number
  postBalance: number
}

export interface StakingProgress {
  epochsDone: number
  epochsTotal: number
}

export function epochOfSlot(slot: number, s: EpochSchedule): number {
  if (slot < s.firstNormalSlot) {
    // Warm-up epochs double in length from 32 slots; mainnet has none, test clusters may.
    let epoch = 0
    let len = 32
    let start = 0
    while (start + len <= slot) {
      start += len
      len *= 2
      epoch++
    }
    return epoch
  }
  return s.firstNormalEpoch + Math.floor((slot - s.firstNormalSlot) / s.slotsPerEpoch)
}

export async function fetchStakingRewards(
  rpc: RpcClient,
  txs: RpcTransaction[],
  estate: Estate,
  opts: { signal?: AbortSignal; onProgress?: (p: StakingProgress) => void } = {},
): Promise<Row[]> {
  const accounts = [...estate.stakeAccounts]
  if (!accounts.length) return []

  let firstSlot = Infinity
  for (const tx of txs) {
    if (tx.slot < firstSlot && accountKeys(tx).some((k) => estate.stakeAccounts.has(k))) firstSlot = tx.slot
  }
  if (!Number.isFinite(firstSlot)) return []

  const schedule = await rpc.call<EpochSchedule>('getEpochSchedule', [])
  const { epoch: current } = await rpc.call<{ epoch: number }>('getEpochInfo', [{ commitment: 'confirmed' }])
  const first = epochOfSlot(firstSlot, schedule)
  const epochs = Array.from({ length: Math.max(0, current - first) }, (_, i) => first + i)

  const found: Array<InflationReward & { account: string }> = []
  let done = 0
  await Promise.all(
    epochs.map(async (epoch) => {
      if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      for (let i = 0; i < accounts.length; i += 100) {
        const batch = accounts.slice(i, i + 100)
        const res = await rpc.call<Array<InflationReward | null>>('getInflationReward', [batch, { epoch, commitment: 'confirmed' }])
        res.forEach((r, j) => {
          if (r && r.amount > 0) found.push({ ...r, account: batch[j] })
        })
      }
      opts.onProgress?.({ epochsDone: ++done, epochsTotal: epochs.length })
    }),
  )

  const times = new Map<number, number>()
  await Promise.all(
    [...new Set(found.map((r) => r.effectiveSlot))].map(async (slot) => {
      times.set(slot, (await rpc.call<number | null>('getBlockTime', [slot])) ?? 0)
    }),
  )

  return found
    .map(
      (r): Row => ({
        signature: `staking-reward-${r.account}-epoch-${r.epoch}`,
        blockTime: times.get(r.effectiveSlot) ?? 0,
        kind: 'deposit',
        received: { mint: SOL, amount: BigInt(r.amount) },
        tag: 'staking',
        needsReview: false,
        note: `Staking reward, epoch ${r.epoch}, stake account ${r.account}`,
      }),
    )
    .sort((a, b) => a.blockTime - b.blockTime)
}
