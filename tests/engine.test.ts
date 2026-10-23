import { describe, expect, it } from 'vitest'
import { processHistory } from '../src/engine'
import { newEstate, NATIVE_MINT, SOL, type RpcTransaction } from '../src/engine/types'
import { computeDeltas } from '../src/engine/deltas'
import { BONK, LP, MEME, RENT, USDC, W, W2, tx } from './helpers'

const run = (t: RpcTransaction, wallets = [W]) => processHistory([t], wallets).rows

describe('estate accounting', () => {
  it('Jupiter SOL→USDC through a temporary WSOL account is one swap with no rent rows', () => {
    // Temp WSOL account is created, funded, swapped and closed inside the tx, so it shows no token balances.
    const t = tx({
      accounts: [
        { key: W, pre: 10_000_000_000, post: 10_000_000_000 - 1_000_000_000 - 15_000 },
        { key: 'WsolTmp', pre: 0, post: 0 },
        { key: 'UsdcAta', pre: RENT, post: RENT },
        { key: 'PoolSol', pre: 50_000_000_000, post: 51_000_000_000 },
        { key: 'PoolUsdc', pre: RENT, post: RENT },
      ],
      fee: 15_000,
      pre: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '0' },
        { account: 'PoolUsdc', mint: USDC, owner: 'PoolAuth', amount: '9000000000' },
      ],
      post: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '150000000' },
        { account: 'PoolUsdc', mint: USDC, owner: 'PoolAuth', amount: '8850000000' },
      ],
    })
    expect(run(t)).toEqual([
      expect.objectContaining({
        kind: 'swap',
        sent: { mint: SOL, amount: 1_000_000_000n },
        received: { mint: USDC, amount: 150_000_000n },
        fee: 15_000n,
        needsReview: false,
      }),
    ])
  })

  it('pump.fun buy that opens a new token account does not count the rent as a cost', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 5_000_000_000, post: 5_000_000_000 - 500_000_000 - 5_000_000 - RENT - 5000 },
        { key: 'MemeAta', pre: 0, post: RENT },
        { key: 'Curve', pre: 80_000_000_000, post: 80_500_000_000 },
        { key: 'FeeRecipient', pre: 1, post: 5_000_001 },
      ],
      post: [{ account: 'MemeAta', mint: MEME, owner: W, amount: '1000000000000' }],
    })
    expect(run(t)).toEqual([
      expect.objectContaining({
        kind: 'swap',
        sent: { mint: SOL, amount: 505_000_000n },
        received: { mint: MEME, amount: 1_000_000_000_000n },
        fee: 5000n,
      }),
    ])
  })

  it('closing an empty token account nets out to the network fee only', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 1_000_000_000, post: 1_000_000_000 + RENT - 5000 },
        { key: 'OldAta', pre: RENT, post: 0 },
      ],
      pre: [{ account: 'OldAta', mint: BONK, owner: W, amount: '0', decimals: 5 }],
    })
    expect(run(t)).toEqual([
      expect.objectContaining({ kind: 'fee', sent: { mint: SOL, amount: 5000n }, tag: 'cost' }),
    ])
  })

  it('a failed transaction is a fee-only cost', () => {
    const t = tx({
      accounts: [{ key: W, pre: 1_000_000_000, post: 1_000_000_000 - 5000 }],
      err: { InstructionError: [2, { Custom: 6001 }] },
    })
    const rows = run(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'fee', tag: 'cost', sent: { mint: SOL, amount: 5000n } })
    expect(rows[0].note).toMatch(/Failed/)
  })

  it('a transfer between two of the user’s wallets leaves only the fee', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 2_000_000_000, post: 1_000_000_000 - 5000 },
        { key: W2, pre: 0, post: 1_000_000_000 },
      ],
    })
    expect(run(t, [W, W2])).toEqual([expect.objectContaining({ kind: 'fee', sent: { mint: SOL, amount: 5000n } })])
  })

  it('without the second wallet the same transfer is a withdrawal with the fee attached', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 2_000_000_000, post: 1_000_000_000 - 5000 },
        { key: W2, pre: 0, post: 1_000_000_000 },
      ],
    })
    expect(run(t, [W])).toEqual([
      expect.objectContaining({ kind: 'withdrawal', sent: { mint: SOL, amount: 1_000_000_000n }, fee: 5000n }),
    ])
  })

  it('finds an incoming token transfer that only touches the user’s token account', () => {
    const t = tx({
      accounts: [
        { key: 'Sender', pre: 1_000_000_000, post: 1_000_000_000 - 5000 },
        { key: 'SenderAta', pre: RENT, post: RENT },
        { key: 'UsdcAta', pre: RENT, post: RENT },
      ],
      pre: [
        { account: 'SenderAta', mint: USDC, owner: 'Sender', amount: '9000000' },
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '0' },
      ],
      post: [
        { account: 'SenderAta', mint: USDC, owner: 'Sender', amount: '4000000' },
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '5000000' },
      ],
    })
    const rows = run(t)
    expect(rows).toEqual([expect.objectContaining({ kind: 'deposit', received: { mint: USDC, amount: 5_000_000n } })])
    expect(rows[0].fee).toBeUndefined()
  })

  it('a liquidity add is flagged for review, one row per asset', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 3_000_000_000, post: 2_000_000_000 - 5000 },
        { key: 'UsdcAta', pre: RENT, post: RENT },
        { key: 'LpAta', pre: RENT, post: RENT },
        { key: 'Pool', pre: 1, post: 1_000_000_001 },
      ],
      pre: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '200000000' },
        { account: 'LpAta', mint: LP, owner: W, amount: '0', decimals: 9 },
      ],
      post: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '50000000' },
        { account: 'LpAta', mint: LP, owner: W, amount: '1000', decimals: 9 },
      ],
    })
    const rows = run(t)
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.kind === 'complex' && r.needsReview)).toBe(true)
    expect(rows[0]).toMatchObject({ sent: { mint: SOL, amount: 1_000_000_000n }, fee: 5000n })
    expect(rows.map((r) => r.sent?.mint ?? r.received?.mint)).toEqual([SOL, USDC, LP])
  })

  it('a small extra SOL outflow on a token-for-token swap is folded into the fee', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 1_000_000_000, post: 1_000_000_000 - 2_000_000 - 5000 },
        { key: 'UsdcAta', pre: RENT, post: RENT },
        { key: 'BonkAta', pre: RENT, post: RENT },
        { key: 'Platform', pre: 1, post: 2_000_001 },
      ],
      pre: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '100000000' },
        { account: 'BonkAta', mint: BONK, owner: W, amount: '0', decimals: 5 },
      ],
      post: [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '0' },
        { account: 'BonkAta', mint: BONK, owner: W, amount: '500000000000', decimals: 5 },
      ],
    })
    expect(run(t)).toEqual([
      expect.objectContaining({
        kind: 'swap',
        sent: { mint: USDC, amount: 100_000_000n },
        received: { mint: BONK, amount: 500_000_000_000n },
        fee: 2_005_000n,
        note: 'Small SOL outflow added to fee',
      }),
    ])
  })

  it('a gasless swap that also sends the user a little SOL is a swap plus a small deposit, not a review item', () => {
    // Shaped after a real relayed (gasless) swap: a relayer pays the fee and creates the user's USDC account,
    // and the user's wallet ends up with a little SOL too.
    const t = tx({
      accounts: [
        { key: 'Relayer', pre: 50_000_000, post: 50_000_000 - 15_000 - 2 * 1_488_440 },
        { key: W, pre: 10_000_000, post: 10_000_000 + 1_488_440 },
        { key: 'QiAta', pre: RENT, post: RENT },
        { key: 'UsdcAta', pre: 0, post: 1_488_440 },
      ],
      pre: [{ account: 'QiAta', mint: 'Qi111111', owner: W, amount: '6179206838', decimals: 6 }],
      post: [
        { account: 'QiAta', mint: 'Qi111111', owner: W, amount: '0', decimals: 6 },
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '1986804' },
      ],
    })
    const rows = run(t)
    expect(rows.map((r) => r.kind)).toEqual(['swap', 'deposit'])
    expect(rows[0]).toEqual(
      expect.objectContaining({ sent: { mint: 'Qi111111', amount: 6_179_206_838n }, received: { mint: USDC, amount: 1_986_804n } }),
    )
    expect(rows[1]).toEqual(expect.objectContaining({ received: { mint: SOL, amount: 2_976_880n }, needsReview: false }))
    expect(rows[1].note).toMatch(/alongside the swap/)
  })

  it('a spam airdrop that opens a token account for the user is labelled as such', () => {
    const t = tx({
      accounts: [
        { key: 'Spammer', pre: 9_000_000_000, post: 9_000_000_000 - RENT - 5000 },
        { key: 'SpamAta', pre: 0, post: RENT },
      ],
      post: [{ account: 'SpamAta', mint: 'Spam1111', owner: W, amount: '1000' }],
    })
    const rows = run(t)
    expect(rows.map((r) => r.kind)).toEqual(['deposit', 'deposit'])
    expect(rows.every((r) => /someone else opened/.test(r.note ?? ''))).toBe(true)
  })

  it('wrapping SOL into WSOL is not a trade', () => {
    const t = tx({
      accounts: [
        { key: W, pre: 3_000_000_000, post: 3_000_000_000 - 1_000_000_000 - RENT - 5000 },
        { key: 'WsolAta', pre: 0, post: 1_000_000_000 + RENT },
      ],
      post: [{ account: 'WsolAta', mint: NATIVE_MINT, owner: W, amount: '1000000000', decimals: 9 }],
    })
    expect(run(t)).toEqual([expect.objectContaining({ kind: 'fee', sent: { mint: SOL, amount: 5000n } })])
  })

  it('handles "json" encoding where lookup-table accounts are listed in meta.loadedAddresses', () => {
    const t: RpcTransaction = {
      slot: 1,
      blockTime: 1_760_000_000,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [1_000_000_000, 1, RENT],
        postBalances: [1_000_000_000 - 5000, 1, RENT],
        preTokenBalances: [{ accountIndex: 2, mint: USDC, owner: W, uiTokenAmount: { amount: '0', decimals: 6 } }],
        postTokenBalances: [{ accountIndex: 2, mint: USDC, owner: W, uiTokenAmount: { amount: '7', decimals: 6 } }],
        loadedAddresses: { writable: ['UsdcAta'], readonly: [] },
      },
      transaction: { signatures: ['jsonSig'], message: { accountKeys: [W, 'Program'] } },
    }
    expect(run(t)).toEqual([expect.objectContaining({ kind: 'deposit', received: { mint: USDC, amount: 7n }, fee: 5000n })])
  })

  it('uses previously discovered token accounts for old transactions without an owner field', () => {
    const estate = newEstate([W])
    estate.tokenAccounts.add('OldAta')
    const t = tx({
      accounts: [
        { key: 'Sender', pre: 1_000_000_000, post: 1_000_000_000 - 5000 },
        { key: 'OldAta', pre: RENT, post: RENT },
      ],
      pre: [{ account: 'OldAta', mint: USDC, amount: '0' }],
      post: [{ account: 'OldAta', mint: USDC, amount: '42' }],
    })
    const d = computeDeltas(t, estate)
    expect(d.tokens.get(USDC)).toBe(42n)
  })
})

