import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'

/**
 * El panel privado, con el Worker simulado.
 *
 * El panel es una entrada aparte detrás de Cloudflare Access y no tiene un servidor en `vite preview`,
 * así que aquí las dos rutas de lectura (`/api/panel` y `/api/panel/contenido`) se sirven desde datos
 * propios de la prueba. Son datos inventados a propósito: borrar o renombrar un local real no puede
 * poner en rojo la prueba del panel, y una prueba del panel no tiene por qué leer el catálogo.
 *
 * Lo que fija, en escritorio, tableta y teléfono (la matriz de proyectos):
 *  - que cada sección pinta y que la página no se desplaza de lado,
 *  - que el formulario abre, avisa en el campo y se cierra,
 *  - que axe no encuentra violaciones en la lista ni en el formulario,
 *  - y que sin permiso el panel lo dice con palabras, no se queda en blanco.
 */

const hoy = new Date().toISOString().slice(0, 10)

const estadisticas = {
  dias: 30,
  desde: hoy,
  resumen: {
    visitas: 120,
    paginas: 340,
    comparticiones: 4,
    cuentas: 9,
    corazones: 31,
    notas: 6,
    visitasMarcadas: 12,
  },
  porDia: [{ fecha: hoy, visitas: 120 }],
  porPagina: [{ ruta: '/es', idioma: 'es', visitas: 80 }],
  porIdioma: [
    { idioma: 'es', visitas: 100 },
    { idioma: 'en', visitas: 20 },
  ],
  compartidas: [{ ruta: '/es/lugar/cafe-de-prueba', veces: 4 }],
  guardados: [{ lugar: 'cafe-de-prueba', corazones: 3 }],
  calificados: [{ lugar: 'cafe-de-prueba', notas: 2 }],
  sugerencias: [
    {
      id: 'sug-1',
      creada: `${hoy}T10:00:00.000Z`,
      quien: 'Una vecina',
      lugar: 'cafe-de-prueba',
      mensaje: 'El horario de los domingos cambió.',
      contacto: '',
      atendida: 0,
    },
  ],
  sinAtender: 1,
}

const contenido = {
  ref: 'main',
  seco: true,
  pr: null,
  categories: [
    {
      id: 'servicios',
      slug: { es: 'servicios', en: 'services' },
      label: { es: 'Servicios de prueba', en: 'Test services' },
      icon: 'store',
      hue: 200,
      order: 1,
      synonyms: [],
      giros: [
        {
          id: 'servicios-general',
          label: { es: 'Servicios', en: 'Services' },
          icon: 'store',
          general: true,
          synonyms: [],
        },
        {
          id: 'servicios-taller',
          label: { es: 'Taller de prueba', en: 'Test workshop' },
          icon: 'wrench',
          synonyms: [],
        },
      ],
    },
  ],
  plazas: [
    {
      id: 'plaza-uno',
      slug: 'plaza-uno',
      name: 'Plaza Uno',
      description: { es: 'Una plaza inventada.', en: 'An invented plaza.' },
      address: 'Calle Inventada 1',
      coordinates: { lat: 20.68, lng: -100.31 },
      active: true,
    },
    {
      id: 'plaza-dos',
      slug: 'plaza-dos',
      name: 'Plaza Dos',
      description: null,
      address: null,
      coordinates: { lat: 20.69, lng: -100.32 },
      active: true,
    },
    {
      id: 'plaza-tres',
      slug: 'plaza-tres',
      name: 'Plaza Tres',
      description: null,
      address: null,
      coordinates: { lat: 20.67, lng: -100.3 },
      active: false,
      comingSoon: true,
    },
  ],
  places: [
    {
      id: 'cafe-de-prueba',
      slug: 'cafe-de-prueba',
      name: 'Café de Prueba',
      plazaId: 'plaza-uno',
      giros: ['servicios-general'],
      description: { es: 'Un local inventado para la prueba.', en: 'An invented place.' },
      hours: null,
      location: null,
      googleMapsUri: null,
      phone: null,
      links: {},
      photos: [
        { src: '/prueba/fachada.webp', alt: 'Fachada' },
        { src: '/prueba/interior.webp', alt: 'Interior' },
      ],
      active: true,
    },
    {
      id: 'taller-de-prueba',
      slug: 'taller-de-prueba',
      name: 'Taller de Prueba',
      plazaId: 'plaza-dos',
      giros: ['servicios-general'],
      description: null,
      hours: null,
      location: null,
      googleMapsUri: null,
      phone: null,
      links: {},
      photos: [],
      active: false,
    },
  ],
}

