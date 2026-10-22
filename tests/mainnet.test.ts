// Real-data check against Solana mainnet. Skipped unless MAINNET=1 (CI runs it on a schedule;
// the dev sandbox cannot reach Solana RPC). It picks a few real wallets with modest histories,
// rebuilds their full history and checks that the exported rows reconcile to today's balances:
// for every asset, received − sent − fees must equal what the wallet and its token accounts hold now.
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { collectDecimals, ownedAccounts, processHistory, SOL, withExtraRows, type Row, type RpcTransaction } from '../src/engine'
import { KOINLY_COLUMNS, toKoinlyCsv } from '../src/export/koinly'
import { DEFAULT_RPC, getSignaturesForAddress, getTransaction, RpcClient } from '../src/rpc/client'
import { fetchHistory } from '../src/rpc/history'
import { fetchStakingRewards } from '../src/rpc/staking'
import { resolveTokens } from '../src/rpc/tokens'

const RUN = process.env.MAINNET === '1'
const URL = process.env.RPC_URL || DEFAULT_RPC
const JUPITER = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
const MAX_SIGS = Number(process.env.MAX_SIGS ?? 250)
const PICK = Number(process.env.PICK ?? 3)

const txStore = new Map<string, unknown>()
const cache = {
  get: async (sig: string) => txStore.get(sig),
  put: async (sig: string, tx: unknown) => void txStore.set(sig, tx),
}

const rpc = new RpcClient({ url: URL, maxConcurrent: URL === DEFAULT_RPC ? 3 : 8, ratePerSec: URL === DEFAULT_RPC ? 3.5 : 20 })

/** Recent Jupiter users whose own address has a small enough history to fetch in full. */
async function pickWallets(): Promise<string[]> {
  const fromEnv = process.env.WALLETS?.split(',').map((w) => w.trim()).filter(Boolean)
  if (fromEnv?.length) return fromEnv
  const picked: string[] = []
  const seen = new Set<string>()
  let before: string | undefined
  for (let page = 0; page < 5 && picked.length < PICK; page++) {
    const sigs = await getSignaturesForAddress(rpc, JUPITER, { limit: 40, before })
    before = sigs.at(-1)?.signature
    for (const s of sigs) {
      if (picked.length >= PICK) break
      if (s.err) continue
      const tx = await getTransaction<RpcTransaction>(rpc, s.signature)
      const k = tx?.transaction.message.accountKeys[0]
      const payer = typeof k === 'string' ? k : k?.pubkey
      if (!payer || seen.has(payer)) continue
      seen.add(payer)
      const history = await getSignaturesForAddress(rpc, payer, { limit: MAX_SIGS + 1 })
      if (history.length >= 20 && history.length <= MAX_SIGS) picked.push(payer)
    }
  }
  return picked
}

interface ParsedTokenAccount {
  lamports: number
  data: { parsed?: { info?: { mint?: string; tokenAmount?: { amount: string } } } }
}

/** What the wallet and every token account it ever owned hold right now. */
async function currentHoldings(wallet: string, tokenAccounts: string[]) {
  const held = new Map<string, bigint>()
  const add = (asset: string, v: bigint) => held.set(asset, (held.get(asset) ?? 0n) + v)
  const bal = await rpc.call<{ value: number }>('getBalance', [wallet, { commitment: 'confirmed' }])
  add(SOL, BigInt(bal.value))
  for (let i = 0; i < tokenAccounts.length; i += 100) {
    const batch = tokenAccounts.slice(i, i + 100)
    const res = await rpc.call<{ value: Array<ParsedTokenAccount | null> }>('getMultipleAccounts', [
      batch,
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ])
    for (const acct of res.value) {
      if (!acct) continue
      add(SOL, BigInt(acct.lamports))
      const info = acct.data.parsed?.info
      if (info?.mint && info.tokenAmount && info.mint !== 'So11111111111111111111111111111111111111112') {
        add(info.mint, BigInt(info.tokenAmount.amount))
      }
    }
  }
  return held
}

