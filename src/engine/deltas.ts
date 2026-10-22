import { NATIVE_MINT, SOL, SOL_DECIMALS, type Estate, type ParsedInstruction, type RpcTransaction, type TokenBalance } from './types'

export const STAKE_PROGRAM = 'Stake11111111111111111111111111111111111111'

/** Jupiter programs that hold a user's funds in per-order escrow accounts until keepers fill the order. */
export const ESCROW_PROGRAMS = new Set([
  'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M', // DCA
  'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu', // limit order v1
  'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X', // limit order v2
])

/** Every account key of the transaction, including address-lookup-table keys. */
export function accountKeys(tx: RpcTransaction): string[] {
  const raw = tx.transaction.message.accountKeys
  const keys = raw.map((k) => (typeof k === 'string' ? k : k.pubkey))
  // With "json" encoding, lookup-table addresses are listed separately; "jsonParsed" already merges them.
  const loaded = tx.meta?.loadedAddresses
  if (raw.length > 0 && typeof raw[0] === 'string' && loaded) {
    keys.push(...loaded.writable, ...loaded.readonly)
  }
  return keys
}

function tokenBalances(tx: RpcTransaction): TokenBalance[] {
  return [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])]
}

/**
 * Adds to the estate every token account in this transaction whose owner is one of the
 * user's wallets. Returns the newly discovered addresses.
 */
export function discoverTokenAccounts(tx: RpcTransaction, estate: Estate): string[] {
  const keys = accountKeys(tx)
  const found: string[] = []
  for (const tb of tokenBalances(tx)) {
    if (!tb.owner || !estate.wallets.has(tb.owner)) continue
    const address = keys[tb.accountIndex]
    if (address && !estate.tokenAccounts.has(address) && !estate.wallets.has(address)) {
      estate.tokenAccounts.add(address)
      found.push(address)
    }
  }
  return found
}

/** Top-level and inner instructions, as decoded by the RPC. */
export function instructions(tx: RpcTransaction): ParsedInstruction[] {
  return [...(tx.transaction.message.instructions ?? []), ...(tx.meta?.innerInstructions ?? []).flatMap((ii) => ii.instructions)]
}

const STAKE_AUTHORITY_FIELDS = ['staker', 'withdrawer', 'stakeAuthority', 'withdrawAuthority', 'newAuthority']
const STAKE_ACCOUNT_FIELDS = ['stakeAccount', 'newSplitAccount', 'destination', 'source']

/**
 * Adds to the estate every native stake account a user wallet funds or controls in this transaction, so staking
 * and unstaking net out like moves between the user's own accounts. Returns the newly discovered addresses.
 */
export function discoverStakeAccounts(tx: RpcTransaction, estate: Estate): string[] {
  const found: string[] = []
  const add = (a: unknown) => {
    if (typeof a === 'string' && !estate.stakeAccounts.has(a) && !estate.wallets.has(a)) {
      estate.stakeAccounts.add(a)
      found.push(a)
    }
  }
  for (const ix of instructions(tx)) {
    if (typeof ix.parsed !== 'object' || !ix.parsed) continue
    const info = ix.parsed.info
    if (ix.program === 'system' && /^createAccount/.test(ix.parsed.type) && info.owner === STAKE_PROGRAM) {
      if (estate.wallets.has(String(info.source))) add(info.newAccount)
      continue
    }
    if (ix.programId !== STAKE_PROGRAM) continue
    const authorized = (info.authorized ?? {}) as Record<string, unknown>
    const authorities = [...STAKE_AUTHORITY_FIELDS.map((f) => info[f]), authorized.staker, authorized.withdrawer]
    if (!authorities.some((a) => typeof a === 'string' && estate.wallets.has(a))) continue
    // A withdraw's destination is usually the wallet itself; only stake-program accounts join the estate.
    for (const f of STAKE_ACCOUNT_FIELDS) {
      if (f === 'destination' && ix.parsed.type === 'withdraw') continue
      add(info[f])
    }
  }
  return found
}

/**
 * When a user wallet pays for a transaction that calls a Jupiter DCA / limit-order program, the order account and
 * the token accounts it owns that are created in that transaction hold the user's funds. Adding them to the estate
 * makes placing or cancelling an order a move inside the user's own pot, and each fill a swap.
 * Returns the newly discovered addresses.
 */