interface Opciones {
  /** El estado con el que responde `/api/panel/contenido`: 200 por defecto, 403 si no hay Access. */
  contenidoStatus?: number
}

/** Abre el panel con las rutas de lectura simuladas. */
async function abrirPanel(page: Page, { contenidoStatus = 200 }: Opciones = {}): Promise<void> {
  await page.route(/\/api\/panel\?dias=\d+$/, (ruta) => ruta.fulfill({ json: estadisticas }))
  await page.route(/\/api\/panel\/contenido$/, (ruta) =>
    contenidoStatus === 200
      ? ruta.fulfill({ json: contenido })
      : ruta.fulfill({ status: contenidoStatus, json: { error: 'no' } }),
  )
  await page.goto('./panel.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resumen')
  await expect(page.getByText('Sugerencias sin atender')).toBeVisible()
}

/** La página no se desplaza de lado: es lo primero que se rompe en un teléfono. */
async function sinDesplazamientoLateral(page: Page): Promise<void> {
  const [ancho, visible] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ])
  expect(ancho).toBeLessThanOrEqual(visible)
}

async function irA(page: Page, vista: string, titulo: string): Promise<void> {
  await page.locator(`[data-vista="${vista}"]`).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo)
}

/** Un nombre de variable colado en un texto, o una codificación rota, no lo atrapa ningún tipo. */
async function sinTextoRoto(dialogo: Locator): Promise<void> {
  await expect(dialogo).not.toContainText(/vista\.|Ã|�/)
}

