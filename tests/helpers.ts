import type { RpcTransaction, TokenBalance } from '../src/engine/types'

export interface Acct {
  key: string
  pre: number
  post: number
}

export interface Tok {
  account: string
  mint: string
  owner?: string
  amount: string
  decimals?: number
}

let counter = 0

/**
 * Builds a getTransaction (jsonParsed-shaped) response. The first account is the fee payer.
 * Lamport balances must already include the fee deduction for the fee payer, as on-chain.
 */
export function tx(opts: {
  sig?: string
  accounts: Acct[]
  pre?: Tok[]
  post?: Tok[]
  fee?: number
  err?: unknown
  blockTime?: number
}): RpcTransaction {
  const keys = opts.accounts.map((a) => a.key)
  const toBalances = (toks: Tok[] = []): TokenBalance[] =>
    toks.map((t) => {
      const accountIndex = keys.indexOf(t.account)
      if (accountIndex < 0) throw new Error(`fixture: ${t.account} is not in accounts`)
      return {
        accountIndex,
        mint: t.mint,
        owner: t.owner,
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        uiTokenAmount: { amount: t.amount, decimals: t.decimals ?? 6 },
      }
    })
  counter++
  return {
    slot: 300_000_000 + counter,
    blockTime: opts.blockTime ?? 1_760_000_000 + counter,
    meta: {
      err: opts.err ?? null,
      fee: opts.fee ?? 5000,
      preBalances: opts.accounts.map((a) => a.pre),
      postBalances: opts.accounts.map((a) => a.post),
      preTokenBalances: toBalances(opts.pre),
      postTokenBalances: toBalances(opts.post),
    },
    transaction: {
      signatures: [opts.sig ?? `sig${counter}`],
      message: { accountKeys: keys.map((pubkey, i) => ({ pubkey, signer: i === 0, writable: true, source: 'transaction' })) },
    },
  }
}

export const W = 'WaLLet1111111111111111111111111111111111111'
export const W2 = 'WaLLet2222222222222222222222222222222222222'
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
export const MEME = 'MeMe1111111111111111111111111111111111pump'
export const LP = 'LPmint11111111111111111111111111111111111111'
export const RENT = 2_039_280
