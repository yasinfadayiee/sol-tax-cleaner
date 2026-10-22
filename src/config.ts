/** Public settings. No secrets belong here. */
export const APP_NAME = 'SolTax Cleaner'

/** Owner's Solana wallet that receives payments. VITE_MERCHANT_ADDRESS overrides it at build time. */
export const MERCHANT_ADDRESS: string = import.meta.env.VITE_MERCHANT_ADDRESS || 'C6fwRzwGVLBhBnLmiWqKgR25qBz4U3ysNuEKse519G6V'

/** Price of one unlock (12 months, up to MAX_WALLETS wallets), in SOL. */
export const PRICE_SOL = '0.25'

/** The same unlock paid in USDC, for buyers who'd rather not price it in SOL. */
export const PRICE_USDC = '39'

/** Memo attached to payments; the unlock check looks for it. */
export const MEMO_PREFIX = 'STC'

export const MAX_WALLETS = 5
export const PREVIEW_ROWS = 20
export const UNLOCK_DAYS = 365
