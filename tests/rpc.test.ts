import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { IdbCache, MemoryCache } from '../src/rpc/cache'
import { RpcClient, RpcError, TOKEN_PROGRAM } from '../src/rpc/client'
import { fetchHistory, isValidAddress } from '../src/rpc/history'
import type { RpcTransaction } from '../src/engine/types'
import { RENT, USDC, tx } from './helpers'

const noSleep = async () => {}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

describe('RpcClient', () => {
  it('retries on HTTP 429 and then succeeds', async () => {
    let calls = 0
    const waits: number[] = []
    const rpc = new RpcClient({
      url: 'x',
      ratePerSec: 1000,
      sleep: async (ms) => void waits.push(ms),
      fetchImpl: async () => {
        calls++
        return calls < 3
          ? jsonResponse({}, 429, { 'retry-after': '2' })
          : jsonResponse({ jsonrpc: '2.0', id: 1, result: 42 })
      },
    })
    await expect(rpc.call('getSlot', [])).resolves.toBe(42)
    expect(calls).toBe(3)
    expect(waits.filter((w) => w === 2000)).toHaveLength(2)
  })

  it('gives up after maxRetries', async () => {
    const rpc = new RpcClient({
      url: 'x',
      ratePerSec: 1000,
      maxRetries: 2,
      sleep: noSleep,
      fetchImpl: async () => jsonResponse({}, 503),
    })
    await expect(rpc.call('getSlot', [])).rejects.toThrow(/HTTP 503/)
  })

  it('does not retry invalid-params errors', async () => {
    let calls = 0
    const rpc = new RpcClient({
      url: 'x',
      ratePerSec: 1000,
      sleep: noSleep,
      fetchImpl: async () => {
        calls++
        return jsonResponse({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid param' } })
      },
    })
    await expect(rpc.call('getSlot', [])).rejects.toBeInstanceOf(RpcError)
    expect(calls).toBe(1)
  })

  it('never exceeds the concurrency limit', async () => {
    let active = 0
    let peak = 0
    const rpc = new RpcClient({
      url: 'x',
      maxConcurrent: 3,
      ratePerSec: 10_000,
      fetchImpl: async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return jsonResponse({ jsonrpc: '2.0', id: 1, result: 1 })
      },
    })
    await Promise.all(Array.from({ length: 20 }, () => rpc.call('getSlot', [])))
    expect(peak).toBe(3)
  })
})

describe('caches', () => {
  it('IndexedDB cache round-trips and misses cleanly', async () => {
    const c = new IdbCache()
    await c.put('s1', { a: 1 })
    expect(await c.get('s1')).toEqual({ a: 1 })
    expect(await c.get('nope')).toBeUndefined()
  })
})

const WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
const ATA = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
const CLOSED_ATA = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'

/** A fake RPC node serving a fixed set of transactions. */
function fakeNode(txs: RpcTransaction[], currentTokenAccounts: string[]) {
  const counts: Record<string, number> = {}
  const keysOf = (t: RpcTransaction) =>
    t.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey))
  const fetchImpl = async (_url: unknown, init?: RequestInit) => {
    const { method, params } = JSON.parse(String(init?.body)) as { method: string; params: unknown[] }
    counts[method] = (counts[method] ?? 0) + 1
    let result: unknown
    if (method === 'getTokenAccountsByOwner') {
      const program = (params[1] as { programId: string }).programId
      result = { value: program === TOKEN_PROGRAM ? currentTokenAccounts.map((pubkey) => ({ pubkey })) : [] }
    } else if (method === 'getSignaturesForAddress') {
      const address = params[0] as string
      result = txs
        .filter((t) => keysOf(t).includes(address))
        .map((t) => ({ signature: t.transaction.signatures[0], slot: t.slot, err: null, memo: null, blockTime: t.blockTime }))
    } else if (method === 'getTransaction') {
      result = txs.find((t) => t.transaction.signatures[0] === params[0]) ?? null
    }
    return jsonResponse({ jsonrpc: '2.0', id: 1, result })
  }
  return { rpc: new RpcClient({ url: 'x', ratePerSec: 10_000, fetchImpl }), counts }
}

describe('fetchHistory', () => {
  it('validates addresses', () => {
    expect(isValidAddress(WALLET)).toBe(true)
    expect(isValidAddress('not-an-address')).toBe(false)
  })

  it('finds transfers that touch only a token account, including accounts closed long ago', async () => {
    // 1) Old tx: wallet received tokens into CLOSED_ATA (wallet is a key here).
    const old = tx({
      sig: 'old',
      blockTime: 100,
      accounts: [
        { key: WALLET, pre: 1e9, post: 1e9 - RENT - 5000 },
        { key: CLOSED_ATA, pre: 0, post: RENT },
      ],
      post: [{ account: CLOSED_ATA, mint: USDC, owner: WALLET, amount: '10' }],
    })
    // 2) Later: someone sends more tokens to CLOSED_ATA; the wallet is NOT in this tx's keys.
    const silent = tx({
      sig: 'silent',
      blockTime: 200,
      accounts: [
        { key: 'Sender111111111111111111111111111111111111', pre: 1e9, post: 1e9 - 5000 },
        { key: CLOSED_ATA, pre: RENT, post: RENT },
      ],
      pre: [{ account: CLOSED_ATA, mint: USDC, owner: WALLET, amount: '10' }],
      post: [{ account: CLOSED_ATA, mint: USDC, owner: WALLET, amount: '25' }],
    })
    // 3) A current ATA that also receives a silent transfer.
    const current = tx({
      sig: 'current',
      blockTime: 300,
      accounts: [
        { key: 'Sender111111111111111111111111111111111111', pre: 1e9, post: 1e9 - 5000 },
        { key: ATA, pre: RENT, post: RENT },
      ],
      pre: [{ account: ATA, mint: USDC, owner: WALLET, amount: '0' }],
      post: [{ account: ATA, mint: USDC, owner: WALLET, amount: '7' }],
    })
    const { rpc } = fakeNode([old, silent, current], [ATA])
    const seen: string[] = []
    const h = await fetchHistory(rpc, [WALLET], { cache: new MemoryCache(), onProgress: (p) => seen.push(p.phase) })
    expect(h.txs.map((t) => t.transaction.signatures[0]).sort()).toEqual(['current', 'old', 'silent'])
    expect([...h.estate.tokenAccounts].sort()).toEqual([CLOSED_ATA, ATA].sort())
    expect(seen.at(-1)).toBe('done')
  })

  it('serves repeat runs from the cache', async () => {
    const t = tx({ sig: 'only', accounts: [{ key: WALLET, pre: 10, post: 5 }], fee: 5 })
    const { rpc, counts } = fakeNode([t], [])
    const cache = new MemoryCache()
    await fetchHistory(rpc, [WALLET], { cache })
    await fetchHistory(rpc, [WALLET], { cache })
    expect(counts.getTransaction).toBe(1)
  })

  it('respects the date window', async () => {
    const a = tx({ sig: 'a', blockTime: 100, accounts: [{ key: WALLET, pre: 10, post: 5 }], fee: 5 })
    const b = tx({ sig: 'b', blockTime: 500, accounts: [{ key: WALLET, pre: 10, post: 5 }], fee: 5 })
    const { rpc } = fakeNode([a, b], [])
    const h = await fetchHistory(rpc, [WALLET], { from: 200 })
    expect(h.txs.map((t) => t.transaction.signatures[0])).toEqual(['b'])
  })
})
