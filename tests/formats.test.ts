import { describe, expect, it } from 'vitest'
import { SAMPLE_TOKENS, sampleResult } from '../src/demo/sample'
import {
  AWAKEN_COLUMNS,
  COINLEDGER_COLUMNS,
  COINTRACKER_COLUMNS,
  FORMATS,
  formatUsDate,
  maxDecimals,
  toAwakenCsv,
  toCoinLedgerCsv,
  toCoinTrackerCsv,
} from '../src/export/formats'
import { buildReport } from '../src/export/report'

const { rows, stats } = sampleResult()
const lines = (csv: string) => csv.trimEnd().split('\r\n')

describe('US date format', () => {
  it('is MM/DD/YYYY HH:MM:SS in UTC', () => {
    expect(formatUsDate(1_761_130_000)).toBe('10/22/2025 10:46:40')
    expect(formatUsDate(Date.parse('2025-01-08T04:02:01Z') / 1000)).toBe('01/08/2025 04:02:01')
  })
})

describe('CoinTracker CSV', () => {
  const csv = lines(toCoinTrackerCsv(rows, SAMPLE_TOKENS))

  it('uses the exact template header', () => {
    expect(csv[0]).toBe(COINTRACKER_COLUMNS.join(','))
    expect(csv).toHaveLength(rows.length + 1)
  })

  it('writes received before sent, with the fee in SOL', () => {
    expect(csv[1]).toBe('01/08/2025 14:02:11,5,SOL,,,,,')
    expect(csv[2]).toBe('01/09/2025 09:15:40,186.42,USDC,1,SOL,0.000012,SOL,')
  })
})

describe('CoinLedger CSV', () => {
  const csv = lines(toCoinLedgerCsv(rows, SAMPLE_TOKENS))

  it('uses the template header', () => {
    expect(csv[0]).toBe(COINLEDGER_COLUMNS.join(','))
  })

  it('leaves Type blank for trades and sets Deposit / Withdrawal / Staking otherwise', () => {
    const types = csv.slice(1).map((l) => l.split(',')[8])
    const rewards = rows.filter((r) => r.tag === 'staking').length
    expect(rewards).toBeGreaterThan(0)
    expect(types.filter((t) => t === '')).toHaveLength(stats.byKind.swap)
    expect(types.filter((t) => t === 'Staking')).toHaveLength(rewards)
    expect(types.filter((t) => t === 'Deposit')).toHaveLength(stats.byKind.deposit - rewards)
    expect(types.filter((t) => t === 'Withdrawal')).toHaveLength(stats.byKind.withdrawal + stats.byKind.fee)
  })

  it('puts sent before received', () => {
    expect(csv[2].startsWith('01/09/2025 09:15:40,Solana,SOL,1,USDC,186.42,SOL,0.000012,,')).toBe(true)
  })
})

describe('Awaken CSV', () => {
  const csv = lines(toAwakenCsv(rows, SAMPLE_TOKENS))

  it('uses the template header', () => {
    expect(csv[0]).toBe(AWAKEN_COLUMNS.join(','))
    expect(csv).toHaveLength(rows.length + 1)
  })

  it('writes received before sent, with the hash', () => {
    expect(csv[2].startsWith('01/09/2025 09:15:40,186.42,USDC,,1,SOL,,0.000012,SOL,sample02')).toBe(true)
  })

  it('never writes more than eight decimals', () => {
    expect(maxDecimals('0.123456789')).toBe('0.12345678')
    expect(maxDecimals('1.500000001')).toBe('1.5')
    expect(maxDecimals('0.000000001')).toBe('0')
    expect(maxDecimals('42')).toBe('42')
    expect(maxDecimals('')).toBe('')
  })
})

describe('report', () => {
  it('names the chosen tool and file', () => {
    const md = buildReport({ wallets: ['w'], stats, rows, tokens: SAMPLE_TOKENS, missing: [], generatedAt: new Date(0), format: 'cointracker' })
    expect(md).toContain('## How to import into CoinTracker')
    expect(md).toContain('cointracker.csv')
    expect(md).not.toContain('Koinly')
  })

  it('every format has a distinct file name', () => {
    expect(new Set(Object.values(FORMATS).map((f) => f.filename)).size).toBe(Object.keys(FORMATS).length)
  })
})
