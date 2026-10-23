import { describe, expect, it } from 'vitest'
import { SOL, type Row } from '../src/engine/types'
import { csvCell, formatAmount, formatDate, toKoinlyCsv } from '../src/export/koinly'
import { ambiguousTokens, buildReport } from '../src/export/report'
import { processHistory } from '../src/engine'
import type { TokenInfo } from '../src/rpc/tokens'
import { BONK, USDC } from './helpers'

const tokens = new Map<string, TokenInfo>([
  [SOL, { symbol: 'SOL', decimals: 9, source: 'builtin' }],
  [USDC, { symbol: 'USDC', decimals: 6, source: 'builtin' }],
  [BONK, { symbol: 'Bonk', decimals: 5, source: 'metaplex' }],
])

describe('formatAmount', () => {
  it.each([
    [1_000_000_000n, 9, '1'],
    [1n, 9, '0.000000001'],
    [150_000_000n, 6, '150'],
    [123_456_789n, 6, '123.456789'],
    [42n, 0, '42'],
    [10n ** 30n + 5n, 18, '1000000000000.000000000000000005'],
    [-2_500_000n, 6, '-2.5'],
  ])('%s with %i decimals → %s', (amount, decimals, expected) => {
    expect(formatAmount(amount, decimals)).toBe(expected)
  })
})

describe('Koinly CSV', () => {
  it('formats dates in UTC', () => {
    expect(formatDate(1_761_130_000)).toBe('2025-10-22 10:46:40')
  })

  it('quotes cells only when needed', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('writes the exact header and rows', () => {
    const rows: Row[] = [
      {
        signature: 'S1',
        blockTime: 1_761_130_000,
        kind: 'swap',
        sent: { mint: SOL, amount: 1_000_000_000n },
        received: { mint: USDC, amount: 150_000_000n },
        fee: 15_000n,
        tag: '',
        needsReview: false,
      },
      { signature: 'S2', blockTime: 1_761_130_060, kind: 'fee', sent: { mint: SOL, amount: 5000n }, tag: 'cost', needsReview: false, note: 'Failed transaction (network fee only)' },
      { signature: 'S3', blockTime: 1_761_130_120, kind: 'deposit', received: { mint: BONK, amount: 500_000_000_000n }, tag: '', needsReview: false },
    ]
    expect(toKoinlyCsv(rows, tokens).split('\r\n')).toEqual([
      'Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Tag,Description,TxHash',
      '2025-10-22 10:46:40,1,SOL,150,USDC,0.000015,SOL,,,S1',
      '2025-10-22 10:47:40,0.000005,SOL,,,,,cost,Failed transaction (network fee only),S2',
      `2025-10-22 10:48:40,,,5000000,Bonk,,,,Bonk mint ${BONK},S3`,
      '',
    ])
  })
})

describe('report', () => {
  it('flags unknown and duplicate tickers', () => {
    const t = new Map<string, TokenInfo>([
      ['A', { symbol: 'PEPE', decimals: 6, source: 'metaplex' }],
      ['B', { symbol: 'PEPE', decimals: 6, source: 'metaplex' }],
      ['C', { symbol: 'UNKNOWN-C', decimals: 6, source: 'fallback' }],
      [USDC, { symbol: 'USDC', decimals: 6, source: 'builtin' }],
    ])
    expect(ambiguousTokens(t).map((a) => a.mint).sort()).toEqual(['A', 'B', 'C'])
  })

  it('includes summary, import steps and limitations', () => {
    const { rows, stats } = processHistory([], ['W'])
    const md = buildReport({ wallets: ['W'], rows, stats, tokens, missing: ['x'], generatedAt: new Date(0) })
    expect(md).toContain('not tax advice')
    expect(md).toContain('ONE wallet')
    expect(md).toContain('could not be fetched')
  })
})

describe('reportToHtml', () => {
  it('renders the report as a standalone page', async () => {
    const { reportToHtml } = await import('../src/export/reportHtml')
    const html = reportToHtml(
      ['# Title', '', 'Wallets:', '- `W<1>`', '', '| A | B |', '| --- | --- |', '| 1 | 2 |', '', '1. Step one', '2. Step two', '', '- 2025 — https://solscan.io/tx/abc'].join('\n'),
    )
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<ul>\n<li><code>W&lt;1&gt;</code></li>\n</ul>')
    expect(html).toContain('<thead><tr><th>A</th><th>B</th></tr></thead>\n<tbody><tr><td>1</td><td>2</td></tr></tbody>')
    expect(html).toContain('<ol>\n<li>Step one</li>\n<li>Step two</li>\n</ol>')
    expect(html).toContain('<a href="https://solscan.io/tx/abc">solscan.io/tx/abc</a>')
  })
})

describe('groupDigits', () => {
  it('groups the integer part only', async () => {
    const { groupDigits } = await import('../src/ui/format')
    expect(groupDigits('3512000')).toBe('3,512,000')
    expect(groupDigits('1234.567891')).toBe('1,234.567891')
    expect(groupDigits('0.000005')).toBe('0.000005')
    expect(groupDigits('-1000')).toBe('-1,000')
  })
})
