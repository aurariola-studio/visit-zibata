// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { categoriesFixture } from '../../test/fixtures.ts'
import { CategoryChips } from './CategoryChips.tsx'

/*
 * La cápsula del sector queda fija: está fuera del carril que se desplaza, así que ni la rueda, ni las
 * flechas ni el desvanecido la tocan. Lo que se prueba es la estructura, que es lo que lo garantiza.
 */
const lead = {
  label: 'Salud',
  icon: 'heart-pulse',
  selected: false,
  href: '/sector/salud',
  hint: 'Ver todos los sectores',
  onPress: vi.fn(),
}

const pintar = (conLead: boolean) =>
  render(
    <CategoryChips
      categories={categoriesFixture}
      activeId={null}
      onChange={vi.fn()}
      hrefFor={(id) => (id ? `/categoria/${id}` : '/')}
      label="Categorías"
      hideAll
      lead={conLead ? lead : undefined}
    />,
  )

describe('CategoryChips: la cápsula del sector', () => {
  it('no está dentro del carril que se desplaza', () => {
    pintar(true)
    const cabecera = screen.getByRole('link', { name: /^Salud\./ })
    const lista = screen.getByRole('list', { name: 'Categorías' })
    const carril = lista.parentElement as HTMLElement
    expect(carril.contains(cabecera)).toBe(false)
    // Y no es una más de la lista: la lista solo lleva categorías.
    expect(lista.contains(cabecera)).toBe(false)
    expect(lista.querySelectorAll('a')).toHaveLength(categoriesFixture.length)
  })

  it('sin sector no hay cápsula fija y la lista es la de siempre', () => {
    pintar(false)
    expect(screen.queryByRole('link', { name: /^Salud\./ })).toBeNull()
    expect(screen.getByRole('list', { name: 'Categorías' }).querySelectorAll('a')).toHaveLength(
      categoriesFixture.length,
    )
  })
})
