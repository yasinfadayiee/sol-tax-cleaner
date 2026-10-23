import { useEffect, useRef, useState } from 'react'
import { MAX_WALLETS } from '../config'
import { DEFAULT_RPC, saveRpcUrl, savedRpcUrl } from '../rpc/client'
import { isValidAddress, type Progress } from '../rpc/history'
import { Results } from './Results'
import { useAnalysis } from './useAnalysis'

export function Analyzer() {
  const { state, start, startSample, cancel, updateTokens } = useAnalysis()
  const section = useRef<HTMLElement>(null)
  const [wallets, setWallets] = useState<string[]>([''])
  const [rpcUrl, setRpcUrl] = useState('')
  const [touched, setTouched] = useState(false)

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
          <button type="button" className="link" onClick={() => setWallets([...wallets, ''])}>
            + Add another wallet you own (up to {MAX_WALLETS})
          </button>
        )}

        <details className="advanced">
          <summary>Advanced: use your own RPC endpoint (much faster)</summary>
          <p className="muted small">
            The free public endpoint allows only a few requests per second, so large histories can take a while. A free
            key from an RPC provider (for example Helius or QuickNode) makes analysis many times faster. The URL is stored
            only in this browser.
          </p>
          <input
            className="mono"
            value={rpcUrl}
            placeholder={DEFAULT_RPC}
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
      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && <Results analysis={state.analysis} onTokensChange={updateTokens} />}
    </section>
  )
}

function ProgressView({ p }: { p: Progress }) {
  const pct = p.txTotal ? Math.round((p.txDone / p.txTotal) * 100) : 0
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
      <p className="small">{label}</p>
      <p className="muted small">Keep this tab open. Re-running later is instant: transactions are cached in your browser.</p>
    </div>
  )
}
