import { useCallback, useRef, useState } from 'react'
import { collectDecimals, processHistory, type Result } from '../engine'
import { makeCache } from '../rpc/cache'
import { makeClient, type RpcClient } from '../rpc/client'
import { fetchHistory, type Progress } from '../rpc/history'
import { resolveTokens, type TokenInfo } from '../rpc/tokens'

export interface Analysis extends Result {
  wallets: string[]
  tokens: Map<string, TokenInfo>
  missing: string[]
  rpc: RpcClient
  finishedAt: Date
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'running'; progress: Progress }
  | { status: 'done'; analysis: Analysis }
  | { status: 'error'; message: string }

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' })
  const abort = useRef<AbortController | null>(null)

  const start = useCallback(async (wallets: string[], rpcUrl?: string) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const initial: Progress = { phase: 'accounts', addressesDone: 0, addressesTotal: 0, signatures: 0, txDone: 0, txTotal: 0 }
    setState({ status: 'running', progress: initial })
    try {
      const rpc = makeClient(rpcUrl || undefined)
      const history = await fetchHistory(rpc, wallets, {
        cache: makeCache(),
        signal: ctrl.signal,
        onProgress: (progress) => {
          if (!ctrl.signal.aborted) setState({ status: 'running', progress })
        },
      })
      const result = processHistory(history.txs, wallets, history.estate)
      const tokens = await resolveTokens(rpc, collectDecimals(history.txs))
      if (ctrl.signal.aborted) return
      setState({
        status: 'done',
        analysis: { ...result, wallets, tokens, missing: history.missing, rpc, finishedAt: new Date() },
      })
    } catch (e) {
      if (ctrl.signal.aborted) {
        setState({ status: 'idle' })
        return
      }
      const message = e instanceof Error ? e.message : String(e)
      setState({ status: 'error', message: friendlyError(message) })
    }
  }, [])

  const cancel = useCallback(() => {
    abort.current?.abort()
    setState({ status: 'idle' })
  }, [])

  const updateTokens = useCallback((tokens: Map<string, TokenInfo>) => {
    setState((s) => (s.status === 'done' ? { status: 'done', analysis: { ...s.analysis, tokens } } : s))
  }, [])

  return { state, start, cancel, updateTokens }
}

function friendlyError(message: string): string {
  if (/HTTP 429|HTTP 403|Failed to fetch|NetworkError/i.test(message)) {
    return `The RPC endpoint refused or limited the requests (${message}). Wait a minute and try again, or paste a free RPC URL from a provider such as Helius under "Advanced".`
  }
  return message
}
