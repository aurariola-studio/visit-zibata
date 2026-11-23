// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ICONOS } from '../../data/iconos.ts'
import fuente from './CategoryIcon.tsx?raw'

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

  it('ningún dibujo vive en el paquete inicial: el componente solo pide el registro', () => {
    // `CategoryIcon.tsx` es lo único de los iconos que entra en el paquete inicial. Si importara dibujos (de
    // lucide o del registro) de forma estática, volverían a pesar en `initialJs` con cada categoría nueva.
    const estaticos = [...fuente.matchAll(/^import .*? from '([^']+)'/gms)].map((m) => m[1])
    expect(estaticos).not.toContain('./registro-de-iconos.tsx')
    const deLucide = fuente.match(/^import \{([^}]*)\} from 'lucide-react'/ms)?.[1] ?? ''
    const nombres = deLucide
      .split(',')
      .map((n: string) => n.trim())
      .filter(Boolean)
    expect(nombres.sort()).toEqual(['UtensilsCrossed', 'type LucideProps'])
    expect(fuente).toMatch(/import\('\.\/registro-de-iconos\.tsx'\)/)
  })

  it('un nombre desconocido o heredado de Object pinta el icono genérico', async () => {
    const { CategoryIcon } = await import('./CategoryIcon.tsx')
    for (const nombre of ['no-existe', 'constructor', '__proto__']) {
      const { container, unmount } = render(<CategoryIcon name={nombre} size={20} />)
      await waitFor(() => expect(container.querySelector('svg'), nombre).not.toBeNull())
      unmount()
    }
  })
})
