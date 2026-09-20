import { describe, expect, it } from 'vitest'

import { formatAmount, formatQuantity, scaleFactor, scaleQuantity } from './quantity'
import type { Ingredient, Recipe } from '../types'

function ing(partial: Partial<Ingredient> & Pick<Ingredient, 'quantity' | 'unit'>): Ingredient {
  return { id: partial.id ?? 'i1', name: partial.name ?? 'thing', ...partial }
}

describe('scaleQuantity', () => {
  it('keeps "to taste" as null at any factor', () => {
    expect(scaleQuantity(null, 1)).toBeNull()
    expect(scaleQuantity(null, 0.5)).toBeNull()
    expect(scaleQuantity(null, 3)).toBeNull()
  })

  it('multiplies numeric quantities', () => {
    expect(scaleQuantity(200, 0.5)).toBe(100)
    expect(scaleQuantity(200, 1)).toBe(200)
    expect(scaleQuantity(200, 2)).toBe(400)
    expect(scaleQuantity(200, 3)).toBe(600)
  })

  it('scales to zero only when the factor is exactly zero', () => {
    expect(scaleQuantity(200, 0)).toBe(0)
  })

  it('ignores a non-finite or negative factor', () => {
    expect(scaleQuantity(200, Number.NaN)).toBe(200)
    expect(scaleQuantity(200, Number.POSITIVE_INFINITY)).toBe(200)
    expect(scaleQuantity(200, -2)).toBe(200)
  })
})

describe('scaleFactor', () => {
  it('divides target by base', () => {
    expect(scaleFactor(6, 4)).toBeCloseTo(1.5, 10)
    expect(scaleFactor(2, 4)).toBe(0.5)
    expect(scaleFactor(4, 4)).toBe(1)
  })

  it('guards against a 0/NaN/negative base', () => {
    expect(scaleFactor(6, 0)).toBe(1)
    expect(scaleFactor(6, Number.NaN)).toBe(1)
    expect(scaleFactor(6, -4)).toBe(1)
  })

  it('guards against a bad target', () => {
    expect(scaleFactor(0, 4)).toBe(1)
    expect(scaleFactor(Number.NaN, 4)).toBe(1)
  })
})

describe('formatQuantity — unit promotion and demotion', () => {
  it('promotes grams to kilograms at 1000', () => {
    expect(formatQuantity(1500, 'g')).toBe('1.5 kg')
    expect(formatQuantity(1000, 'g')).toBe('1 kg')
    expect(formatQuantity(1250, 'g')).toBe('1.25 kg')
    expect(formatQuantity(2400, 'g')).toBe('2.4 kg')
  })

  it('leaves sub-kilogram gram amounts alone', () => {
    expect(formatQuantity(999, 'g')).toBe('999 g')
    expect(formatQuantity(750, 'g')).toBe('750 g')
    expect(formatQuantity(1, 'g')).toBe('1 g')
  })

  it('demotes kilograms below 1 to grams', () => {
    expect(formatQuantity(0.5, 'kg')).toBe('500 g')
    expect(formatQuantity(0.25, 'kg')).toBe('250 g')
    expect(formatQuantity(0.075, 'kg')).toBe('75 g')
    expect(formatQuantity(1, 'kg')).toBe('1 kg')
  })

  it('promotes millilitres to litres at 1000', () => {
    expect(formatQuantity(1000, 'ml')).toBe('1 l')
    expect(formatQuantity(1500, 'ml')).toBe('1.5 l')
    expect(formatQuantity(900, 'ml')).toBe('900 ml')
  })

  it('demotes litres below 1 to millilitres', () => {
    expect(formatQuantity(0.25, 'l')).toBe('250 ml')
    expect(formatQuantity(0.5, 'l')).toBe('500 ml')
    expect(formatQuantity(1.5, 'l')).toBe('1.5 l')
  })

  it('never promotes units outside the g/kg and ml/l pairs', () => {
    expect(formatQuantity(1000, 'pcs')).toBe('1000 pcs')
    expect(formatQuantity(1500, 'tsp')).toBe('1500 tsp')
    expect(formatQuantity(0.5, 'pinch')).toBe('0.5 pinch')
  })
})

