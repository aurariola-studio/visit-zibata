// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import datos from '../../../data/commercial/categories.json'
import { ICONOS } from '../../data/iconos.ts'

describe('CategoryIcon', () => {
  it('un icono diferido reserva su caja hasta que llega, y entonces pinta el dibujo', async () => {
    // Módulo recién importado: sin el fragmento de iconos diferidos en la memoria.
    vi.resetModules()
    const { CategoryIcon } = await import('./CategoryIcon.tsx')
    const { container } = render(<CategoryIcon name="padel" size={20} />)
    const caja = container.firstElementChild as HTMLElement
    expect(caja.tagName).toBe('SPAN')
    expect(caja.style.width).toBe('20px')
    expect(caja.style.height).toBe('20px')
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
  })

  it('todo nombre de la lista acaba pintando un dibujo, también los que se cargan aparte', async () => {
    const { CategoryIcon } = await import('./CategoryIcon.tsx')
    for (const nombre of ICONOS) {
      const { container, unmount } = render(<CategoryIcon name={nombre} size={20} />)
      await waitFor(() => expect(container.querySelector('svg'), nombre).not.toBeNull())
      unmount()
    }
  })

  it('sectores y categorías se pintan de inmediato y solo las subcategorías se cargan aparte', async () => {
    const { esIconoDiferido } = await import('./CategoryIcon.tsx')
    const deSectorOCategoria = new Set([
      ...datos.sectors.map((sector) => sector.icon),
      ...datos.categories.map((categoria) => categoria.icon),
    ])
    const soloDeGiro = new Set(
      datos.categories
        .flatMap((c) => c.giros.map((g) => g.icon))
        .filter((i) => !deSectorOCategoria.has(i)),
    )
    for (const nombre of deSectorOCategoria) {
      expect(esIconoDiferido(nombre), `${nombre} sale en la primera pantalla`).toBe(false)
    }
    for (const nombre of soloDeGiro) {
      expect(esIconoDiferido(nombre), `${nombre} es de subcategoría`).toBe(true)
    }
  })
})
