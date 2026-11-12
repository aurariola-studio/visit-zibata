// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ICONOS } from '../../data/iconos.ts'

describe('CategoryIcon', () => {
  it('un icono diferido reserva su caja hasta que llega, y entonces pinta el dibujo', async () => {
    // Módulo recién importado: sin el fragmento de deporte en la memoria.
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
})
