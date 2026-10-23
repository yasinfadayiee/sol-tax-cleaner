import { useCallback, useRef, useState } from 'react'
import { SAMPLE_TOKENS, SAMPLE_WALLET, sampleResult } from '../demo/sample'
import { collectDecimals, processHistory, withExtraRows, type Result } from '../engine'
import { makeCache } from '../rpc/cache'
import { makeClient, type RpcClient } from '../rpc/client'
import { fetchHistory, type Progress } from '../rpc/history'
import { fetchStakingRewards } from '../rpc/staking'
import { resolveTokens, type TokenInfo } from '../rpc/tokens'

export interface Analysis extends Result {
  wallets: string[]
  tokens: Map<string, TokenInfo>
  missing: string[]
  rpc: RpcClient
  finishedAt: Date
  /** Some staking rewards could not be read from the RPC. */
  stakingIncomplete?: boolean
  /** True for the built-in sample wallet: no payment, free download. */
  sample?: boolean
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'running'; progress: Progress }
  | { status: 'done'; analysis: Analysis }
  /** rpcBlocked: the endpoint refused us outright, so the visitor needs their own RPC URL to continue. */
  | { status: 'error'; message: string; rpcBlocked?: boolean }

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
      const base = processHistory(history.txs, wallets, history.estate)
      // Rewards come from extra RPC calls; if they fail, keep the transaction rows and say what's missing.
      const rewards = await fetchStakingRewards(rpc, history.txs, base.estate, {
        signal: ctrl.signal,
        onProgress: ({ epochsDone, epochsTotal }) => {
          if (!ctrl.signal.aborted) {
            setState({
              status: 'running',
              progress: { phase: 'staking', addressesDone: 0, addressesTotal: 0, signatures: 0, txDone: epochsDone, txTotal: epochsTotal },
            })
          }
        },
      }).catch((e: unknown) => {
        if (ctrl.signal.aborted) throw e
        return { rows: [], failedEpochs: [], failed: true }
      })
      const result = withExtraRows(base, rewards.rows)
      const tokens = await resolveTokens(rpc, collectDecimals(history.txs))
      if (ctrl.signal.aborted) return
      setState({
        status: 'done',
        analysis: {
          ...result,
          wallets,
          tokens,
          missing: history.missing,
          rpc,
          finishedAt: new Date(),
          stakingIncomplete: 'failed' in rewards || rewards.failedEpochs.length > 0,
        },
      })
    } catch (e) {
      if (ctrl.signal.aborted) {
        setState({ status: 'idle' })
        return
      }
      const message = e instanceof Error ? e.message : String(e)
      setState({ status: 'error', message: friendlyError(message), rpcBlocked: isBlocked(message) })
    }
  }, [])

  const startSample = useCallback(() => {
    abort.current?.abort()
    setState({
      status: 'done',
      analysis: {
        ...sampleResult(),
        wallets: [SAMPLE_WALLET],
        tokens: new Map(SAMPLE_TOKENS),
        missing: [],
        rpc: makeClient(),
        finishedAt: new Date(),
        sample: true,
      },
    })
  }, [])

  const cancel = useCallback(() => {
    abort.current?.abort()
    setState({ status: 'idle' })
  }, [])

  const updateTokens = useCallback((tokens: Map<string, TokenInfo>) => {
    setState((s) => (s.status === 'done' ? { status: 'done', analysis: { ...s.analysis, tokens } } : s))
  }, [])

  return { state, start, startSample, cancel, updateTokens }
}

/** The public Solana endpoint answers browser requests with 403 "Access forbidden"; CORS failures look like this too. */
export function isBlocked(message: string): boolean {
  return /HTTP 403|Access forbidden|Request blocked|Failed to fetch|NetworkError|Load failed/i.test(message)
}

function friendlyError(message: string): string {
  if (isBlocked(message)) {
    return `The RPC endpoint refused the request (${message}).`
  }
  if (/HTTP 429/i.test(message)) {
    return `The RPC endpoint refused or limited the requests (${message}). Wait a minute and try again, or paste a free RPC URL from a provider such as Helius under "Advanced".`
  }
  return message
}
