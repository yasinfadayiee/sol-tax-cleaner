import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { base58, base64 } from '@scure/base'
import { SOL } from '../engine/types'
import type { RpcClient } from './client'

export interface TokenInfo {
  symbol: string
  name?: string
  decimals: number
  source: 'builtin' | 'metaplex' | 'token-2022' | 'fallback' | 'user'
}

export const METAPLEX_PROGRAM = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'

const BUILTIN: Record<string, TokenInfo> = {
  [SOL]: { symbol: 'SOL', name: 'Solana', decimals: 9, source: 'builtin' },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', name: 'USD Coin', decimals: 6, source: 'builtin' },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY2NjfKt4cHgzJmM: { symbol: 'USDT', name: 'Tether USD', decimals: 6, source: 'builtin' },
}

const enc = new TextEncoder()

function onCurve(bytes: Uint8Array): boolean {
  try {
    ed25519.Point.fromBytes(bytes)
    return true
  } catch {
    return false
  }
}

/** Solana `findProgramAddress`. */
export function findProgramAddress(seeds: Uint8Array[], programId: string): string {
  const program = base58.decode(programId)
  const marker = enc.encode('ProgramDerivedAddress')
  for (let bump = 255; bump >= 0; bump--) {
    const parts = [...seeds, Uint8Array.of(bump), program, marker]
    const buf = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
    let o = 0
    for (const p of parts) {
      buf.set(p, o)
      o += p.length
    }
    const hash = sha256(buf)
    if (!onCurve(hash)) return base58.encode(hash)
  }
  throw new Error('No valid program address')
}

export function metadataAddress(mint: string): string {
  return findProgramAddress([enc.encode('metadata'), base58.decode(METAPLEX_PROGRAM), base58.decode(mint)], METAPLEX_PROGRAM)
}

/** Reads name and symbol from a Metaplex token-metadata account (v1 layout). */
export function parseMetaplexMetadata(data: Uint8Array): { name: string; symbol: string } | null {
  // key (1) + update authority (32) + mint (32), then Borsh strings: name, symbol, uri.
  let o = 1 + 32 + 32
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const readString = () => {
    if (o + 4 > data.length) throw new Error('short')
    const len = view.getUint32(o, true)
    o += 4
    if (len > 200 || o + len > data.length) throw new Error('bad length')
    const s = new TextDecoder().decode(data.subarray(o, o + len))
    o += len
    return s.replace(/\0+$/g, '').trim()
  }
  try {
    const name = readString()
    const symbol = readString()
    return { name, symbol }
  } catch {
    return null
  }
}

const CACHE_KEY = 'stc.tokens.v1'
const OVERRIDE_KEY = 'stc.symbolOverrides.v1'

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked or full: lookups simply repeat next time.
  }
}

export function loadOverrides(): Record<string, string> {
  return loadJson<Record<string, string>>(OVERRIDE_KEY) ?? {}
}

export function saveOverrides(o: Record<string, string>) {
  saveJson(OVERRIDE_KEY, o)
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

interface ParsedMint {
  value: Array<{
    data: { parsed?: { info?: { decimals?: number; extensions?: Array<{ extension: string; state?: { name?: string; symbol?: string } }> } } }
  } | null>
}

/**
 * Resolves mint → symbol/decimals using only the user's RPC: Token-2022 metadata extension,
 * then the Metaplex metadata account. Results are cached in localStorage.
 * `decimalsHint` comes from the transactions themselves and is always available.
 */
export async function resolveTokens(
  rpc: RpcClient | null,
  decimalsHint: Map<string, number>,
): Promise<Map<string, TokenInfo>> {
  const cache = loadJson<Record<string, TokenInfo>>(CACHE_KEY) ?? {}
  const out = new Map<string, TokenInfo>()
  const todo: string[] = []
  for (const [mint, decimals] of decimalsHint) {
    const known = BUILTIN[mint] ?? cache[mint]
    if (known) out.set(mint, { ...known, decimals })
    else todo.push(mint)
  }

  if (rpc && todo.length) {
    for (const batch of chunks(todo, 100)) {
      try {
        const res = await rpc.call<ParsedMint>('getMultipleAccounts', [batch, { encoding: 'jsonParsed' }])
        res.value.forEach((acct, i) => {
          const ext = acct?.data.parsed?.info?.extensions?.find((e) => e.extension === 'tokenMetadata')
          if (ext?.state?.symbol) {
            const mint = batch[i]
            out.set(mint, { symbol: ext.state.symbol, name: ext.state.name, decimals: decimalsHint.get(mint) ?? 0, source: 'token-2022' })
          }
        })
      } catch {
        // Lookup failures fall back below.
      }
    }
    const remaining = todo.filter((m) => !out.has(m))
    for (const batch of chunks(remaining, 100)) {
      try {
        const pdas = batch.map(metadataAddress)
        const res = await rpc.call<{ value: Array<{ data: [string, string] } | null> }>('getMultipleAccounts', [
          pdas,
          { encoding: 'base64' },
        ])
        res.value.forEach((acct, i) => {
          if (!acct) return
          const meta = parseMetaplexMetadata(base64.decode(acct.data[0]))
          if (meta?.symbol) {
            const mint = batch[i]
            out.set(mint, { symbol: meta.symbol, name: meta.name, decimals: decimalsHint.get(mint) ?? 0, source: 'metaplex' })
          }
        })
      } catch {
        // Lookup failures fall back below.
      }
    }
  }

  for (const mint of todo) {
    const found = out.get(mint)
    if (found) cache[mint] = found
    else out.set(mint, { symbol: fallbackSymbol(mint), decimals: decimalsHint.get(mint) ?? 0, source: 'fallback' })
  }
  saveJson(CACHE_KEY, cache)

  const overrides = loadOverrides()
  for (const [mint, symbol] of Object.entries(overrides)) {
    const info = out.get(mint)
    if (info && symbol.trim()) out.set(mint, { ...info, symbol: symbol.trim(), source: 'user' })
  }
  return out
}

export function fallbackSymbol(mint: string): string {
  return `UNKNOWN-${mint.slice(0, 4)}`
}
