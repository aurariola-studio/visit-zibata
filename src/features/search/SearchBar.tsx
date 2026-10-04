import { Search, X } from 'lucide-react'
import { type RefObject, useId, useRef } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { t } from '../../i18n/index.ts'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Referencia opcional al campo, para devolverle el foco desde fuera. */
  inputRef?: RefObject<HTMLInputElement | null>
}

export function SearchBar({ value, onChange, inputRef: externalRef }: SearchBarProps) {
  const id = useId()
  const localRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef ?? localRef
  // En un teléfono el campo comparte barra con la marca, el idioma y la información: el aviso largo
  // no cabe entero y un texto cortado se lee peor que uno corto.
  const narrow = useMediaQuery('(max-width: 560px)')
  return (
    <search className={styles.searchLandmark}>
      {/* biome-ignore lint/a11y/useSemanticElements: role explícito para lectores que aún no reconocen <search>. */}
      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          inputRef.current?.blur()
        }}
      >
        <label htmlFor={id} className="visually-hidden">
          {t('search.label')}
        </label>
        <Search className={styles.icon} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          className={styles.input}
          data-clearable={value.length > 0}
          type="search"
          value={value}
          placeholder={t(narrow ? 'search.placeholderShort' : 'search.placeholder')}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault()
              onChange('')
            }
          }}
        />
        {value && (
          <button
            type="button"
            className={styles.clear}
            aria-label={t('search.clear')}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </form>
    </search>
  )
}
