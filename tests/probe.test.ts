// Dev probe, skipped unless PROBE=1 (runs in CI, where Solana RPC is reachable). Dumps compact summaries of real
// Jupiter DCA / limit-order transactions so the engine's handling of their escrow accounts can be designed from data.
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import type { RpcTransaction } from '../src/engine'
import { DEFAULT_RPC, getSignaturesForAddress, getTransaction, RpcClient } from '../src/rpc/client'

const RUN = process.env.PROBE === '1'
const URL = process.env.RPC_URL || DEFAULT_RPC
const PROGRAMS: Record<string, string> = {
  dca: 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M',
  limitV1: 'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu',
  limitV2: 'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X',
}
const rpc = new RpcClient({ url: URL, maxConcurrent: 3, ratePerSec: URL === DEFAULT_RPC ? 3.5 : 20 })
type Tx = RpcTransaction & { meta: RpcTransaction['meta'] & { logMessages?: string[] } }

const keyOf = (k: unknown) => (typeof k === 'string' ? k : (k as { pubkey: string }).pubkey)

function summary(sig: string, t: Tx, program: string) {
  const keys = t.transaction.message.accountKeys.map(keyOf)
  const short = (k: string) => k.slice(0, 6)
  const instr = (t.meta.logMessages ?? []).filter((l) => l.startsWith('Program log: Instruction:')).map((l) => l.slice(26))
  const tok = new Map<string, { mint: string; owner?: string; pre: string; post: string }>()
  for (const [side, list] of [['pre', t.meta.preTokenBalances], ['post', t.meta.postTokenBalances]] as const) {
    for (const b of list ?? []) {
      const k = keys[b.accountIndex]
      const e = tok.get(k) ?? { mint: b.mint, owner: b.owner, pre: '0', post: '0' }
      e[side] = b.uiTokenAmount.amount
      tok.set(k, e)
    }
  }
  return {
    sig,
    time: t.blockTime ? new Date(t.blockTime * 1000).toISOString() : null,
    signer: keys[0],
    programIn: keys.includes(program),
    instr,
    lamports: keys
      .map((k, i) => ({ k: short(k), d: t.meta.postBalances[i] - t.meta.preBalances[i] }))
      .filter((x) => x.d !== 0),
    tokens: [...tok.entries()]
      .filter(([, e]) => e.pre !== e.post)
      .map(([k, e]) => ({ acct: k, mint: short(e.mint), owner: e.owner, pre: e.pre, post: e.post })),
  }
}

describe.skipIf(!RUN)('probe escrow programs', () => {
  it('dumps program activity and one user lifecycle each', { timeout: 30 * 60_000 }, async () => {
    const out: Record<string, unknown> = {}
    for (const [name, program] of Object.entries(PROGRAMS)) {
      const sigs = (await getSignaturesForAddress(rpc, program, { limit: 25 })).filter((s) => !s.err)
      const recent: ReturnType<typeof summary>[] = []
      for (const s of sigs.slice(0, 12)) {
        const t = await getTransaction<Tx>(rpc, s.signature)
        if (t) recent.push(summary(s.signature, t, program))
      }
      // Follow one user: the signer of an order-opening instruction, then every escrow token account it funded.
      const open = recent.find((r) => r.instr.some((i) => /open|init|create|place|deposit/i.test(i)))
      const lifecycle: unknown[] = []
      if (open) {
        const user = open.signer
        const escrows = open.tokens.filter((t) => t.owner !== user && BigInt(t.post) > BigInt(t.pre)).map((t) => t.acct)
        const userTokenAccts = open.tokens.filter((t) => t.owner === user).map((t) => t.acct)
        const seen = new Set<string>()
        for (const addr of [user, ...escrows, ...userTokenAccts]) {
          for (const s of await getSignaturesForAddress(rpc, addr, { limit: 40 })) {
            if (seen.has(s.signature) || s.err) continue
            seen.add(s.signature)
            const t = await getTransaction<Tx>(rpc, s.signature)
            if (t && t.transaction.message.accountKeys.map(keyOf).includes(program)) lifecycle.push(summary(s.signature, t, program))
          }
        }
        lifecycle.sort((a, b) => String((a as { time: string }).time).localeCompare(String((b as { time: string }).time)))
        out[`${name}:user`] = { user, escrows, userTokenAccts }
      }
      out[name] = { recentCount: sigs.length, recent, lifecycle }
    }
    // Native stakers with a modest history, for the mainnet reconciliation check.
    const stakers: string[] = []
    const STAKE = 'Stake11111111111111111111111111111111111111'
    for (const s of (await getSignaturesForAddress(rpc, STAKE, { limit: 60 })).filter((x) => !x.err)) {
      if (stakers.length >= 3) break
      const t = await getTransaction<Tx>(rpc, s.signature)
      const ix = (t?.transaction.message.instructions ?? []).find(
        (i) => i.programId === STAKE && typeof i.parsed === 'object' && i.parsed?.type === 'delegate',
      )
      const auth = ix && typeof ix.parsed === 'object' ? String(ix.parsed.info.stakeAuthority) : undefined
      if (!auth || stakers.includes(auth)) continue
      const n = (await getSignaturesForAddress(rpc, auth, { limit: 251 })).length
      if (n >= 5 && n <= 250) stakers.push(auth)
    }
    out.stakers = stakers
    const json = JSON.stringify(out, null, 1)
    writeFileSync('probe-report.json', json)
    console.log(json)
  })
})
