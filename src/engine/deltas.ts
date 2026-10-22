import { NATIVE_MINT, SOL, SOL_DECIMALS, type Estate, type RpcTransaction, type TokenBalance } from './types'

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
    if (estate.wallets.has(k) || estate.tokenAccounts.has(k)) inEstate.add(i)
  })
  for (const tb of tokenBalances(tx)) {
    if (tb.owner && estate.wallets.has(tb.owner)) inEstate.add(tb.accountIndex)
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
