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

/** An instruction as returned with "jsonParsed" encoding; `parsed` is set for programs the RPC can decode. */
export interface ParsedInstruction {
  program?: string
  programId: string
  parsed?: { type: string; info: Record<string, unknown> } | string
}

export interface TxMeta {
  err: unknown
  fee: number
  preBalances: number[]
  postBalances: number[]
  preTokenBalances?: TokenBalance[] | null
  postTokenBalances?: TokenBalance[] | null
  loadedAddresses?: { writable: string[]; readonly: string[] } | null
  innerInstructions?: Array<{ index: number; instructions: ParsedInstruction[] }> | null
}

export interface RpcTransaction {
  slot: number
  blockTime: number | null
  meta: TxMeta | null
  transaction: {
    signatures: string[]
    message: {
      accountKeys: Array<ParsedAccountKey | string>
      instructions?: ParsedInstruction[]
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
export type KoinlyTag = 'cost' | 'staking' | ''

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

/**
 * The user's accounts: wallet addresses, token accounts they own, native stake accounts they control, and escrow
 * accounts their Jupiter DCA / limit orders created (the order account and the token accounts it owns).
 */
export interface Estate {
  wallets: Set<string>
  tokenAccounts: Set<string>
  stakeAccounts: Set<string>
  escrowAccounts: Set<string>
}

export function newEstate(wallets: Iterable<string>): Estate {
  return { wallets: new Set(wallets), tokenAccounts: new Set(), stakeAccounts: new Set(), escrowAccounts: new Set() }
}

/** Every non-wallet account in the estate. */
export function ownedAccounts(estate: Estate): string[] {
  return [...estate.tokenAccounts, ...estate.stakeAccounts, ...estate.escrowAccounts]
}