test.describe('Panel', () => {
  test('el resumen pinta sus cifras y no se desplaza de lado', async ({ page }) => {
    await abrirPanel(page)
    await expect(page.getByText('Visitas por día')).toBeVisible()
    await sinDesplazamientoLateral(page)
  })

  test('negocios: lista, búsqueda y estado de cada local', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')

    await expect(page.getByText('Café de Prueba')).toBeVisible()
    await expect(page.getByText('Taller de Prueba')).toBeVisible()
    await expect(page.getByText('Oculto', { exact: true })).toBeVisible()
    await sinDesplazamientoLateral(page)

    await page.getByRole('searchbox', { name: 'Buscar negocio' }).fill('taller')
    await expect(page.getByText('Café de Prueba')).toBeHidden()
    await expect(page.getByText('Taller de Prueba')).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar negocio' }).fill('zzz')
    await expect(page.getByText('Ningún negocio coincide.')).toBeVisible()
  })

  test('categorías: lista con su tono y sus recuentos', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')

    await expect(page.getByText('Servicios de prueba')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nueva categoría' })).toBeVisible()
    await sinDesplazamientoLateral(page)
  })

  test('el formulario de un negocio avisa en el campo y se cierra', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')

    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo).toBeVisible()
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)

    // Un nombre vacío no se manda: el aviso va en el campo y el campo queda marcado.
    const nombre = dialogo.locator('input[name="nombre"]')
    await nombre.fill('')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(nombre).toHaveAttribute('aria-invalid', 'true')

    // Hay un cambio sin guardar, así que cerrar pide confirmación; al aceptarla el diálogo se cierra.
    let pidioConfirmar = false
    page.once('dialog', (aviso) => {
      pidioConfirmar = true
      void aviso.accept()
    })
    await dialogo.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialogo).toBeHidden()
    expect(pidioConfirmar).toBe(true)
  })

  test('los giros del negocio se añaden, se reordenan y se quitan', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const elegidos = dialogo.locator('.giro-elegido')
    await expect(elegidos).toHaveCount(1)

    await dialogo.locator('[data-anadir-giro-id="servicios-taller"]').click()
    await expect(elegidos).toHaveCount(2)
    await expect(elegidos.nth(1)).toContainText('Taller de prueba')

    await dialogo.getByRole('button', { name: 'Subir Taller de prueba' }).click()
    await expect(elegidos.first()).toContainText('Taller de prueba')

    await dialogo.locator('[data-giro-quitar="servicios-taller"]').click()
    await expect(elegidos).toHaveCount(1)
    await expect(elegidos.first()).toContainText('Servicios')
  })

  test('las fotos de un negocio cambian de portada y se quitan', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const alts = dialogo.locator('[data-alt-foto]')
    await expect(alts).toHaveCount(2)
    await expect(alts.first()).toHaveValue('Fachada')

    await dialogo.locator('[data-foto-portada="1"]').click()
    await expect(alts.first()).toHaveValue('Interior')

    await dialogo.locator('[data-foto-quitar="0"]').click()
    await expect(alts).toHaveCount(1)
    await expect(alts.first()).toHaveValue('Fachada')
  })

  test('el horario del lunes se copia a los demás días', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const lunes = dialogo.locator('.horario-fila[data-dia="mon"]')
    await lunes.locator('select[data-estado]').selectOption('abierto')
    await lunes.locator('[data-rangos]').fill('10:00-20:00')

    await dialogo.getByRole('button', { name: 'Copiar el lunes a todos' }).click()
    const martes = dialogo.locator('.horario-fila[data-dia="tue"]')
    await expect(martes.locator('select[data-estado]')).toHaveValue('abierto')
    await expect(martes.locator('[data-rangos]')).toHaveValue('10:00-20:00')
    await expect(martes.locator('[data-rangos]')).toBeEnabled()
  })

  test('el formulario de una categoría previsualiza el tono, añade giros y sigue el icono', async ({
    page,
  }) => {
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo.locator('form[data-editor="categoria"]')).toBeVisible()
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)

    const tono = dialogo.locator('[data-tono-preview]')
    const fondo = () => tono.evaluate((el) => (el as HTMLElement).style.background)
    await dialogo.locator('[data-campo="hue"]').fill('120')
    const verde = await fondo()
    await dialogo.locator('[data-campo="hue"]').fill('300')
    expect(await fondo()).not.toBe(verde)

    const filas = dialogo.locator('[data-giro]')
    const antes = await filas.count()
    await dialogo.getByRole('button', { name: 'Añadir giro' }).click()
    await expect(filas).toHaveCount(antes + 1)

    // El giro general comparte el icono con su categoría: al cambiar uno, el otro lo sigue.
    const icono = dialogo.locator('select[data-campo="icon"]')
    await icono.selectOption({ index: 2 })
    const elegido = await icono.inputValue()
    await expect(
      dialogo.locator('[data-giro][data-general="true"] [data-campo="giroIcon"]'),
    ).toHaveValue(elegido)
  })

  test('borrar un negocio enseña el impacto primero y pide confirmación', async ({ page }) => {
    const cuerpos: { id: string; confirmar?: boolean }[] = []
    await page.route(/\/api\/panel\/contenido\/negocio\/borrar$/, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as { id: string; confirmar?: boolean }
      cuerpos.push(cuerpo)
      const impacto = {
        negocio: { id: 'cafe-de-prueba', nombre: 'Café de Prueba' },
        plaza: 'Plaza Uno',
        redirecciones: [
          { desde: '/es/lugar/cafe-de-prueba', hacia: '/es/zona/plaza-uno' },
          { desde: '/en/place/cafe-de-prueba', hacia: '/en/area/plaza-uno' },
        ],
        categoriasSinPagina: ['Servicios de prueba'],
        destinoEsPortada: false,
        fotos: 2,
        avisos: ['Sale de las listas, del buscador y del sitemap.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              seco: false,
              pr: { url: 'https://example.test/pr/9', numero: 9, creada: true },
              mensaje: 'Borrado enviado a la PR.',
              impacto,
            }
          : {
              ok: true,
              confirmado: false,
              seco: false,
              pr: null,
              mensaje: 'Esto es lo que cambiaría.',
              impacto,
            },
      })
    })

    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')

    // Primer paso: solo el impacto. No se ha mandado ninguna confirmación.
    await dialogo.getByRole('button', { name: 'Borrar negocio' }).click()
    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('/es/lugar/cafe-de-prueba')
    await expect(impacto).toContainText('/es/zona/plaza-uno')
    await expect(impacto).toContainText('Servicios de prueba')
    expect(cuerpos).toEqual([{ id: 'cafe-de-prueba' }])
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // "Mejor no" lo deja todo como estaba.
    await impacto.getByRole('button', { name: 'Mejor no' }).click()
    await expect(impacto).toBeHidden()
    expect(cuerpos).toHaveLength(1)

    // Segundo paso: confirmar. El diálogo se cierra y la lista avisa de la PR.
    await dialogo.getByRole('button', { name: 'Borrar negocio' }).click()
    await dialogo.getByRole('button', { name: 'Borrar este negocio' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #9' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({ id: 'cafe-de-prueba', confirmar: true })
  })

  test('un negocio nuevo no ofrece borrar', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Nuevo negocio' }).click()
    await expect(page.locator('#editor')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Borrar negocio' })).toHaveCount(0)
  })

  test('plazas: lista con su estado y sus locales', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await expect(page.getByText('Plaza Uno', { exact: true })).toBeVisible()
    await expect(page.getByText('Próximamente', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar Plaza Dos' })).toBeVisible()
    await sinDesplazamientoLateral(page)
  })

  test('editar una plaza sin cambiar lo que se ve se guarda directo', async ({ page }) => {
    const cuerpos: Record<string, unknown>[] = []
    await page.route(/\/api\/panel\/contenido\/plaza$/, async (ruta) => {
      cuerpos.push(ruta.request().postDataJSON() as Record<string, unknown>)
      await ruta.fulfill({
        json: {
          ok: true,
          confirmado: true,
          requiereConfirmacion: false,
          seco: false,
          pr: { url: 'https://example.test/pr/3', numero: 3, creada: false },
          mensaje: 'Cambio enviado a la PR.',
          impacto: {},
        },
      })
    })
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo.locator('input[name="nombre"]')).toHaveValue('Plaza Uno')
    await sinTextoRoto(dialogo)
    await sinDesplazamientoLateral(page)

    await dialogo.locator('input[name="direccion"]').fill('Calle Nueva 9')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'Añadido a la PR #3' })).toBeVisible()
    expect(cuerpos).toHaveLength(1)
    expect(cuerpos[0]).toMatchObject({
      id: 'plaza-uno',
      nombre: 'Plaza Uno',
      direccion: 'Calle Nueva 9',
      activa: true,
      proximamente: false,
    })
    // El formulario nunca manda lo que no se edita.
    expect(Object.keys(cuerpos[0] ?? {})).not.toContain('slug')
    expect(Object.keys(cuerpos[0] ?? {})).not.toContain('geometry')
  })

  test('desactivar una plaza enseña el impacto y no guarda hasta confirmar', async ({ page }) => {
    const cuerpos: Record<string, unknown>[] = []
    await page.route(/\/api\/panel\/contenido\/plaza$/, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as Record<string, unknown>
      cuerpos.push(cuerpo)
      const impacto = {
        plaza: { id: 'plaza-uno', nombre: 'Plaza Uno' },
        cambiaActiva: true,
        activaAntes: true,
        activaDespues: false,
        localesAntes: 1,
        localesDespues: 0,
        categoriasSinPagina: ['Servicios de prueba'],
        categoriasNuevas: [],
        avisos: ['La página de la zona deja de existir y su dirección da 404.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              requiereConfirmacion: true,
              seco: false,
              pr: { url: 'https://example.test/pr/4', numero: 4, creada: true },
              mensaje: 'Cambio enviado a la PR.',
              impacto,
            }
          : {
              ok: true,
              confirmado: false,
              requiereConfirmacion: true,
              seco: false,
              pr: null,
              mensaje: 'Esto es lo que cambiaría.',
              impacto,
            },
      })
    })
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
    const dialogo = page.locator('#editor')
    await dialogo.getByLabel('Activa en la guía').uncheck()
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()

    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('pasa de activa a inactiva')
    await expect(impacto).toContainText('Servicios de prueba')
    await expect(impacto).toContainText('da 404')
    expect(cuerpos).toHaveLength(1)
    expect(cuerpos[0]?.confirmar).toBeUndefined()
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // "Mejor no" lo deja todo como estaba, y cambiar una casilla invalida el impacto mostrado.
    await impacto.getByRole('button', { name: 'Mejor no' }).click()
    await expect(impacto).toBeHidden()
    expect(cuerpos).toHaveLength(1)

    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await dialogo.getByRole('button', { name: 'Guardar este cambio' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #4' })).toBeVisible()
    expect(cuerpos.at(-1)?.confirmar).toBe(true)
  })

  test('una plaza con locales no ofrece borrarse y dice por qué', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo.locator('input[name="nombre"]')).toHaveValue('Plaza Uno')
    await expect(dialogo.getByRole('button', { name: 'Borrar plaza' })).toHaveCount(0)
    await expect(dialogo).toContainText('primero hay que borrar sus locales')
  })

  test('borrar una plaza vacía enseña el impacto primero y pide confirmación', async ({ page }) => {
    const cuerpos: { id: string; confirmar?: boolean }[] = []
    await page.route(/\/api\/panel\/contenido\/plaza\/borrar$/, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as { id: string; confirmar?: boolean }
      cuerpos.push(cuerpo)
      const impacto = {
        plaza: { id: 'plaza-tres', nombre: 'Plaza Tres' },
        redirecciones: [
          { desde: '/es/zona/plaza-tres', hacia: '/es' },
          { desde: '/en/area/plaza-tres', hacia: '/en' },
        ],
        teniaPagina: false,
        redireccionesDeLocales: 0,
        avisos: ['Sus edificios en el mapa se quedan dibujados, en gris.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              seco: false,
              pr: { url: 'https://example.test/pr/12', numero: 12, creada: true },
              mensaje: 'Borrado enviado a la PR.',
              impacto,
            }
          : {
              ok: true,
              confirmado: false,
              seco: false,
              pr: null,
              mensaje: 'Esto es lo que cambiaría.',
              impacto,
            },
      })
    })

    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Tres' }).click()
    const dialogo = page.locator('#editor')

    // Primer paso: solo el impacto, sin confirmación mandada.
    await dialogo.getByRole('button', { name: 'Borrar plaza' }).click()
    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('/es/zona/plaza-tres')
    await expect(impacto).toContainText('en gris')
    expect(cuerpos).toEqual([{ id: 'plaza-tres' }])
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // "Mejor no" lo deja todo como estaba.
    await impacto.getByRole('button', { name: 'Mejor no' }).click()
    await expect(impacto).toBeHidden()
    expect(cuerpos).toHaveLength(1)

    // Segundo paso: confirmar. El diálogo se cierra y la lista avisa de la PR.
    await dialogo.getByRole('button', { name: 'Borrar plaza' }).click()
    await dialogo.getByRole('button', { name: 'Borrar esta plaza' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #12' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({ id: 'plaza-tres', confirmar: true })
  })

  test('activa y próximamente no van juntas y los errores salen en el campo', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Tres' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo.getByLabel('Plaza confirmada y en construcción')).toBeChecked()

    await dialogo.getByLabel('Activa en la guía').check()
    await expect(dialogo.getByLabel('Plaza confirmada y en construcción')).not.toBeChecked()

    // Descripción a medias: el aviso va en el campo que falta.
    await dialogo.locator('textarea[name="descripcionEs"]').fill('Solo en español')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(dialogo.locator('textarea[name="descripcionEn"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('sin permiso el panel lo dice con palabras', async ({ page }) => {
    await abrirPanel(page, { contenidoStatus: 403 })
    await page.locator('[data-vista="negocios"]').click()
    await expect(page.getByText(/Sin permiso/)).toBeVisible()
  })

  test('axe no encuentra violaciones en el resumen, la lista ni el formulario', async ({
    page,
  }) => {
    await abrirPanel(page)
    const revisar = async (donde: string) => {
      const resultado = await new AxeBuilder({ page }).analyze()
      const graves = resultado.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      )
      expect(graves, `${donde}: ${graves.map((v) => v.id).join(', ')}`).toEqual([])
    }

    await revisar('resumen')
    await irA(page, 'negocios', 'Negocios')
    await revisar('negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    await expect(page.locator('#editor')).toBeVisible()
    await revisar('formulario')
  })
})
