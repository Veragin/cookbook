/**
 * Recipe scaling and kitchen-friendly amount rendering.
 *
 * Everything here is pure: no DOM, no storage, no clock. The rules are tuned for
 * readability in a kitchen rather than for numeric fidelity — a scaled `1.5 tsp`
 * reads as `1½ tsp`, `1500 g` reads as `1.5 kg`, and a tiny leftover amount never
 * collapses to a bare `0`.
 */

import type { Ingredient, Unit } from '../types'

/** Units that read best as vulgar fractions (spoons and cups). */
const FRACTION_UNITS = new Set<Unit>(['tsp', 'tbsp', 'cup'])

/**
 * Fractions we are willing to snap to: eighths plus thirds. Ordered so that lookup
 * is deterministic; values are compared with {@link FRACTION_EPSILON}.
 */
const FRACTIONS: ReadonlyArray<readonly [number, string]> = [
  [1 / 8, '⅛'], // ⅛
  [1 / 4, '¼'], // ¼
  [1 / 3, '⅓'], // ⅓
  [3 / 8, '⅜'], // ⅜
  [1 / 2, '½'], // ½
  [5 / 8, '⅝'], // ⅝
  [2 / 3, '⅔'], // ⅔
  [3 / 4, '¾'], // ¾
  [7 / 8, '⅞'], // ⅞
]

/**
 * How close a value has to be to a representable fraction before we snap to it.
 * Deliberately tight: `0.35` is *not* a third, but `0.3333…` is.
 */
const FRACTION_EPSILON = 0.01

/** Smallest non-zero amount we are prepared to print. */
const MIN_DISPLAY = 0.01

/**
 * Scaled quantity; `null` (to taste) stays `null`.
 *
 * A non-finite or negative factor is treated as "no scaling" so a bad input can
 * never wipe out an amount.
 */
export function scaleQuantity(quantity: number | null, factor: number): number | null {
  if (quantity === null) return null
  if (!Number.isFinite(quantity)) return quantity
  if (!Number.isFinite(factor) || factor < 0) return quantity
  return quantity * factor
}

/**
 * Factor needed to go from `baseServings` to `targetServings`.
 * Guards against a `0`/`NaN`/negative base (or target) by falling back to `1`.
 */
export function scaleFactor(targetServings: number, baseServings: number): number {
  if (!Number.isFinite(baseServings) || baseServings <= 0) return 1
  if (!Number.isFinite(targetServings) || targetServings <= 0) return 1
  return targetServings / baseServings
}

/**
 * Promote/demote between the `g`/`kg` and `ml`/`l` pairs so the printed number
 * stays in a comfortable range: `1500 g` → `1.5 kg`, `0.25 l` → `250 ml`.
 */
function promoteUnit(value: number, unit: Unit): [number, Unit] {
  if (value <= 0 || !Number.isFinite(value)) return [value, unit]
  if (unit === 'g' && value >= 1000) return [value / 1000, 'kg']
  if (unit === 'kg' && value < 1) return [value * 1000, 'g']
  if (unit === 'ml' && value >= 1000) return [value / 1000, 'l']
  if (unit === 'l' && value < 1) return [value * 1000, 'ml']
  return [value, unit]
}

/** How many decimals a magnitude deserves — big numbers never show noise. */
function decimalsFor(value: number): number {
  if (value >= 100) return 0
  if (value >= 10) return 1
  return 2
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Fixed-decimal string with trailing zeros stripped: `2.00` → `2`, `1.50` → `1.5`. */
function trimZeros(value: number, decimals: number): string {
  const text = value.toFixed(decimals)
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

/** Decimal rendering: ≤ 2 decimals, coarser as the number grows, never a bare `0`. */
function formatDecimal(value: number): string {
  if (value === 0) return '0'
  if (value < 0) return `-${formatDecimal(-value)}`

  const decimals = decimalsFor(value)
  const rounded = round(value, decimals)
  // "Never render 0 for a non-zero amount" — floor to the smallest display step.
  if (rounded === 0) return trimZeros(MIN_DISPLAY, 2)
  return trimZeros(rounded, decimals)
}

/**
 * Vulgar-fraction rendering for spoons/cups, or `undefined` when the value is not
 * close enough to a representable fraction (caller falls back to decimals).
 */
function formatFraction(value: number): string | undefined {
  if (value <= 0) return undefined

  const whole = Math.floor(value)
  const fraction = value - whole

  // Close enough to a whole number in either direction.
  if (fraction <= FRACTION_EPSILON) return whole > 0 ? String(whole) : undefined
  if (fraction >= 1 - FRACTION_EPSILON) return String(whole + 1)

  let best: string | undefined
  let bestDelta = FRACTION_EPSILON
  for (const [ratio, glyph] of FRACTIONS) {
    const delta = Math.abs(fraction - ratio)
    if (delta <= bestDelta) {
      best = glyph
      bestDelta = delta
    }
  }
  if (best === undefined) return undefined

  return whole > 0 ? `${whole}${best}` : best
}

/**
 * Kitchen-friendly rendering of a quantity **including its (possibly promoted) unit**:
 * `formatQuantity(1500, 'g') === '1.5 kg'`, `formatQuantity(1.5, 'tsp') === '1½ tsp'`,
 * `formatQuantity(2, null) === '2'`.
 *
 * The unit has to be part of the result because promotion can change it.
 */
export function formatQuantity(quantity: number, unit: Unit): string {
  if (!Number.isFinite(quantity)) return ''

  const [value, displayUnit] = promoteUnit(quantity, unit)

  let text: string | undefined
  if (displayUnit !== null && FRACTION_UNITS.has(displayUnit)) {
    text = formatFraction(value)
  }
  if (text === undefined) text = formatDecimal(value)

  return displayUnit === null ? text : `${text} ${displayUnit}`
}

/**
 * Full amount text for an ingredient at a scale factor, e.g. `1½ tsp`, `750 g`,
 * `2 pcs`, or `to taste` for a `null` quantity. Notes are rendered separately by
 * the UI and are never appended here.
 */
export function formatAmount(ingredient: Ingredient, factor = 1): string {
  const scaled = scaleQuantity(ingredient.quantity, factor)
  if (scaled === null) return 'to taste'
  return formatQuantity(scaled, ingredient.unit)
}