export function discoverEscrowAccounts(tx: RpcTransaction, estate: Estate): string[] {
  const meta = tx.meta
  if (!meta || meta.err) return []
  const keys = accountKeys(tx)
  const userOrder = estate.wallets.has(keys[0] ?? '') && keys.some((k) => ESCROW_PROGRAMS.has(k))
  const created = (i: number) => (meta.preBalances[i] ?? 0) === 0 && (meta.postBalances[i] ?? 0) > 0
  const found: string[] = []
  const add = (a: string) => {
    if (!estate.escrowAccounts.has(a) && !estate.wallets.has(a) && !estate.tokenAccounts.has(a)) {
      estate.escrowAccounts.add(a)
      found.push(a)
    }
  }
  for (const tb of meta.postTokenBalances ?? []) {
    if (!tb.owner || estate.wallets.has(tb.owner)) continue
    // A token account opened later for an order we already know (e.g. a DCA output vault).
    if (estate.escrowAccounts.has(tb.owner)) {
      add(keys[tb.accountIndex])
      continue
    }
    if (!userOrder || !created(tb.accountIndex)) continue
    const ownerIndex = keys.indexOf(tb.owner)
    if (ownerIndex < 0 || !created(ownerIndex)) continue
    add(keys[tb.accountIndex])
    add(tb.owner)
  }
  return found
}

export interface Deltas {
  /** Net lamports change across the whole estate, excluding the network fee. */
  solLamports: bigint
  /** Net raw-amount change per SPL mint (native mint excluded; WSOL is counted in lamports). */
  tokens: Map<string, bigint>
  /** Network fee paid by the user (0 when someone else paid). */
  fee: bigint
  failed: boolean
  /** True when SOL arrived only as rent for token accounts that someone else opened for the user. */
  rentFromOthers: boolean
}

/**
 * Estate accounting: treat the user's wallets and all token accounts they own as one pot.
 * Rent deposits/refunds and wrapped-SOL moves happen inside the pot, so they net out.
 */
export function computeDeltas(tx: RpcTransaction, estate: Estate): Deltas {
  const meta = tx.meta
  if (!meta) throw new Error(`Transaction ${tx.transaction.signatures[0]} has no meta`)
  const keys = accountKeys(tx)

  const inEstate = new Set<number>()
  keys.forEach((k, i) => {
    if (estate.wallets.has(k) || estate.tokenAccounts.has(k) || estate.stakeAccounts.has(k) || estate.escrowAccounts.has(k)) inEstate.add(i)
  })
  for (const tb of tokenBalances(tx)) {
    if (tb.owner && (estate.wallets.has(tb.owner) || estate.escrowAccounts.has(tb.owner))) inEstate.add(tb.accountIndex)
  }

  let sol = 0n
  for (const i of inEstate) {
    sol += BigInt(meta.postBalances[i] ?? 0) - BigInt(meta.preBalances[i] ?? 0)
  }

  const feePaid = estate.wallets.has(keys[0] ?? '')
  const fee = feePaid ? BigInt(meta.fee) : 0n
  sol += fee

  const tokens = new Map<string, bigint>()
  const add = (tb: TokenBalance, sign: bigint) => {
    if (!inEstate.has(tb.accountIndex) || tb.mint === NATIVE_MINT) return
    tokens.set(tb.mint, (tokens.get(tb.mint) ?? 0n) + sign * BigInt(tb.uiTokenAmount.amount))
  }
  for (const tb of meta.preTokenBalances ?? []) add(tb, -1n)
  for (const tb of meta.postTokenBalances ?? []) add(tb, 1n)
  for (const [mint, v] of tokens) if (v === 0n) tokens.delete(mint)

  let rentFromOthers = false
  if (!feePaid && sol > 0n) {
    let createdRent = 0n
    for (const i of inEstate) {
      if (estate.wallets.has(keys[i] ?? '')) continue
      if ((meta.preBalances[i] ?? 0) === 0 && (meta.postBalances[i] ?? 0) > 0) {
        createdRent += BigInt(meta.postBalances[i] ?? 0)
      }
    }
    rentFromOthers = createdRent === sol
  }

  return { solLamports: sol, tokens, fee, failed: meta.err != null, rentFromOthers }
}

/** Decimals for every mint seen in the transactions (SOL included). */
export function collectDecimals(txs: RpcTransaction[]): Map<string, number> {
  const out = new Map<string, number>([[SOL, SOL_DECIMALS]])
  for (const tx of txs) {
    for (const tb of tokenBalances(tx)) {
      if (tb.mint !== NATIVE_MINT && !out.has(tb.mint)) out.set(tb.mint, tb.uiTokenAmount.decimals)
    }
  }
  return out
}