describe('processHistory', () => {
  it('de-duplicates signatures, sorts by time and counts stats', () => {
    const a = tx({ sig: 'A', blockTime: 200, accounts: [{ key: W, pre: 10, post: 5 }], fee: 5 })
    const b = tx({ sig: 'B', blockTime: 100, accounts: [{ key: W, pre: 20, post: 15 }], fee: 5 })
    const { rows, stats } = processHistory([a, b, a], [W])
    expect(rows.map((r) => r.signature)).toEqual(['B', 'A'])
    expect(stats.transactions).toBe(2)
    expect(stats.byKind.fee).toBe(2)
  })

  it('reconciles: the sum of all rows equals the net change of the estate', () => {
    const txs = [
      tx({ sig: '1', accounts: [{ key: 'X', pre: 9e9, post: 9e9 - 2e9 - 5000 }, { key: W, pre: 0, post: 2e9 }] }),
      tx({
        sig: '2',
        accounts: [
          { key: W, pre: 2e9, post: 2e9 - 1e9 - RENT - 5000 },
          { key: 'UsdcAta', pre: 0, post: RENT },
          { key: 'Pool', pre: 1, post: 1e9 + 1 },
        ],
        post: [{ account: 'UsdcAta', mint: USDC, owner: W, amount: '150000000' }],
      }),
    ]
    const { rows } = processHistory(txs, [W])
    const net = new Map<string, bigint>()
    for (const r of rows) {
      if (r.sent) net.set(r.sent.mint, (net.get(r.sent.mint) ?? 0n) - r.sent.amount)
      if (r.received) net.set(r.received.mint, (net.get(r.received.mint) ?? 0n) + r.received.amount)
      if (r.fee) net.set(SOL, (net.get(SOL) ?? 0n) - r.fee)
    }
    // Wallet ends with 1e9 - RENT - 5000 lamports plus RENT locked in its own token account.
    expect(net.get(SOL)).toBe(1_000_000_000n - 5000n)
    expect(net.get(USDC)).toBe(150_000_000n)
  })
})
