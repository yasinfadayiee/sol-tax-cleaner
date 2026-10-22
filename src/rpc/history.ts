import { discoverTokenAccounts } from '../engine/deltas'
import { newEstate, type Estate, type RpcTransaction } from '../engine/types'
import type { TxCache } from './cache'
import {
  getSignaturesForAddress,
  getTokenAccountsByOwner,
  getTransaction,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  type RpcClient,
} from './client'

export interface Progress {
  phase: 'accounts' | 'signatures' | 'transactions' | 'staking' | 'done'
  addressesDone: number
  addressesTotal: number
  signatures: number
  txDone: number
  txTotal: number
}

export interface HistoryOptions {
  /** Ignore activity before this time (unix seconds). Full history is recommended for cost basis. */
  from?: number
  /** Ignore activity after this time (unix seconds). */
  to?: number
  cache?: TxCache
  onProgress?: (p: Progress) => void
  signal?: AbortSignal
}

export interface History {
  txs: RpcTransaction[]
  estate: Estate
  /** Signatures the RPC returned no transaction for. */
  missing: string[]
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidAddress(a: string): boolean {
  return BASE58.test(a)
}

/**
 * Collects every transaction that touched the user's wallets or any token account they own
 * (now or in the past). Wallet signatures alone miss transfers and DCA/limit-order fills
 * that touch only a token account, so token accounts are discovered and scanned too, until
 * no new ones turn up.
 */
export async function fetchHistory(rpc: RpcClient, wallets: string[], opts: HistoryOptions = {}): Promise<History> {
  for (const w of wallets) if (!isValidAddress(w)) throw new Error(`Not a valid Solana address: ${w}`)
  const estate = newEstate(wallets)
  const queue: string[] = [...wallets]
  const scanned = new Set<string>()
  const sigTimes = new Map<string, number | null>()
  const pending: string[] = []
  const txs = new Map<string, RpcTransaction>()
  const missing: string[] = []
  const p: Progress = { phase: 'accounts', addressesDone: 0, addressesTotal: 0, signatures: 0, txDone: 0, txTotal: 0 }
  const report = () => opts.onProgress?.({ ...p })
  const check = () => {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  }

  report()
  for (const w of wallets) {
    for (const program of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
      check()
      for (const acct of await getTokenAccountsByOwner(rpc, w, program)) {
        if (!estate.tokenAccounts.has(acct)) {
          estate.tokenAccounts.add(acct)
          queue.push(acct)
        }
      }
    }
  }

  const scanAddress = async (address: string) => {
    let before: string | undefined
    for (;;) {
      check()
      const page = await getSignaturesForAddress(rpc, address, { before })
      for (const s of page) {
        if (opts.to && s.blockTime && s.blockTime > opts.to) continue
        if (opts.from && s.blockTime && s.blockTime < opts.from) continue
        if (!sigTimes.has(s.signature)) {
          sigTimes.set(s.signature, s.blockTime)
          pending.push(s.signature)
        }
      }
      p.signatures = sigTimes.size
      p.txTotal = sigTimes.size
      report()
      const last = page[page.length - 1]
      if (page.length < 1000 || !last) break
      if (opts.from && last.blockTime && last.blockTime < opts.from) break
      before = last.signature
    }
  }

  const fetchTx = async (signature: string) => {
    check()
    let tx = (await opts.cache?.get(signature)) as RpcTransaction | undefined
    if (!tx) {
      const fetched = await getTransaction<RpcTransaction>(rpc, signature)
      if (!fetched) {
        missing.push(signature)
        return
      }
      tx = fetched
      await opts.cache?.put(signature, tx)
    }
    txs.set(signature, tx)
    for (const acct of discoverTokenAccounts(tx, estate)) queue.push(acct)
  }

  while (queue.length || pending.length) {
    p.phase = 'signatures'
    p.addressesTotal = scanned.size + queue.length
    while (queue.length) {
      const address = queue.shift()!
      if (scanned.has(address)) continue
      scanned.add(address)
      await scanAddress(address)
      p.addressesDone = scanned.size
      report()
    }
    p.phase = 'transactions'
    const batch = pending.splice(0)
    await Promise.all(
      batch.map((sig) =>
        fetchTx(sig).then(() => {
          p.txDone++
          report()
        }),
      ),
    )
  }

  p.phase = 'done'
  report()
  return { txs: [...txs.values()], estate, missing }
}