describe('formatQuantity — vulgar fractions for spoons and cups', () => {
  const cases: Array<[number, string]> = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ]

  it.each(cases)('renders %f as %s', (value, glyph) => {
    expect(formatQuantity(value, 'tsp')).toBe(`${glyph} tsp`)
    expect(formatQuantity(value, 'tbsp')).toBe(`${glyph} tbsp`)
    expect(formatQuantity(value, 'cup')).toBe(`${glyph} cup`)
  })

  it('renders mixed numbers', () => {
    expect(formatQuantity(1.5, 'tsp')).toBe('1½ tsp')
    expect(formatQuantity(2.25, 'cup')).toBe('2¼ cup')
    expect(formatQuantity(1.75, 'tbsp')).toBe('1¾ tbsp')
    expect(formatQuantity(4 / 3, 'tsp')).toBe('1⅓ tsp')
    expect(formatQuantity(3 + 7 / 8, 'cup')).toBe('3⅞ cup')
  })

  it('uses the real unicode fraction characters', () => {
    expect(formatQuantity(0.5, 'tsp')).toContain('½')
    expect(formatQuantity(0.25, 'tsp')).toContain('¼')
    expect(formatQuantity(0.75, 'tsp')).toContain('¾')
    expect(formatQuantity(1 / 3, 'tsp')).toContain('⅓')
    expect(formatQuantity(0.125, 'tsp')).toContain('⅛')
    expect(formatQuantity(0.5, 'tsp')).not.toContain('1/2')
  })

  it('snaps values that are only epsilon away from a fraction', () => {
    expect(formatQuantity(0.3333333333, 'tsp')).toBe('⅓ tsp')
    expect(formatQuantity(0.6666666667, 'cup')).toBe('⅔ cup')
    expect(formatQuantity(0.4999, 'tsp')).toBe('½ tsp')
    expect(formatQuantity(0.999, 'tsp')).toBe('1 tsp')
    expect(formatQuantity(2.002, 'tsp')).toBe('2 tsp')
  })

  it('falls back to decimals when nothing is close enough', () => {
    expect(formatQuantity(0.35, 'tsp')).toBe('0.35 tsp')
    expect(formatQuantity(0.2, 'cup')).toBe('0.2 cup')
    expect(formatQuantity(1.45, 'tbsp')).toBe('1.45 tbsp')
  })

  it('renders whole spoon counts without a fraction', () => {
    expect(formatQuantity(1, 'tsp')).toBe('1 tsp')
    expect(formatQuantity(2, 'tbsp')).toBe('2 tbsp')
  })
})

describe('formatQuantity — decimals', () => {
  it('strips trailing zeros', () => {
    expect(formatQuantity(2, 'pcs')).toBe('2 pcs')
    expect(formatQuantity(2.0, 'pcs')).toBe('2 pcs')
    expect(formatQuantity(1.5, 'pcs')).toBe('1.5 pcs')
    expect(formatQuantity(1.5, 'g')).toBe('1.5 g')
    expect(formatQuantity(1.05, 'g')).toBe('1.05 g')
  })

  it('shows at most 2 decimals below 10', () => {
    expect(formatQuantity(1.005, 'g')).toBe('1.01 g')
    expect(formatQuantity(2.345, 'g')).toBe('2.35 g')
    expect(formatQuantity(0.3333333, 'g')).toBe('0.33 g')
  })

  it('rounds away noise for values of 10 and above', () => {
    expect(formatQuantity(13.333333, 'g')).toBe('13.3 g')
    expect(formatQuantity(66.666666, 'ml')).toBe('66.7 ml')
    expect(formatQuantity(10, 'g')).toBe('10 g')
  })

  it('rounds to whole numbers at 100 and above', () => {
    expect(formatQuantity(266.66666, 'g')).toBe('267 g')
    expect(formatQuantity(133.3333, 'ml')).toBe('133 ml')
    expect(formatQuantity(1000.4, 'pcs')).toBe('1000 pcs')
  })

  it('renders without a unit when the unit is null', () => {
    expect(formatQuantity(2, null)).toBe('2')
    expect(formatQuantity(1.5, null)).toBe('1.5')
    expect(formatQuantity(0.5, null)).toBe('0.5')
  })
})

describe('formatQuantity — never renders 0 for a non-zero amount', () => {
  it('floors tiny amounts to a minimum display', () => {
    expect(formatQuantity(0.001, 'g')).toBe('0.01 g')
    expect(formatQuantity(0.0001, 'tsp')).toBe('0.01 tsp')
    expect(formatQuantity(0.004, 'pcs')).toBe('0.01 pcs')
    expect(formatQuantity(1e-9, null)).toBe('0.01')
  })

  it('never produces a bare zero for any non-zero scaled quantity', () => {
    for (const quantity of [0.002, 0.03, 0.4, 5, 60, 700, 8000]) {
      for (const factor of [0.001, 0.125, 0.5, 1, 2, 3]) {
        const scaled = scaleQuantity(quantity, factor) as number
        for (const unit of ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pcs', 'pinch', null] as const) {
          const text = formatQuantity(scaled, unit)
          const numeric = unit === null ? text : text.slice(0, text.length - unit.length - 1)
          expect(numeric).not.toBe('0')
        }
      }
    }
  })

  it('still renders an exact zero as 0', () => {
    expect(formatQuantity(0, 'g')).toBe('0 g')
    expect(formatQuantity(0, null)).toBe('0')
  })
})

