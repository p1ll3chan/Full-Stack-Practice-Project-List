/** Fallback text colour: the palette ink token, which passes AA on white. */
export const FALLBACK_TEXT_COLOR = 'var(--color-ink)'

/** Minimum contrast against white for user-supplied text colours (WCAG 1.4.11 / large text). */
export const MIN_CONTRAST_AGAINST_WHITE = 3

/** Accepts only #hex colours or plain colour words; anything else is dropped. Logic unchanged from RichText. */
export function safeColor(value: string | undefined): string | undefined {
  if (!value) return undefined
  const v = value.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v
  if (/^[a-zA-Z]{3,20}$/.test(v)) return v
  return undefined
}

function relativeLuminance(hex: string): number {
  const digits = hex.replace(/^#/, '')
  const channels = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two 6-digit hex colours (no alpha). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la >= lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** Expands #rgb / #rgba to #rrggbb and drops alpha digits. Returns null for other lengths. */
export function toSixDigitHex(value: string): string | null {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) return null
  const digits = value.slice(1)
  if (digits.length === 3 || digits.length === 4) {
    return `#${digits.slice(0, 3).split('').map((d) => d + d).join('')}`
  }
  if (digits.length === 6 || digits.length === 8) return `#${digits.slice(0, 6)}`
  return null
}

/**
 * Text colour for a rich-text run that is rendered on white.
 * - undefined input or unsafe value: no colour (inherits the page ink)
 * - #hex that reaches 3:1 against white: kept as-is
 * - #hex that fails 3:1, or a colour word we cannot verify: falls back to var(--color-ink)
 */
export function guardedTextColor(value: string | undefined): string | undefined {
  const color = safeColor(value)
  if (!color) return undefined
  const hex = toSixDigitHex(color)
  if (!hex) return FALLBACK_TEXT_COLOR
  return contrastRatio(hex, '#ffffff') >= MIN_CONTRAST_AGAINST_WHITE ? color : FALLBACK_TEXT_COLOR
}
