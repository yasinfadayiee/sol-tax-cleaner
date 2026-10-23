// A made-up wallet whose transactions are shaped like real Jupiter, pump.fun, DCA and staking activity. The demo runs these
// through the real engine, so what visitors see is exactly what the export does, without touching the network.
import { processHistory, withExtraRows, type Result } from '../engine'
import { STAKE_PROGRAM } from '../engine/deltas'
import { SOL, type ParsedInstruction, type RpcTransaction, type Row, type TokenBalance } from '../engine/types'
import type { TokenInfo } from '../rpc/tokens'

export const SAMPLE_WALLET = 'SampLeWaLLet8xQ3vKz5RtYp2mNcHdJ7fGbEaU4sTw9'
const W = SAMPLE_WALLET
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
const JUP = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
const MEME = 'CATz9vQmN4rB7xKp2LdW8sYhT3eFgJ5uVcA6nR1oPump'
const RENT = 2_039_280
const SOL1 = 1_000_000_000
const ORDER_RENT = 2_540_000
const DCA_PROGRAM = 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M'
const LIMIT_PROGRAM = 'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X'
const STAKE_ACCOUNT = 'SampLeStake4hQ2vNz8RtYp5mKcHdJ3fGbEaU7sTw1'
const STAKE_RENT = 2_282_880

export const SAMPLE_TOKENS = new Map<string, TokenInfo>([
  [SOL, { symbol: 'SOL', name: 'Solana', decimals: 9, source: 'builtin' }],
  [USDC, { symbol: 'USDC', name: 'USD Coin', decimals: 6, source: 'builtin' }],
  [BONK, { symbol: 'BONK', name: 'Bonk', decimals: 5, source: 'metaplex' }],
  [JUP, { symbol: 'JUP', name: 'Jupiter', decimals: 6, source: 'metaplex' }],
  [MEME, { symbol: 'CATZ', name: 'Catz (sample memecoin)', decimals: 6, source: 'token-2022' }],
])

interface Acct {
  key: string
  pre: number
  post: number
}
interface Tok {
  account: string
  mint: string
  owner?: string
  amount: string
  decimals: number
}

let n = 0
function tx(
  day: string,
  accounts: Acct[],
  pre: Tok[] = [],
  post: Tok[] = [],
  fee = 5000,
  err: unknown = null,
  instructions?: ParsedInstruction[],
): RpcTransaction {
  const keys = accounts.map((a) => a.key)
  const bal = (toks: Tok[]): TokenBalance[] =>
    toks.map((t) => ({
      accountIndex: keys.indexOf(t.account),
      mint: t.mint,
      owner: t.owner,
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      uiTokenAmount: { amount: t.amount, decimals: t.decimals },
    }))
  n++
  return {
    slot: 290_000_000 + n * 1000,
    blockTime: Math.floor(Date.parse(day) / 1000),
    meta: {
      err,
      fee,
      preBalances: accounts.map((a) => a.pre),
      postBalances: accounts.map((a) => a.post),
      preTokenBalances: bal(pre),
      postTokenBalances: bal(post),
    },
    transaction: {
      signatures: [`sample${String(n).padStart(2, '0')}${'x'.repeat(78)}`],
      message: { accountKeys: keys.map((pubkey, i) => ({ pubkey, signer: i === 0, writable: true, source: 'transaction' })), instructions },
    },
  }
}

