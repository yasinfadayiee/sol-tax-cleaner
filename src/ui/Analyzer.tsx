import { useEffect, useRef, useState } from 'react'
import { MAX_WALLETS } from '../config'
import { DEFAULT_RPC, saveRpcUrl, savedRpcUrl } from '../rpc/client'
import { SITE_RPC_URL } from '../config'
import { isValidAddress, type Progress } from '../rpc/history'
import { Results } from './Results'
import { useAnalysis } from './useAnalysis'

export function Analyzer() {
  const { state, start, startSample, cancel, updateTokens } = useAnalysis()
  const section = useRef<HTMLElement>(null)
  const [wallets, setWallets] = useState<string[]>([''])
  const [rpcUrl, setRpcUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const [showRpc, setShowRpc] = useState(false)
  const rpcInput = useRef<HTMLInputElement>(null)
  const blocked = state.status === 'error' && state.rpcBlocked
  const base = import.meta.env.BASE_URL

  const cleaned = wallets.map((w) => w.trim()).filter(Boolean)
  const invalid = cleaned.filter((w) => !isValidAddress(w))
  const duplicate = new Set(cleaned).size !== cleaned.length
  const canRun = cleaned.length > 0 && invalid.length === 0 && !duplicate && state.status !== 'running'

  // Read after mount so the prerendered page and the first client render match.
  // oxlint-disable-next-line react/set-state-in-effect -- must run after hydration
  useEffect(() => setRpcUrl(savedRpcUrl() ?? ''), [])

  // The hero's "Try a sample wallet" button links to #sample.
  useEffect(() => {
    const onHash = () => {
      if (location.hash !== '#sample') return
      startSample()
      history.replaceState(null, '', '#analyse')
      section.current?.scrollIntoView({ behavior: 'smooth' })
    }
    onHash()
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [startSample])

  const run = () => {
    setTouched(true)
    if (!canRun) return
    saveRpcUrl(rpcUrl.trim() || null)
    void start(cleaned, rpcUrl.trim() || undefined)
  }

  return (
    <section className="analyzer card" id="analyse" aria-labelledby="analyse-title" ref={section}>
      <h2 id="analyse-title">Analyse your wallets free</h2>
      <p className="muted">
        Paste your public Solana address. Nothing is uploaded: your browser reads the blockchain directly and
        builds the file on your computer.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
      >
        {wallets.map((w, i) => (
          <div className="wallet-row" key={i}>
            <label className="sr-only" htmlFor={`wallet-${i}`}>
              Wallet address {i + 1}
            </label>
            <input
              id={`wallet-${i}`}
              className="mono"
              value={w}
              placeholder="Solana wallet address, e.g. 7xKX…sgAsU"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={touched && !!w.trim() && !isValidAddress(w.trim())}
              onChange={(e) => setWallets(wallets.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {wallets.length > 1 && (
              <button type="button" className="ghost" aria-label={`Remove wallet ${i + 1}`} onClick={() => setWallets(wallets.filter((_, j) => j !== i))}>
                ×
              </button>
            )}
          </div>
        ))}
        {wallets.length < MAX_WALLETS && (
          <button type="button" className="link add-wallet" onClick={() => setWallets([...wallets, ''])}>
            + Add another wallet you own (up to {MAX_WALLETS})
          </button>
        )}

        <details className="advanced" open={showRpc || blocked} onToggle={(e) => setShowRpc(e.currentTarget.open)}>
          <summary>Use your own RPC URL (free, much faster)</summary>
          <p className="muted small">
            A free key from an RPC provider (for example Helius, QuickNode or Alchemy) makes analysis many times faster.
            The URL is stored only in this browser. <a href={`${base}free-solana-rpc-url/`}>How to get one in two minutes</a>.
          </p>
          <input
            ref={rpcInput}
            className="mono"
            value={rpcUrl}
            placeholder={SITE_RPC_URL ? 'https://mainnet.helius-rpc.com/?api-key=…' : DEFAULT_RPC}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setRpcUrl(e.target.value)}
            aria-label="Custom RPC URL"
          />
        </details>

        {touched && invalid.length > 0 && <p className="error">That doesn’t look like a Solana address: {invalid[0]}</p>}
        {touched && duplicate && <p className="error">The same address is listed twice.</p>}

        <div className="actions">
          {state.status === 'running' ? (
            <button type="button" className="secondary" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button type="submit" className="primary" disabled={touched && !canRun}>
              {state.status === 'done' && !state.analysis.sample ? 'Analyse again' : 'Analyse free'}
            </button>
          )}
          {state.status !== 'running' && (
            <button type="button" className="secondary" onClick={startSample}>
              Try a sample wallet
            </button>
          )}
        </div>
      </form>

      {state.status === 'running' && <ProgressView p={state.progress} />}
      {state.status === 'error' && !state.rpcBlocked && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'error' && state.rpcBlocked && (
        <div className="rpc-help" role="alert">
          <p>
            <strong>One more step: add a free RPC URL.</strong> The Solana RPC endpoint refused this request. The free
            public one only serves a few requests to web pages, so most people need their own (free) URL.
          </p>
          <ol>
            <li>
              Create a free account at an RPC provider such as{' '}
              <a href="https://www.helius.dev/" target="_blank" rel="noreferrer">
                Helius
              </a>{' '}
              and copy your <strong>mainnet</strong> RPC URL.
            </li>
            <li>Paste it in the box above and press Analyse again.</li>
          </ol>
          <p className="muted small">
            The URL stays in this browser. <a href={`${base}free-solana-rpc-url/`}>Step-by-step guide</a>. Details:{' '}
            {state.message}
          </p>
          <button type="button" className="secondary" onClick={() => rpcInput.current?.focus()}>
            Paste my RPC URL
          </button>
        </div>
      )}
      {state.status === 'done' && <Results analysis={state.analysis} onTokensChange={updateTokens} />}
    </section>
  )
}

function ProgressView({ p }: { p: Progress }) {
  const pct = p.txTotal ? Math.round((p.txDone / p.txTotal) * 100) : 0
  const eta = useEta(p)
  const label =
    p.phase === 'accounts'
      ? 'Finding your token accounts…'
      : p.phase === 'signatures'
        ? `Listing transactions: ${p.signatures.toLocaleString()} found (${p.addressesDone}/${p.addressesTotal} accounts scanned)`
        : p.phase === 'staking'
          ? `Checking staking rewards: epoch ${p.txDone.toLocaleString()} of ${p.txTotal.toLocaleString()}`
          : `Reading transactions: ${p.txDone.toLocaleString()} of ${p.txTotal.toLocaleString()}`
  return (
    <div className="progress" role="status" aria-live="polite">
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${p.phase === 'transactions' || p.phase === 'staking' ? pct : 5}%` }} />
      </div>
      <p className="small">
        {label}
        {eta && <span className="muted"> · {eta}</span>}
      </p>
      <p className="muted small">Keep this tab open. Re-running later is instant: transactions are cached in your browser.</p>
    </div>
  )
}

/** "about 3 min left" while reading transactions, from the rate so far in this phase. */
function useEta(p: Progress): string {
  const start = useRef<{ at: number; done: number } | null>(null)
  const [eta, setEta] = useState('')
  const active = p.phase === 'transactions' && p.txTotal > 0
  useEffect(() => {
    if (!active) {
      start.current = null
      return
    }
    const now = Date.now()
    start.current ??= { at: now, done: p.txDone }
    const elapsed = now - start.current.at
    const done = p.txDone - start.current.done
    if (elapsed < 5000 || done < 20) return
    const min = Math.round((((p.txTotal - p.txDone) / done) * elapsed) / 60_000)
    setEta(min < 1 ? 'less than a minute left' : `about ${min} min left`)
  }, [active, p.txDone, p.txTotal])
  return active ? eta : ''
}
