import { Search, X } from 'lucide-react'
import { type RefObject, useId, useRef } from 'react'
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
          type="search"
          value={value}
          placeholder={t('search.placeholder')}
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
