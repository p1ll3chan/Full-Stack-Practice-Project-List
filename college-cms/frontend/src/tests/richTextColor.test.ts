import { describe, expect, it } from 'vitest'
import { FALLBACK_TEXT_COLOR, contrastRatio, guardedTextColor, safeColor, toSixDigitHex } from '../components/richTextColor'

describe('safeColor', () => {
  it('accepts hex and plain colour words, trimming whitespace', () => {
    expect(safeColor(' #0e6e5f ')).toBe('#0e6e5f')
    expect(safeColor('teal')).toBe('teal')
  })

  it('rejects anything else', () => {
    expect(safeColor(undefined)).toBeUndefined()
    expect(safeColor('')).toBeUndefined()
    expect(safeColor('javascript:alert(1)')).toBeUndefined()
    expect(safeColor('expression(alert(1))')).toBeUndefined()
  })
})

describe('contrastRatio', () => {
  it('gives 21:1 for black on white and 1:1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('toSixDigitHex', () => {
  it('expands short forms and drops alpha', () => {
    expect(toSixDigitHex('#abc')).toBe('#aabbcc')
    expect(toSixDigitHex('#abcd')).toBe('#aabbcc')
    expect(toSixDigitHex('#0e6e5fff')).toBe('#0e6e5f')
    expect(toSixDigitHex('#12345')).toBeNull()
  })
})

describe('guardedTextColor (3:1 against white)', () => {
  it('returns undefined when there is no usable colour', () => {
    expect(guardedTextColor(undefined)).toBeUndefined()
    expect(guardedTextColor('javascript:alert(1)')).toBeUndefined()
  })

  it('keeps colours that reach 3:1 against white', () => {
    expect(guardedTextColor('#000000')).toBe('#000000')
    expect(guardedTextColor('#0e6e5f')).toBe('#0e6e5f') // about 6.15:1
    expect(guardedTextColor('#767676')).toBe('#767676') // about 4.5:1
  })

  it('falls back to the ink token when contrast is below 3:1', () => {
    expect(guardedTextColor('#ffffff')).toBe(FALLBACK_TEXT_COLOR) // 1:1
    expect(guardedTextColor('#ffff00')).toBe(FALLBACK_TEXT_COLOR) // about 1.1:1
    expect(guardedTextColor('#999')).toBe(FALLBACK_TEXT_COLOR) // about 2.85:1
    expect(guardedTextColor('#abc')).toBe(FALLBACK_TEXT_COLOR) // about 2:1
  })

  it('falls back for colour words, which cannot be verified without a lookup table', () => {
    expect(guardedTextColor('red')).toBe(FALLBACK_TEXT_COLOR)
    expect(guardedTextColor('teal')).toBe(FALLBACK_TEXT_COLOR)
  })
})
