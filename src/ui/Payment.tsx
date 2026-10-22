import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME, MAX_WALLETS, MEMO_PREFIX, MERCHANT_ADDRESS, PRICE_SOL, UNLOCK_DAYS } from '../config'
import { findPayment, memoFor, paymentUrl, rememberUnlock, rememberedUnlock, type PaymentTerms } from '../license/license'
import type { RpcClient } from '../rpc/client'
import { isValidAddress } from '../rpc/history'

const terms: PaymentTerms = {
  merchant: MERCHANT_ADDRESS,
  priceSol: PRICE_SOL,
  memoPrefix: MEMO_PREFIX,
  label: APP_NAME,
  validDays: UNLOCK_DAYS,
}

const POLL_MS = 5000
const POLL_FOR_MS = 3 * 60 * 1000

type Status = 'checking' | 'unpaid' | 'waiting' | 'not-found' | 'error'

export function Payment({ wallets, rpc, onUnlocked }: { wallets: string[]; rpc: RpcClient; onUnlocked: () => void }) {
  const configured = isValidAddress(MERCHANT_ADDRESS)
  const [status, setStatus] = useState<Status>(configured ? 'checking' : 'unpaid')
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const polling = useRef(false)
  const url = configured ? paymentUrl(terms) : ''

  const check = async () => {
    try {
      const sig = await findPayment(rpc, wallets, terms)
      if (sig) {
        rememberUnlock(wallets, sig)
        onUnlocked()
        return true
      }
    } catch {
      setStatus('error')
    }
    return false
  }

  // Previously paid? Unlock immediately if we remember it, otherwise look it up once.
  useEffect(() => {
    if (!configured) return
    if (rememberedUnlock(wallets)) {
      onUnlocked()
      return
    }
    let cancelled = false
    findPayment(rpc, wallets, terms)
      .then((sig) => {
        if (cancelled) return
        if (sig) {
          rememberUnlock(wallets, sig)
          onUnlocked()
        } else setStatus((s) => (s === 'checking' ? 'unpaid' : s))
      })
      .catch(() => !cancelled && setStatus('unpaid'))
    return () => {
      cancelled = true
    }
  }, [configured, wallets, rpc, onUnlocked])

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr, () => setQr(null))
  }, [url])

  const waitForPayment = async () => {
    if (polling.current) return
    polling.current = true
    setStatus('waiting')
    const until = Date.now() + POLL_FOR_MS
    while (Date.now() < until) {
      if (await check()) {
        polling.current = false
        return
      }
      await new Promise((r) => setTimeout(r, POLL_MS))
    }
    polling.current = false
    setStatus('not-found')
  }

  if (!configured) {
    return <p className="warn">Payments are not set up yet on this copy of the site.</p>
  }

  return (
    <div className="payment">
      <p>
        Full export for up to {MAX_WALLETS} wallets, valid {UNLOCK_DAYS} days: <strong>{PRICE_SOL} SOL</strong>, paid once.
      </p>
      {status === 'checking' ? (
        <p className="muted small">Checking for an earlier payment…</p>
      ) : (
        <div className="pay-grid">
          {qr && <img className="qr" src={qr} width={220} height={220} alt="Solana Pay QR code for the payment" />}
          <div>
            <ol className="steps">
              <li>
                Pay <strong>from one of the wallets you just analysed</strong>. That is how the site recognises you; there is no
                account or email.
              </li>
              <li>
                Scan the QR code with Phantom, Solflare or Backpack, or{' '}
                <a href={url} onClick={() => void waitForPayment()}>
                  open the payment in your wallet app
                </a>
                .
              </li>
              <li>The download unlocks automatically, usually within 30 seconds.</li>
            </ol>
            <p className="muted small">
              Paying by hand? Send exactly {PRICE_SOL} SOL to{' '}
              <button
                type="button"
                className="link mono"
                onClick={() => {
                  void navigator.clipboard?.writeText(MERCHANT_ADDRESS).then(() => setCopied(true))
                }}
              >
                {MERCHANT_ADDRESS.slice(0, 6)}…{MERCHANT_ADDRESS.slice(-6)}
              </button>
              {copied ? ' (copied)' : ''} with the memo <code>{memoFor(terms)}</code>.
            </p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void waitForPayment()} disabled={status === 'waiting'}>
                {status === 'waiting' ? 'Waiting for your payment…' : 'I’ve paid, check now'}
              </button>
            </div>
            {status === 'not-found' && (
              <p className="warn">
                No payment found yet. Make sure it came from an analysed wallet, included the memo, and is confirmed, then
                check again.
              </p>
            )}
            {status === 'error' && <p className="warn">Couldn’t reach the RPC endpoint to check. Try again in a moment.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
