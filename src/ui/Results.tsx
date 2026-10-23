import { useCallback, useMemo, useState } from 'react'
import { PREVIEW_ROWS } from '../config'
import { SOL, type Row } from '../engine/types'
import { FORMAT_IDS, FORMATS, type FormatId } from '../export/formats'
import { formatAmount, formatDate } from '../export/koinly'
import { groupDigits } from './format'
import { ambiguousTokens, buildReport } from '../export/report'
import { reportToHtml } from '../export/reportHtml'
import { loadOverrides, saveOverrides, type TokenInfo } from '../rpc/tokens'
import { download } from './download'
import type { Analysis } from './useAnalysis'
import { Payment } from './Payment'

export function Results({ analysis, onTokensChange }: { analysis: Analysis; onTokensChange: (t: Map<string, TokenInfo>) => void }) {
  const { stats, rows, tokens } = analysis
  const [unlocked, setUnlocked] = useState(false)
  const unlock = useCallback(() => setUnlocked(true), [])
  const review = useMemo(() => [...new Set(rows.filter((r) => r.needsReview).map((r) => r.signature))], [rows])

  const [formatId, setFormatId] = useState<FormatId>(savedFormat)
  const format = FORMATS[formatId]
  const chooseFormat = (id: FormatId) => {
    setFormatId(id)
    try {
      localStorage.setItem(FORMAT_KEY, id)
    } catch {
      // Storage can be unavailable (private mode); the choice just isn't remembered.
    }
  }

  const csv = () => format.toCsv(rows, tokens)
  const report = () =>
    buildReport({ wallets: analysis.wallets, stats, rows, tokens, missing: analysis.missing, generatedAt: analysis.finishedAt, format: formatId, stakingIncomplete: analysis.stakingIncomplete })

  return (
    <div className="results">
      {analysis.sample && (
        <p className="sample-note">
          <strong>Sample wallet.</strong> These are made-up transactions shaped like real Jupiter, pump.fun, DCA and limit-order
          activity, run through the same engine as your real history. Paste your own address above to analyse it.
        </p>
      )}
      <h3>{analysis.sample ? 'Sample history, cleaned' : 'Your history, cleaned'}</h3>
      <div className="stats">
        <Stat value={stats.transactions} label="transactions read" />
        <Stat value={stats.byKind.swap} label="swaps, one row each" />
        <Stat value={stats.byKind.deposit + stats.byKind.withdrawal} label="deposits and withdrawals" />
        <Stat value={stats.byKind.fee} label="fee-only rows" />
        <Stat value={stats.needsReview} label="to check by hand" />
      </div>
      {analysis.missing.length > 0 && (
        <p className="warn">
          {analysis.missing.length} transaction(s) could not be fetched. Run the analysis again (cached ones are instant) or use another RPC endpoint.
        </p>
      )}

      {analysis.stakingIncomplete && (
        <p className="warn">
          Some staking rewards could not be read from the RPC endpoint. Run the analysis again, or use your own RPC URL under "Advanced", to include them.
        </p>
      )}

      <Preview rows={rows} tokens={tokens} sample={analysis.sample} />

      <TokenNames tokens={tokens} onChange={onTokensChange} />

      {review.length > 0 && (
        <details className="review-list">
          <summary>{review.length} transaction(s) to check by hand</summary>
          <p className="muted small">These move more than two assets at once, such as adding liquidity. They are exported one row per asset with the same TxHash.</p>
          <ul>
            {review.slice(0, 50).map((sig) => (
              <li key={sig}>
                <a className="mono" href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">
                  {sig.slice(0, 20)}…
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="download card inset">
        <h4>Download</h4>
        <div className="format-picker" role="radiogroup" aria-label="Tax tool">
          <span className="muted small">Format for:</span>
          {FORMAT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === formatId}
              className={id === formatId ? 'chip on' : 'chip'}
              onClick={() => chooseFormat(id)}
            >
              {FORMATS[id].name}
            </button>
          ))}
        </div>
        {analysis.sample ? (
          <>
            <p>The sample CSV is free. Import it into a test wallet in {format.name} to see how clean rows look before you analyse your own.</p>
            <div className="actions">
              <button className="primary" onClick={() => download(`sample-${format.filename}`, csv(), 'text/csv')}>
                Download sample CSV
              </button>
              <button className="secondary" onClick={() => download('sample-report.html', reportToHtml(report()), 'text/html')}>
                Download sample report
              </button>
            </div>
          </>
        ) : unlocked ? (
          <>
            <p>Unlocked. Thank you! Import the CSV as one wallet in {format.name}; the report explains each step.</p>
            <div className="actions">
              <button className="primary" onClick={() => download(format.filename, csv(), 'text/csv')}>
                Download {format.filename}
              </button>
              <button className="secondary" onClick={() => download('report.html', reportToHtml(report()), 'text/html')}>
                Download report
              </button>
            </div>
          </>
        ) : (
          <Payment wallets={analysis.wallets} rpc={analysis.rpc} onUnlocked={unlock} />
        )}
      </div>
    </div>
  )
}

const FORMAT_KEY = 'stc-format'

function savedFormat(): FormatId {
  try {
    const v = localStorage.getItem(FORMAT_KEY)
    if (v && v in FORMATS) return v as FormatId
  } catch {
    // Fall through to the default.
  }
  return 'koinly'
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  )
}

type Filter = 'all' | 'swap' | 'transfer' | 'fee' | 'staking' | 'review'

const FILTERS: Array<{ id: Filter; name: string; match: (r: Row) => boolean }> = [
  { id: 'all', name: 'All', match: () => true },
  { id: 'swap', name: 'Swaps', match: (r) => r.kind === 'swap' },
  { id: 'transfer', name: 'Deposits & withdrawals', match: (r) => (r.kind === 'deposit' || r.kind === 'withdrawal') && r.tag !== 'staking' },
  { id: 'fee', name: 'Fees', match: (r) => r.kind === 'fee' },
  { id: 'staking', name: 'Staking', match: (r) => r.tag === 'staking' },
  { id: 'review', name: 'To check', match: (r) => r.needsReview },
]

/** The row preview: filter by type, and page through every row without downloading. */
function Preview({ rows, tokens, sample }: { rows: Row[]; tokens: Map<string, TokenInfo>; sample?: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PREVIEW_ROWS)
  const counts = useMemo(() => new Map(FILTERS.map((f) => [f.id, rows.filter(f.match).length])), [rows])
  const shown = useMemo(() => rows.filter(FILTERS.find((f) => f.id === filter)!.match), [rows, filter])
  const visible = shown.slice(0, limit)
  const choose = (id: Filter) => {
    setFilter(id)
    setLimit(PREVIEW_ROWS)
  }

  return (
    <>
      <div className="preview-head">
        <h4>Preview</h4>
        <div className="format-picker filters" role="radiogroup" aria-label="Show rows">
          {FILTERS.filter((f) => f.id === 'all' || f.id === filter || counts.get(f.id)).map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={f.id === filter} className={f.id === filter ? 'chip on' : 'chip'} onClick={() => choose(f.id)}>
              {f.name} <span className="count">{counts.get(f.id)!.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap rows-table">
        <table>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>Type</th>
              <th>Sent</th>
              <th>Received</th>
              <th>Fee</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={`${r.signature}-${i}`} className={r.needsReview ? 'review' : undefined}>
                <td className="nowrap" data-label="Date">{formatDate(r.blockTime)}</td>
                <td data-label="Type">
                  <span className={`kind kind-${kindClass(r)}`}>{label(r)}</span>
                </td>
                <td data-label="Sent">{leg(r.sent, tokens)}</td>
                <td data-label="Received">{leg(r.received, tokens)}</td>
                <td data-label="Fee">{r.fee ? `${formatAmount(r.fee, 9)} SOL` : ''}</td>
                <td data-label="Tx">
                  {sample || r.tag === 'staking' ? (
                    <span className="muted">{sample ? 'sample' : 'reward'}</span>
                  ) : (
                    <a href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noreferrer">
                      {r.signature.slice(0, 6)}…
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="preview-foot">
        <span className="muted small">
          Showing {visible.length.toLocaleString()} of {shown.length.toLocaleString()} {filter === 'all' ? 'rows' : 'matching rows'}
        </span>
        {shown.length > visible.length && (
          <button type="button" className="secondary small-btn" onClick={() => setLimit((n) => n + 100)}>
            Show {Math.min(100, shown.length - visible.length).toLocaleString()} more
          </button>
        )}
      </div>
    </>
  )
}

function kindClass(r: Row): string {
  if (r.tag === 'staking') return 'staking'
  if (r.kind === 'complex') return 'review'
  return r.kind
}

function label(r: Row): string {
  if (r.tag === 'staking') return 'Staking reward'
  if (r.kind === 'complex') return 'Check'
  if (r.kind === 'fee') return r.note?.startsWith('Failed') ? 'Failed (fee)' : 'Fee'
  return r.kind[0].toUpperCase() + r.kind.slice(1)
}

function leg(l: Row['sent'], tokens: Map<string, TokenInfo>): string {
  if (!l) return ''
  const t = tokens.get(l.mint)
  return `${groupDigits(formatAmount(l.amount, t?.decimals ?? (l.mint === SOL ? 9 : 0)))} ${t?.symbol ?? l.mint.slice(0, 4)}`
}

function TokenNames({ tokens, onChange }: { tokens: Map<string, TokenInfo>; onChange: (t: Map<string, TokenInfo>) => void }) {
  const flagged = ambiguousTokens(tokens)
  const [open, setOpen] = useState(false)
  if (tokens.size <= 1) return null
  const entries = [...tokens.entries()].filter(([, t]) => t.source !== 'builtin')

  const rename = (mint: string, symbol: string) => {
    const overrides = { ...loadOverrides(), [mint]: symbol }
    if (!symbol.trim()) delete overrides[mint]
    saveOverrides(overrides)
    const next = new Map(tokens)
    const t = next.get(mint)
    if (t) next.set(mint, { ...t, symbol: symbol.trim() || t.symbol, source: symbol.trim() ? 'user' : t.source })
    onChange(next)
  }

  return (
    <details className="tokens" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        Token names ({entries.length}){flagged.length ? ` — ${flagged.length} to double-check` : ''}
      </summary>
      <p className="muted small">Tax tools match tokens by ticker. Fix any ticker here before downloading; the mint address is also written into each row.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th>Mint</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([mint, t]) => (
              <tr key={mint} className={flagged.some((f) => f.mint === mint) ? 'review' : undefined}>
                <td>
                  <input aria-label={`Ticker for ${mint}`} defaultValue={t.symbol} onBlur={(e) => e.target.value !== t.symbol && rename(mint, e.target.value)} />
                </td>
                <td>{t.name ?? ''}</td>
                <td className="mono small">{mint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