function sampleTxs(): RpcTransaction[] {
  n = 0
  let sol = 0
  const move = (d: number) => {
    const pre = sol
    sol += d
    return { key: W, pre, post: sol }
  }
  return [
    // 5 SOL arrives from an exchange.
    tx('2025-01-08T14:02:11Z', [{ key: 'ExchangeHot', pre: 900 * SOL1, post: 895 * SOL1 - 5000 }, move(5 * SOL1)]),
    // Jupiter swap 1 SOL → 186 USDC, opening a USDC account (rent goes into an account the wallet owns).
    tx(
      '2025-01-09T09:15:40Z',
      [move(-SOL1 - RENT - 12_000), { key: 'UsdcAta', pre: 0, post: RENT }, { key: 'Pool', pre: 4e12, post: 4e12 + SOL1 }],
      [{ account: 'Pool', mint: USDC, owner: 'PoolAuth', amount: '900000000000', decimals: 6 }],
      [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '186420000', decimals: 6 },
        { account: 'Pool', mint: USDC, owner: 'PoolAuth', amount: '899813580000', decimals: 6 },
      ],
      12_000,
    ),
    // Set up a Jupiter DCA order: 60 USDC moves into a vault owned by the new DCA order account.
    tx(
      '2025-01-11T20:41:13Z',
      [
        move(-RENT - ORDER_RENT - 5000),
        { key: 'UsdcAta', pre: RENT, post: RENT },
        { key: 'DcaVault', pre: 0, post: RENT },
        { key: 'DcaPda', pre: 0, post: ORDER_RENT },
        { key: DCA_PROGRAM, pre: 1, post: 1 },
      ],
      [{ account: 'UsdcAta', mint: USDC, owner: W, amount: '186420000', decimals: 6 }],
      [
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '126420000', decimals: 6 },
        { account: 'DcaVault', mint: USDC, owner: 'DcaPda', amount: '60000000', decimals: 6 },
      ],
    ),
    // Jupiter DCA fills: USDC → JUP delivered straight into the JUP token account (the wallet itself never signs).
    ...[0, 1, 2].map((i) =>
      tx(
        `2025-01-${12 + i * 7}T03:00:0${i}Z`,
        [
          { key: 'DcaKeeper', pre: 50 * SOL1, post: 50 * SOL1 - 5000 },
          { key: 'DcaVault', pre: RENT, post: RENT },
          { key: 'JupAta', pre: RENT, post: RENT },
          { key: 'DcaPda', pre: ORDER_RENT, post: ORDER_RENT },
          { key: DCA_PROGRAM, pre: 1, post: 1 },
        ],
        [
          { account: 'DcaVault', mint: USDC, owner: 'DcaPda', amount: `${60_000_000 - i * 20_000_000}`, decimals: 6 },
          { account: 'JupAta', mint: JUP, owner: W, amount: `${i * 24_100_000}`, decimals: 6 },
        ],
        [
          { account: 'DcaVault', mint: USDC, owner: 'DcaPda', amount: `${40_000_000 - i * 20_000_000}`, decimals: 6 },
          { account: 'JupAta', mint: JUP, owner: W, amount: `${(i + 1) * 24_100_000}`, decimals: 6 },
        ],
      ),
    ),
    // pump.fun-style buy: 0.5 SOL for CATZ, new token account rent netted out.
    tx(
      '2025-02-03T18:44:02Z',
      [move(-SOL1 / 2 - 5_000_000 - RENT - 5000), { key: 'CatzAta', pre: 0, post: RENT }, { key: 'Curve', pre: 80 * SOL1, post: 80.5 * SOL1 }, { key: 'FeeRecipient', pre: 1, post: 5_000_001 }],
      [],
      [{ account: 'CatzAta', mint: MEME, owner: W, amount: '3512000000000', decimals: 6 }],
    ),
    // A failed swap still costs the network fee.
    tx('2025-02-03T18:44:30Z', [move(-5000)], [], [], 5000, { InstructionError: [2, { Custom: 6001 }] }),
    // Sell all CATZ for 0.83 SOL and close the account: the rent refund is not income.
    tx(
      '2025-02-11T07:21:55Z',
      [move(0.83 * SOL1 + RENT - 7000), { key: 'CatzAta', pre: RENT, post: 0 }, { key: 'Curve', pre: 95 * SOL1, post: 94.17 * SOL1 }],
      [{ account: 'CatzAta', mint: MEME, owner: W, amount: '3512000000000', decimals: 6 }],
      [],
      7000,
    ),
    // Jupiter swap 0.4 SOL → BONK.
    tx(
      '2025-03-02T12:10:19Z',
      [move(-0.4 * SOL1 - RENT - 9000), { key: 'BonkAta', pre: 0, post: RENT }, { key: 'Pool2', pre: 3e12, post: 3e12 + 0.4 * SOL1 }],
      [{ account: 'Pool2', mint: BONK, owner: 'PoolAuth2', amount: '9000000000000000', decimals: 5 }],
      [
        { account: 'BonkAta', mint: BONK, owner: W, amount: '312500000000', decimals: 5 },
        { account: 'Pool2', mint: BONK, owner: 'PoolAuth2', amount: '8999687500000000', decimals: 5 },
      ],
      9000,
    ),
    // Place a limit order: the BONK moves into an escrow owned by the new order account.
    tx(
      '2025-03-15T08:12:31Z',
      [
        move(-RENT - ORDER_RENT - 5000),
        { key: 'BonkAta', pre: RENT, post: RENT },
        { key: 'OrderEscrow', pre: 0, post: RENT },
        { key: 'LimitPda', pre: 0, post: ORDER_RENT },
        { key: LIMIT_PROGRAM, pre: 1, post: 1 },
      ],
      [{ account: 'BonkAta', mint: BONK, owner: W, amount: '312500000000', decimals: 5 }],
      [
        { account: 'BonkAta', mint: BONK, owner: W, amount: '0', decimals: 5 },
        { account: 'OrderEscrow', mint: BONK, owner: 'LimitPda', amount: '312500000000', decimals: 5 },
      ],
    ),
    // Limit order fill: BONK sold for USDC by a keeper, landing in the USDC account.
    tx(
      '2025-03-20T22:03:47Z',
      [
        { key: 'LimitKeeper', pre: 20 * SOL1, post: 20 * SOL1 - 5000 },
        { key: 'BonkAta', pre: RENT, post: RENT },
        { key: 'UsdcAta', pre: RENT, post: RENT },
        { key: 'OrderEscrow', pre: RENT, post: RENT },
        { key: 'LimitPda', pre: ORDER_RENT, post: ORDER_RENT },
        { key: LIMIT_PROGRAM, pre: 1, post: 1 },
      ],
      [
        { account: 'OrderEscrow', mint: BONK, owner: 'LimitPda', amount: '312500000000', decimals: 5 },
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '126420000', decimals: 6 },
      ],
      [
        { account: 'OrderEscrow', mint: BONK, owner: 'LimitPda', amount: '0', decimals: 5 },
        { account: 'UsdcAta', mint: USDC, owner: W, amount: '213970000', decimals: 6 },
      ],
    ),
    // Stake 2 SOL with a validator: a new stake account the wallet controls, so only the fee is a cost.
    tx(
      '2025-03-24T16:05:12Z',
      [move(-2 * SOL1 - STAKE_RENT - 5000), { key: STAKE_ACCOUNT, pre: 0, post: 2 * SOL1 + STAKE_RENT }],
      [],
      [],
      5000,
      null,
      [
        {
          program: 'system',
          programId: '11111111111111111111111111111111',
          parsed: { type: 'createAccount', info: { source: W, newAccount: STAKE_ACCOUNT, owner: STAKE_PROGRAM, lamports: 2 * SOL1 + STAKE_RENT } },
        },
      ],
    ),
    // Send 1 SOL back to the exchange.
    tx('2025-04-02T10:30:00Z', [move(-SOL1 - 5000), { key: 'ExchangeDeposit', pre: 2 * SOL1, post: 3 * SOL1 }]),
  ]
}

// Epoch rewards arrive without a transaction; the live analyser reads them with getInflationReward.
const sampleRewards = (): Row[] =>
  [
    ['2025-04-06T11:20:00Z', 755, 1_384_210],
    ['2025-04-08T23:41:00Z', 756, 1_391_870],
  ].map(([day, epoch, lamports]) => ({
    signature: `staking-reward-${STAKE_ACCOUNT}-epoch-${epoch}`,
    blockTime: Math.floor(Date.parse(day as string) / 1000),
    kind: 'deposit',
    received: { mint: SOL, amount: BigInt(lamports) },
    tag: 'staking',
    needsReview: false,
    note: `Staking reward, epoch ${epoch}, stake account ${STAKE_ACCOUNT}`,
  }))

export function sampleResult(): Result {
  return withExtraRows(processHistory(sampleTxs(), [W]), sampleRewards())
}
