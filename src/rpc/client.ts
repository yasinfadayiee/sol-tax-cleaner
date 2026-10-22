export const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com'

export class RpcError extends Error {
  readonly code: number | undefined
  constructor(message: string, code?: number) {
    super(message)
    this.name = 'RpcError'
    this.code = code
  }
}

export interface RpcOptions {
  url: string
  /** Requests in flight at once. */
  maxConcurrent?: number
  /** Average requests per second. */
  ratePerSec?: number
  maxRetries?: number
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Errors worth retrying: rate limits, overloaded or lagging nodes. */
const RETRY_RPC_CODES = new Set([-32005, -32007, -32014, -32016, 429])

/**
 * Minimal JSON-RPC client: concurrency cap, steady request pacing, and retries with
 * exponential backoff that honour Retry-After. The public Solana RPC allows about
 * 100 requests per 10 s per IP (40 per method), so the defaults stay under that.
 */
export class RpcClient {
  readonly url: string
  private readonly maxConcurrent: number
  private readonly interval: number
  private readonly maxRetries: number
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>
  private active = 0
  private waiters: Array<() => void> = []
  private nextSlot = 0
  private id = 0
  requests = 0

  constructor(opts: RpcOptions) {
    this.url = opts.url
    this.maxConcurrent = opts.maxConcurrent ?? 4
    this.interval = 1000 / (opts.ratePerSec ?? 3.5)
    this.maxRetries = opts.maxRetries ?? 6
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args))
    this.sleep = opts.sleep ?? realSleep
  }

  private async acquire() {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
    this.active++
  }

  private release() {
    this.active--
    this.waiters.shift()?.()
  }

  private async pace() {
    const now = Date.now()
    const slot = Math.max(now, this.nextSlot)
    this.nextSlot = slot + this.interval
    if (slot > now) await this.sleep(slot - now)
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    await this.acquire()
    try {
      for (let attempt = 0; ; attempt++) {
        await this.pace()
        let retryAfterMs: number | undefined
        let failure: Error
        try {
          this.requests++
          const res = await this.fetchImpl(this.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params }),
          })
          if (res.ok) {
            const body = (await res.json()) as { result?: T; error?: { code: number; message: string } }
            if (!body.error) return body.result as T
            failure = new RpcError(`${method}: ${body.error.message}`, body.error.code)
            if (!RETRY_RPC_CODES.has(body.error.code)) throw failure
          } else {
            failure = new RpcError(`${method}: HTTP ${res.status}`, res.status)
            if (res.status !== 429 && res.status < 500) throw failure
            const ra = Number(res.headers.get('retry-after'))
            if (ra > 0) retryAfterMs = ra * 1000
          }
        } catch (e) {
          if (e instanceof RpcError && !RETRY_RPC_CODES.has(e.code ?? 0) && (e.code ?? 0) < 500) throw e
          failure = e instanceof Error ? e : new Error(String(e))
        }
        if (attempt >= this.maxRetries) throw failure
        const backoff = Math.min(30_000, 500 * 2 ** attempt) * (0.75 + Math.random() * 0.5)
        await this.sleep(retryAfterMs ?? backoff)
      }
    } finally {
      this.release()
    }
  }
}

// ---- Typed helpers -------------------------------------------------------------

export interface SignatureInfo {
  signature: string
  slot: number
  err: unknown
  memo: string | null
  blockTime: number | null
}

export function getSignaturesForAddress(
  rpc: RpcClient,
  address: string,
  opts: { before?: string; until?: string; limit?: number } = {},
) {
  return rpc.call<SignatureInfo[]>('getSignaturesForAddress', [
    address,
    { limit: opts.limit ?? 1000, before: opts.before, until: opts.until, commitment: 'confirmed' },
  ])
}

export function getTransaction<T>(rpc: RpcClient, signature: string) {
  return rpc.call<T | null>('getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  ])
}

export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EH5MUbbpMaQ3WvtQ52bD2Bg3'

export async function getTokenAccountsByOwner(rpc: RpcClient, owner: string, programId: string) {
  const res = await rpc.call<{ value: Array<{ pubkey: string }> }>('getTokenAccountsByOwner', [
    owner,
    { programId },
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ])
  return res.value.map((v) => v.pubkey)
}

export function getAccountInfoBase64(rpc: RpcClient, address: string) {
  return rpc.call<{ value: { data: [string, string]; owner: string } | null }>('getAccountInfo', [
    address,
    { encoding: 'base64', commitment: 'confirmed' },
  ])
}

// ---- Settings ------------------------------------------------------------------

const RPC_KEY = 'stc.rpcUrl'

export function savedRpcUrl(): string | null {
  try {
    return localStorage.getItem(RPC_KEY)
  } catch {
    return null
  }
}

export function saveRpcUrl(url: string | null) {
  try {
    if (url) localStorage.setItem(RPC_KEY, url)
    else localStorage.removeItem(RPC_KEY)
  } catch {
    // Storage may be blocked; the setting then lasts for this page only.
  }
}

/** Public endpoint: gentle pacing. Custom (usually keyed) endpoint: faster. */
export function makeClient(url = savedRpcUrl() ?? DEFAULT_RPC): RpcClient {
  const isPublic = url === DEFAULT_RPC
  return new RpcClient({ url, maxConcurrent: isPublic ? 3 : 8, ratePerSec: isPublic ? 3.5 : 20 })
}
