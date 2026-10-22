import { useEffect, useState } from 'react'

const KEY = 'stc-sol-usd'
const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'

let pending: Promise<number | null> | undefined

function load(): Promise<number | null> {
  pending ??= fetch(URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { solana?: { usd?: number } } | null) => {
      const usd = j?.solana?.usd
      if (typeof usd !== 'number' || !(usd > 0)) return null
      try {
        sessionStorage.setItem(KEY, String(usd))
      } catch {
        // storage may be blocked; the price is still shown this time
      }
      return usd
    })
    .catch(() => null)
  return pending
}

/** Today's SOL price in USD, or null while loading or when the price service can't be reached. */
export function useSolPrice(): number | null {
  const [usd, setUsd] = useState<number | null>(() => {
    try {
      const v = Number(sessionStorage.getItem(KEY))
      return v > 0 ? v : null
    } catch {
      return null
    }
  })
  useEffect(() => {
    if (usd !== null) return
    let live = true
    void load().then((v) => live && setUsd(v))
    return () => {
      live = false
    }
  }, [usd])
  return usd
}

/** "≈ $31" for an amount of SOL, or '' when the price is unknown. */
export function usdLabel(sol: string, usd: number | null): string {
  return usd ? `≈ $${Math.round(Number(sol) * usd)}` : ''
}
