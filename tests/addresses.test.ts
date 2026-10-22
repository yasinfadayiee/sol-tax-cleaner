import { base58 } from '@scure/base'
import { describe, expect, it } from 'vitest'
import { NATIVE_MINT } from '../src/engine/types'
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from '../src/rpc/client'
import { METAPLEX_PROGRAM } from '../src/rpc/tokens'

// A mistyped program ID is only caught by a real RPC ("String is the wrong size"), so check them here.
describe('hard-coded addresses', () => {
  it.each([
    ['token program', TOKEN_PROGRAM],
    ['token-2022 program', TOKEN_2022_PROGRAM],
    ['metaplex program', METAPLEX_PROGRAM],
    ['native mint', NATIVE_MINT],
  ])('%s decodes to 32 bytes', (_, address) => {
    expect(base58.decode(address)).toHaveLength(32)
  })
})
