// Shapes of the Solana JSON-RPC `getTransaction` response we rely on
// (encoding "jsonParsed" or "json", maxSupportedTransactionVersion 0).

export interface UiTokenAmount {
  amount: string
  decimals: number
}

export interface TokenBalance {
  accountIndex: number
  mint: string
  owner?: string
  programId?: string
  uiTokenAmount: UiTokenAmount
}

export interface ParsedAccountKey {
  pubkey: string
  signer?: boolean
  writable?: boolean
  source?: string
}

export interface TxMeta {
  err: unknown
  fee: number
  preBalances: number[]
  postBalances: number[]
  preTokenBalances?: TokenBalance[] | null
  postTokenBalances?: TokenBalance[] | null
  loadedAddresses?: { writable: string[]; readonly: string[] } | null
}

export interface RpcTransaction {
  slot: number
  blockTime: number | null
  meta: TxMeta | null
  transaction: {
    signatures: string[]
    message: {
      accountKeys: Array<ParsedAccountKey | string>
    }
  }
}

/** Pseudo-mint used for native SOL (lamports, 9 decimals). */
export const SOL = 'SOL'
export const SOL_DECIMALS = 9
export const NATIVE_MINT = 'So11111111111111111111111111111111111111112'

export interface Leg {
  mint: string
  /** Positive amount in base units. */
  amount: bigint
}

export type RowKind = 'swap' | 'deposit' | 'withdrawal' | 'fee' | 'complex'

/** Koinly tags we emit. */
export type KoinlyTag = 'cost' | ''

export interface Row {
  signature: string
  blockTime: number
  kind: RowKind
  sent?: Leg
  received?: Leg
  /** Network (and folded-in) fee paid by the user, in lamports. */
  fee?: bigint
  tag: KoinlyTag
  needsReview: boolean
  note?: string
}

/** The user's accounts: wallet addresses plus token accounts they own. */
export interface Estate {
  wallets: Set<string>
  tokenAccounts: Set<string>
}

export function newEstate(wallets: Iterable<string>): Estate {
  return { wallets: new Set(wallets), tokenAccounts: new Set() }
}
