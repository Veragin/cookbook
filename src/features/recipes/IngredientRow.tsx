/**
 * One ingredient line of the recipe form.
 *
 * The amount is structured rather than free text: a numeric quantity, a unit taken
 * from `UNITS`, the name (autocompleted from every other recipe) and an optional note.
 * That is what lets the view page scale a recipe to a different number of portions.
 */

import styled from 'styled-components'

import { Autocomplete, Field, IconButton, Input, Select } from '../../components'
import { UNITS } from '../../types'
import type { Unit } from '../../types'
import { formFieldIds } from './useRecipeForm'
import type { FormIngredient, ItemErrors } from './useRecipeForm'

export type IngredientRowProps = {
  item: FormIngredient
  /** Unique, human-readable prefix for the hidden labels, e.g. "Ingredient 2". */
  rowLabel: string
  errors?: ItemErrors
  /** Names offered by the autocomplete — every ingredient known to the cookbook. */
  options: readonly string[]
  canMoveUp: boolean
  canMoveDown: boolean
  disabled?: boolean
  onChange: (patch: Partial<Omit<FormIngredient, 'id'>>) => void
  onRemove: () => void
  onMove: (delta: number) => void
}

/** Layout-only breakpoint: below this the name gets a line of its own. */
const WIDE = '(min-width: 560px)'

const Row = styled.li`
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    'quantity unit'
    'name name'
    'note note'
    'actions actions';
  padding: ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};

  @media ${WIDE} {
    grid-template-columns:
      calc(${({ theme }) => theme.layout.touch} * 1.7)
      calc(${({ theme }) => theme.layout.touch} * 2.1)
      minmax(0, 1fr)
      auto;
    grid-template-areas:
      'quantity unit name actions'
      'note note note note';
    align-items: start;
  }
`

const QuantityField = styled(Field)`
  grid-area: quantity;
`
const UnitField = styled(Field)`
  grid-area: unit;
`
const NameField = styled(Field)`
  grid-area: name;
`
const NoteField = styled(Field)`
  grid-area: note;
`

const Actions = styled.div`
  grid-area: actions;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space.xs};
`

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6" strokeLinecap="round" />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IngredientRow({
  item,
  rowLabel,
  errors,
  options,
  canMoveUp,
  canMoveDown,
  disabled = false,
  onChange,
  onRemove,
  onMove,
}: IngredientRowProps) {
  return (
    <Row>
      <QuantityField label={`${rowLabel} amount`} labelHidden error={errors?.quantity}>
        <Input
          id={formFieldIds.quantity(item.id)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1.5"
          disabled={disabled}
          value={item.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
        />
      </QuantityField>

      <UnitField label={`${rowLabel} unit`} labelHidden>
        <Select
          id={formFieldIds.unit(item.id)}
          disabled={disabled}
          value={item.unit ?? ''}
          onChange={(event) =>
            onChange({ unit: event.target.value === '' ? null : (event.target.value as Unit) })
          }
        >
          <option value="">—</option>
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </Select>
      </UnitField>

      <NameField label={`${rowLabel} name`} labelHidden error={errors?.name}>
        <Autocomplete
          id={formFieldIds.ingredientName(item.id)}
          value={item.name}
          options={options}
          allowFreeText
          disabled={disabled}
          placeholder="Ingredient"
          onChange={(name) => onChange({ name })}
        />
      </NameField>

      <NoteField label={`${rowLabel} note`} labelHidden>
        <Input
          id={formFieldIds.note(item.id)}
          type="text"
          autoComplete="off"
          placeholder="finely chopped"
          disabled={disabled}
          value={item.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </NoteField>

      <Actions>
        <IconButton
          aria-label={`Move ${rowLabel.toLowerCase()} up`}
          disabled={disabled || !canMoveUp}
          onClick={() => onMove(-1)}
        >
          <UpIcon />
        </IconButton>
        <IconButton
          aria-label={`Move ${rowLabel.toLowerCase()} down`}
          disabled={disabled || !canMoveDown}
          onClick={() => onMove(1)}
        >
          <DownIcon />
        </IconButton>
        <IconButton
          variant="danger"
          aria-label={`Remove ${rowLabel.toLowerCase()}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <TrashIcon />
        </IconButton>
      </Actions>
    </Row>
  )
}
