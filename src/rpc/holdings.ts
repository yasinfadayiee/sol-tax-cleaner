import { SOL } from '../engine/types'
import type { RpcClient } from './client'

const NATIVE_MINT = 'So11111111111111111111111111111111111111112'

interface ParsedAccount {
  lamports: number
  data: { parsed?: { info?: { mint?: string; tokenAmount?: { amount: string } } } }
}

/**
 * What the wallets and every account in their estate hold right now: lamports per account, plus the token
 * amounts of token accounts. Wrapped SOL counts through its lamports, as in the engine.
 */
export async function currentHoldings(rpc: RpcClient, wallets: string[], accounts: string[]): Promise<Map<string, bigint>> {
  const held = new Map<string, bigint>()
  const add = (asset: string, v: bigint) => held.set(asset, (held.get(asset) ?? 0n) + v)
  const all = [...wallets, ...accounts]
  for (let i = 0; i < all.length; i += 100) {
    const res = await rpc.call<{ value: Array<ParsedAccount | null> }>('getMultipleAccounts', [
      all.slice(i, i + 100),
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ])
    for (const acct of res.value) {
      if (!acct) continue
      add(SOL, BigInt(acct.lamports))
      const info = acct.data.parsed?.info
      if (info?.mint && info.tokenAmount && info.mint !== NATIVE_MINT) add(info.mint, BigInt(info.tokenAmount.amount))
    }
  }
  return held
}
