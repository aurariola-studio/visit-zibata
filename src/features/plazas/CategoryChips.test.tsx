// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriesFixture } from '../../test/fixtures.ts'
import { CategoryChips } from './CategoryChips.tsx'

/*
 * jsdom no mide nada, así que se le da una geometría: cada cápsula mide 100 px y la de índice i empieza
 * en 110 * i, y el carril enseña 300 px. Lo que se prueba es la cuenta, no el navegador; el navegador lo
 * prueba tests/e2e/categorias.spec.ts.
 */
function conGeometria() {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    const lista = this.closest('ul')
    const enlaces = lista ? [...lista.querySelectorAll('a')] : []
    return Math.max(enlaces.indexOf(this as HTMLAnchorElement), 0) * 110
  })
}

const pintar = (activeId: string | null) =>
  render(
    <CategoryChips
      categories={categoriesFixture}
      activeId={activeId}
      onChange={vi.fn()}
      hrefFor={(id) => (id ? `/categoria/${id}` : '/')}
      label="Categorías"
    />,
  )

afterEach(() => vi.restoreAllMocks())

describe('CategoryChips: la elegida queda a la vista', () => {
  it('si está más allá del borde derecho, el carril se desplaza hasta dejarla dentro', () => {
    conGeometria()
    const { container } = pintar(categoriesFixture[2]?.id ?? null)
    const carril = container.querySelector('ul')?.parentElement as HTMLElement
    // La tercera categoría es el cuarto enlace (tras "Todo"): empieza en 330 y acaba en 430, más 28 de aire.
    expect(carril.scrollLeft).toBe(430 + 28 - 300)
  })

  it('si ya se ve entera, no se mueve', () => {
    conGeometria()
    const { container } = pintar(null)
    const carril = container.querySelector('ul')?.parentElement as HTMLElement
    expect(carril.scrollLeft).toBe(0)
  })

  it('si cambia la elegida se vuelve a medir, pero no cuando solo cambian los números', () => {
    conGeometria()
    const { container, rerender } = pintar(null)
    const carril = container.querySelector('ul')?.parentElement as HTMLElement
    carril.scrollLeft = 50
    rerender(
      <CategoryChips
        categories={categoriesFixture}
        counts={new Map([['pizza', 3]])}
        activeId={null}
        onChange={vi.fn()}
        hrefFor={() => '/'}
        label="Categorías"
      />,
    )
    // Quien desplazó a mano no vuelve al principio por un cambio de cuentas.
    expect(carril.scrollLeft).toBe(50)
  })
})
