import { describe, expect, it } from 'vitest'
import { metadataAddress, parseMetaplexMetadata, findProgramAddress } from '../src/rpc/tokens'
import { base58 } from '@scure/base'

describe('token metadata', () => {
  it('derives the known USDC metadata address', () => {
    expect(metadataAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('5x38Kp4hvdomTCnCrAny4UtMUt5rQBdB6px2K1Ui45Wq')
  })

  it('derives associated token accounts', () => {
    const ata = findProgramAddress(
      [
        base58.decode('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
        base58.decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        base58.decode('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      ],
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    )
    expect(ata).toHaveLength(44)
  })

  it('parses name and symbol from a Metaplex account, stripping padding', () => {
    const enc = new TextEncoder()
    const str = (s: string, pad: number) => {
      const b = enc.encode(s.padEnd(pad, '\0'))
      const len = new Uint8Array(4)
      new DataView(len.buffer).setUint32(0, b.length, true)
      return [...len, ...b]
    }
    const data = Uint8Array.from([4, ...new Uint8Array(64), ...str('Bonk', 32), ...str('Bonk', 10), ...str('https://x', 200)])
    expect(parseMetaplexMetadata(data)).toEqual({ name: 'Bonk', symbol: 'Bonk' })
    expect(parseMetaplexMetadata(new Uint8Array(10))).toBeNull()
  })
})
