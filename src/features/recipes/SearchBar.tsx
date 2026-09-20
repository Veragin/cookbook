import { useId } from 'react'
import styled from 'styled-components'

import { Input } from '../../components'

export type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  /** Visually hidden label — also the accessible name of the field. */
  label?: string
  placeholder?: string
  className?: string
}

const Wrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`

const HiddenLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

const SearchIcon = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.space.md};
  display: inline-flex;
  color: ${({ theme }) => theme.color.textMuted};
  pointer-events: none;

  svg {
    width: ${({ theme }) => theme.font.size.md};
    height: ${({ theme }) => theme.font.size.md};
  }
`

const SearchInput = styled(Input)`
  padding-left: ${({ theme }) => theme.space.xxl};
  padding-right: ${({ theme }) => theme.layout.touch};

  &::-webkit-search-cancel-button {
    display: none;
  }
`

const Clear = styled.button`
  position: absolute;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.layout.touch};
  height: ${({ theme }) => theme.layout.touch};
  min-width: ${({ theme }) => theme.layout.touch};
  min-height: ${({ theme }) => theme.layout.touch};
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }

  svg {
    width: ${({ theme }) => theme.font.size.md};
    height: ${({ theme }) => theme.font.size.md};
  }
`

/** Synchronous search field with a clear button. No debounce — filtering is cheap. */
export function SearchBar({
  value,
  onChange,
  label = 'Search recipes',
  placeholder = 'Search recipes and ingredients',
  className,
}: SearchBarProps) {
  const id = useId()

  return (
    <Wrapper className={className}>
      <HiddenLabel htmlFor={id}>{label}</HiddenLabel>
      <SearchIcon aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </SearchIcon>
      <SearchInput
        id={id}
        type="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' && (
        <Clear type="button" aria-label="Clear search" onClick={() => onChange('')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </Clear>
      )}
    </Wrapper>
  )
}
