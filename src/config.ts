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

/** Where visitors report a problem or ask a question (public GitHub issues; no email needed). */
export const SUPPORT_URL = 'https://github.com/yasinfadayiee/sol-tax-cleaner/issues/new'

export const MAX_WALLETS = 5
export const PREVIEW_ROWS = 20
export const UNLOCK_DAYS = 365

/**
 * RPC endpoint the site uses when the visitor hasn't entered their own. The public Solana endpoint refuses
 * requests from web pages, so the deployed site needs a keyed URL (restrict the key to the site's domain at the
 * provider). Set it with the VITE_RPC_URL build variable; it ends up in the public JavaScript.
 */
export const SITE_RPC_URL: string = import.meta.env.VITE_RPC_URL || ''