describe('formatAmount', () => {
  it('returns "to taste" for a null quantity', () => {
    expect(formatAmount(ing({ name: 'salt', quantity: null, unit: null }))).toBe('to taste')
    expect(formatAmount(ing({ name: 'salt', quantity: null, unit: 'g' }), 3)).toBe('to taste')
  })

  it('renders quantity + unit', () => {
    expect(formatAmount(ing({ name: 'baking soda', quantity: 1.5, unit: 'tsp' }))).toBe('1½ tsp')
    expect(formatAmount(ing({ name: 'flour', quantity: 750, unit: 'g' }))).toBe('750 g')
    expect(formatAmount(ing({ name: 'eggs', quantity: 2, unit: 'pcs' }))).toBe('2 pcs')
  })

  it('renders just the number when the unit is null', () => {
    expect(formatAmount(ing({ name: 'eggs', quantity: 3, unit: null }))).toBe('3')
  })

  it('defaults to a factor of 1', () => {
    const item = ing({ name: 'butter', quantity: 200, unit: 'g' })
    expect(formatAmount(item)).toBe(formatAmount(item, 1))
  })

  it('applies the factor, promoting units where useful', () => {
    const flour = ing({ name: 'flour', quantity: 500, unit: 'g' })
    expect(formatAmount(flour, 0.5)).toBe('250 g')
    expect(formatAmount(flour, 1)).toBe('500 g')
    expect(formatAmount(flour, 2)).toBe('1 kg')
    expect(formatAmount(flour, 3)).toBe('1.5 kg')
  })

  it('applies the factor to spoon amounts as fractions', () => {
    const salt = ing({ name: 'salt', quantity: 1, unit: 'tsp' })
    expect(formatAmount(salt, 0.5)).toBe('½ tsp')
    expect(formatAmount(salt, 0.25)).toBe('¼ tsp')
    expect(formatAmount(salt, 1.5)).toBe('1½ tsp')
    expect(formatAmount(salt, 3)).toBe('3 tsp')
  })

  it('ignores the note', () => {
    const item = ing({ name: 'onion', quantity: 2, unit: 'pcs', note: 'finely chopped' })
    expect(formatAmount(item)).toBe('2 pcs')
  })
})

describe('realistic scaling scenario: 4 servings → 6', () => {
  const recipe: Recipe = {
    id: 'seed:pancakes',
    name: 'Pancakes',
    folderId: null,
    servings: 4,
    groups: [
      {
        id: 'g0',
        items: [
          { id: 'i0', name: 'flour', quantity: 300, unit: 'g' },
          { id: 'i1', name: 'milk', quantity: 500, unit: 'ml' },
          { id: 'i2', name: 'eggs', quantity: 2, unit: 'pcs' },
          { id: 'i3', name: 'baking powder', quantity: 1, unit: 'tsp' },
          { id: 'i4', name: 'sugar', quantity: 2, unit: 'tbsp' },
          { id: 'i5', name: 'butter', quantity: 0.75, unit: 'kg' },
          { id: 'i6', name: 'salt', quantity: null, unit: null },
        ],
      },
    ],
    instructions: ['Mix.', 'Fry.'],
    meals: ['lunch'],
    taste: 'salty',
    origin: 'seed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  it('renders every amount kitchen-ready', () => {
    const factor = scaleFactor(6, recipe.servings)
    expect(factor).toBe(1.5)

    const rendered = recipe.groups[0].items.map((item) => formatAmount(item, factor))
    expect(rendered).toEqual([
      '450 g',
      '750 ml',
      '3 pcs',
      '1½ tsp',
      '3 tbsp',
      '1.13 kg',
      'to taste',
    ])
  })

  it('halves cleanly', () => {
    const factor = scaleFactor(2, recipe.servings)
    const rendered = recipe.groups[0].items.map((item) => formatAmount(item, factor))
    expect(rendered).toEqual([
      '150 g',
      '250 ml',
      '1 pcs',
      '½ tsp',
      '1 tbsp',
      '375 g',
      'to taste',
    ])
  })

  it('scales a thirded spoon amount to a fraction', () => {
    const factor = scaleFactor(1, 3)
    expect(formatAmount({ id: 'x', name: 'salt', quantity: 1, unit: 'tsp' }, factor)).toBe('⅓ tsp')
    expect(formatAmount({ id: 'x', name: 'sugar', quantity: 2, unit: 'tbsp' }, factor)).toBe('⅔ tbsp')
    expect(formatAmount({ id: 'x', name: 'flour', quantity: 400, unit: 'g' }, factor)).toBe('133 g')
  })
})