function netFromRows(rows: Row[]) {
  const net = new Map<string, bigint>()
  const add = (asset: string, v: bigint) => net.set(asset, (net.get(asset) ?? 0n) + v)
  for (const r of rows) {
    if (r.received) add(r.received.mint, r.received.amount)
    if (r.sent) add(r.sent.mint, -r.sent.amount)
    if (r.fee) add(SOL, -r.fee)
  }
  return net
}

describe.skipIf(!RUN)('mainnet reconciliation', () => {
  it('rows reconcile to current balances for real wallets', { timeout: 30 * 60_000 }, async () => {
    const wallets = await pickWallets()
    console.log(`RPC ${URL === DEFAULT_RPC ? 'public' : 'custom'}; wallets: ${wallets.join(', ')}`)
    expect(wallets.length).toBeGreaterThan(0)
    const summary: unknown[] = []

    for (const wallet of wallets) {
      const t0 = Date.now()
      // Picked wallets are active traders: a transaction landing between the history fetch and the
      // balance snapshot shows up as a false mismatch. Re-run (cheaply, via the cache) until the
      // wallet's newest signature is unchanged across the snapshot.
      let history!: Awaited<ReturnType<typeof fetchHistory>>
      let processed!: ReturnType<typeof processHistory>
      let held!: Map<string, bigint>
      let quiet = false
      for (let attempt = 0; attempt < 4 && !quiet; attempt++) {
        const before = (await getSignaturesForAddress(rpc, wallet, { limit: 1 }))[0]?.signature
        history = await fetchHistory(rpc, [wallet], { cache })
        const base = processHistory(history.txs, [wallet], history.estate)
        const rewards = await fetchStakingRewards(rpc, history.txs, base.estate)
        if (rewards.failedEpochs.length) console.log(`${wallet}: reward epochs failed: ${rewards.failedEpochs.join(',')}`)
        processed = withExtraRows(base, rewards.rows)
        held = await currentHoldings(wallet, ownedAccounts(processed.estate))
        const after = (await getSignaturesForAddress(rpc, wallet, { limit: 1 }))[0]?.signature
        quiet = before === after
        if (!quiet) console.log(`${wallet}: new activity during check, retrying`)
      }
      const { rows, stats, estate } = processed
      const net = netFromRows(rows)

      const mismatches: Array<{ asset: string; rows: string; onChain: string; diff: string }> = []
      for (const asset of new Set([...net.keys(), ...held.keys()])) {
        const a = net.get(asset) ?? 0n
        const b = held.get(asset) ?? 0n
        if (a !== b) mismatches.push({ asset, rows: `${a}`, onChain: `${b}`, diff: `${a - b}` })
      }

      const tokens = await resolveTokens(rpc, collectDecimals(history.txs))
      const sources: Record<string, number> = {}
      for (const t of tokens.values()) sources[t.source] = (sources[t.source] ?? 0) + 1
      const csv = toKoinlyCsv(rows, tokens)
      const lines = csv.trimEnd().split('\r\n')
      expect(lines[0]).toBe(KOINLY_COLUMNS.join(','))

      const versions: Record<string, number> = {}
      for (const t of history.txs) {
        const v = String((t as { version?: unknown }).version ?? 'none')
        versions[v] = (versions[v] ?? 0) + 1
      }
      const newest = history.txs.find((t) => ![undefined, 'legacy', 0].includes((t as { version?: string | number }).version))
      if (newest) console.log('newer-version tx shape:', JSON.stringify(newest).slice(0, 1500))

      const entry = {
        wallet,
        versions,
        seconds: Math.round((Date.now() - t0) / 1000),
        txs: history.txs.length,
        missing: history.missing.length,
        tokenAccounts: estate.tokenAccounts.size,
        stakeAccounts: estate.stakeAccounts.size,
        escrowAccounts: estate.escrowAccounts.size,
        stats,
        tokenSources: sources,
        quiet,
        mismatches,
        sample: lines.slice(0, 12),
      }
      summary.push(entry)
      console.log(JSON.stringify(entry, null, 2))
      if (history.missing.length === 0 && quiet) expect.soft(mismatches, `wallet ${wallet}`).toEqual([])
    }

    console.log(`RPC requests: ${rpc.requests}`)
    writeFileSync('mainnet-report.json', JSON.stringify(summary, null, 2))
  })
})
