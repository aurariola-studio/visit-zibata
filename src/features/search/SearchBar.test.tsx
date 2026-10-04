// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar } from './SearchBar.tsx'

function Controlled({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <SearchBar
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('SearchBar', () => {
  it('expone un buscador accesible con etiqueta', () => {
    render(<Controlled />)
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar lugares' })).toHaveAttribute(
      'placeholder',
      'Busca café, tacos o una zona…',
    )
  })

  it('notifica lo que se escribe', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox'), 'café')
    expect(onChange).toHaveBeenLastCalledWith('café')
  })

  it('muestra el botón de borrar solo con texto y devuelve el foco al campo', async () => {
    render(<Controlled />)
    expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument()
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'tacos')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('Escape borra la búsqueda', async () => {
    render(<Controlled />)
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'pizza{Escape}')
    expect(input).toHaveValue('')
  })
})
