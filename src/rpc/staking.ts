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

export interface StakingRewards {
  rows: Row[]
  /** Epochs the RPC could not answer for; their rewards are missing. */
  failedEpochs: number[]
}

export async function fetchStakingRewards(
  rpc: RpcClient,
  txs: RpcTransaction[],
  estate: Estate,
  opts: { signal?: AbortSignal; onProgress?: (p: StakingProgress) => void } = {},
): Promise<StakingRewards> {
  const none = { rows: [], failedEpochs: [] }
  const accounts = [...estate.stakeAccounts]
  if (!accounts.length) return none

  let firstSlot = Infinity
  for (const tx of txs) {
    if (tx.slot < firstSlot && accountKeys(tx).some((k) => estate.stakeAccounts.has(k))) firstSlot = tx.slot
  }
  if (!Number.isFinite(firstSlot)) return none

  const schedule = await rpc.call<EpochSchedule>('getEpochSchedule', [])
  const { epoch: current } = await rpc.call<{ epoch: number }>('getEpochInfo', [{ commitment: 'confirmed' }])
  const first = epochOfSlot(firstSlot, schedule)
  const epochs = Array.from({ length: Math.max(0, current - first) }, (_, i) => first + i)

  const found: Array<InflationReward & { account: string }> = []
  const failedEpochs: number[] = []
  let done = 0
  await Promise.all(
    epochs.map(async (epoch) => {
      if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        const rewards: Array<InflationReward & { account: string }> = []
        for (let i = 0; i < accounts.length; i += 100) {
          const batch = accounts.slice(i, i + 100)
          const res = await rpc.call<Array<InflationReward | null>>('getInflationReward', [batch, { epoch, commitment: 'confirmed' }])
          res.forEach((r, j) => {
            if (r && r.amount > 0) rewards.push({ ...r, account: batch[j] })
          })
        }
        found.push(...rewards)
      } catch (e) {
        if (opts.signal?.aborted) throw e
        failedEpochs.push(epoch)
      }
      opts.onProgress?.({ epochsDone: ++done, epochsTotal: epochs.length })
    }),
  )

  // Reward time = the block that paid it. If that lookup fails, fall back to an estimate from the epoch length.
  const times = new Map<number, number>()
  const slotNow = await rpc.call<number>('getSlot', [{ commitment: 'confirmed' }]).catch(() => 0)
  const now = slotNow ? await rpc.call<number | null>('getBlockTime', [slotNow]).catch(() => null) : null
  await Promise.all(
    [...new Set(found.map((r) => r.effectiveSlot))].map(async (slot) => {
      const t = await rpc.call<number | null>('getBlockTime', [slot]).catch(() => null)
      times.set(slot, t ?? (now && slotNow ? Math.round(now - (slotNow - slot) * 0.4) : 0))
    }),
  )

  const rows = found
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
  return { rows, failedEpochs: failedEpochs.sort((a, b) => a - b) }
}
