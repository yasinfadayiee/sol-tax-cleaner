import { describe, expect, it } from 'vitest'
import { usdLabel } from '../src/ui/useSolPrice'

describe('USD price label', () => {
  it('rounds to whole dollars and stays empty without a price', () => {
    expect(usdLabel('0.25', 187.4)).toBe('≈ $47')
    expect(usdLabel('0.25', null)).toBe('')
  })
})
