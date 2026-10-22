import { describe, expect, it } from 'vitest'
import { processHistory } from '../src/engine'
import { SOL } from '../src/engine/types'
import { tx, W } from './helpers'

const LIMIT_V2 = 'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X'
const DCA = 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M'
const NATIVE = 'So11111111111111111111111111111111111111112'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const JUP = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
const RENT = 2_039_280
const ORDER_RENT = 2_540_000
const FEE = 19_117
const KEEPER = 'Keeper1111111111111111111111111111111111111'

// Shaped after a real limit-order v2 order: 0.13 SOL wrapped into an escrow owned by the new order account.
const place = tx({
  fee: FEE,
  accounts: [
    { key: W, pre: 1_000_000_000, post: 1_000_000_000 - 130_000_000 - RENT - ORDER_RENT - FEE },
    { key: 'Order', pre: 0, post: ORDER_RENT },
    { key: 'Escrow', pre: 0, post: RENT + 130_000_000 },
    { key: LIMIT_V2, pre: 1, post: 1 },
  ],
  post: [{ account: 'Escrow', mint: NATIVE, owner: 'Order', amount: '130000000', decimals: 9 }],
})

// A keeper fills it: the escrow and order account close (rent back to the user) and USDC lands in the user's account.
const fill = tx({
  accounts: [
    { key: KEEPER, pre: 50_000_000_000, post: 50_000_000_000 - 5000 },
    { key: W, pre: 1_000_000_000 - 130_000_000 - RENT - ORDER_RENT - FEE, post: 1_000_000_000 - 130_000_000 - FEE },
    { key: 'Order', pre: ORDER_RENT, post: 0 },
    { key: 'Escrow', pre: RENT + 130_000_000, post: 0 },
    { key: 'UserUsdc', pre: RENT, post: RENT },
    { key: 'Pool', pre: 1, post: 130_000_001 },
    { key: LIMIT_V2, pre: 1, post: 1 },
  ],
  pre: [
    { account: 'Escrow', mint: NATIVE, owner: 'Order', amount: '130000000', decimals: 9 },
    { account: 'UserUsdc', mint: USDC, owner: W, amount: '0' },
  ],
  post: [{ account: 'UserUsdc', mint: USDC, owner: W, amount: '24500000' }],
})

describe('Jupiter limit orders and DCA', () => {
  it('placing an order is fee-only and the keeper fill is one swap', () => {
    const { rows, estate } = processHistory([place, fill], [W])
    expect([...estate.escrowAccounts].sort()).toEqual(['Escrow', 'Order'])
    expect(rows.map((r) => r.kind)).toEqual(['fee', 'swap'])
    expect(rows[1].sent).toEqual({ mint: SOL, amount: 130_000_000n })
    expect(rows[1].received).toEqual({ mint: USDC, amount: 24_500_000n })
  })

  it('cancelling returns the funds as a fee-only move', () => {
    const cancel = tx({
      accounts: [
        { key: W, pre: 1_000_000_000 - 130_000_000 - RENT - ORDER_RENT - FEE, post: 1_000_000_000 - FEE - 5000 },
        { key: 'Order', pre: ORDER_RENT, post: 0 },
        { key: 'Escrow', pre: RENT + 130_000_000, post: 0 },
        { key: LIMIT_V2, pre: 1, post: 1 },
      ],
      pre: [{ account: 'Escrow', mint: NATIVE, owner: 'Order', amount: '130000000', decimals: 9 }],
    })
    expect(processHistory([place, cancel], [W]).rows.map((r) => r.kind)).toEqual(['fee', 'fee'])
  })

  it('DCA: the deposit into the vault is internal, fills are swaps, the output vault is found later', () => {
    const open = tx({
      accounts: [
        { key: W, pre: 1_000_000_000, post: 1_000_000_000 - RENT - ORDER_RENT - 5000 },
        { key: 'UserUsdc', pre: RENT, post: RENT },
        { key: 'DcaPda', pre: 0, post: ORDER_RENT },
        { key: 'InVault', pre: 0, post: RENT },
        { key: DCA, pre: 1, post: 1 },
      ],
      pre: [{ account: 'UserUsdc', mint: USDC, owner: W, amount: '60000000' }],
      post: [
        { account: 'UserUsdc', mint: USDC, owner: W, amount: '0' },
        { account: 'InVault', mint: USDC, owner: 'DcaPda', amount: '60000000' },
      ],
    })
    // The output vault never appeared in a transaction the user signed; it is recognised by its owner.
    const fill1 = tx({
      accounts: [
        { key: KEEPER, pre: 50_000_000_000, post: 50_000_000_000 - 5000 },
        { key: 'DcaPda', pre: ORDER_RENT, post: ORDER_RENT },
        { key: 'InVault', pre: RENT, post: RENT },
        { key: 'OutVault', pre: RENT, post: RENT },
        { key: DCA, pre: 1, post: 1 },
      ],
      pre: [
        { account: 'InVault', mint: USDC, owner: 'DcaPda', amount: '60000000' },
        { account: 'OutVault', mint: JUP, owner: 'DcaPda', amount: '0' },
      ],
      post: [
        { account: 'InVault', mint: USDC, owner: 'DcaPda', amount: '30000000' },
        { account: 'OutVault', mint: JUP, owner: 'DcaPda', amount: '50000000' },
      ],
    })
    const { rows, estate } = processHistory([open, fill1], [W])
    expect(estate.escrowAccounts.has('OutVault')).toBe(true)
    expect(rows.map((r) => r.kind)).toEqual(['fee', 'swap'])
    expect(rows[1].sent).toEqual({ mint: USDC, amount: 30_000_000n })
    expect(rows[1].received).toEqual({ mint: JUP, amount: 50_000_000n })
  })

  it('ignores order accounts of orders the user did not place', () => {
    const someoneElse = tx({
      accounts: [
        { key: 'Other', pre: 1_000_000_000, post: 1_000_000_000 - ORDER_RENT - RENT - 5000 },
        { key: 'Order2', pre: 0, post: ORDER_RENT },
        { key: 'Escrow2', pre: 0, post: RENT },
        { key: W, pre: 5, post: 5 },
        { key: LIMIT_V2, pre: 1, post: 1 },
      ],
      post: [{ account: 'Escrow2', mint: USDC, owner: 'Order2', amount: '1' }],
    })
    expect(processHistory([someoneElse], [W]).estate.escrowAccounts.size).toBe(0)
  })
})
