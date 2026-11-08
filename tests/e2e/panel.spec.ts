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
    {
      id: 'vacia',
      slug: { es: 'vacia', en: 'empty' },
      label: { es: 'Categoría vacía', en: 'Empty category' },
      icon: 'utensils-crossed',
      hue: 20,
      order: 2,
      synonyms: [],
      giros: [
        {
          id: 'vacia-general',
          label: { es: 'Vacía', en: 'Empty' },
          icon: 'utensils-crossed',
          general: true,
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
      slug: 'zona-dos',
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
      slug: 'taller-nuevo-nombre',
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

/**
 * Los datos de la lista con un caso de cada estado: oculto, cerrado temporalmente, en una plaza
 * inactiva y, a propósito, un local de nombre y giros desmesurados (el peor caso de la fila).
 */
const nombreLargo = `Restaurante${'Interminable'.repeat(9)}`
interface LugarDePrueba {
  id: string
  name: string
  plazaId: string
  active: boolean
  cierre?: { motivo: string; desde: string }
}
const cafe = contenido.places[0] as (typeof contenido.places)[number]
const plazaUno = contenido.plazas[0] as (typeof contenido.plazas)[number]
const conEstados = {
  ...contenido,
  plazas: [
    ...contenido.plazas,
    {
      ...contenido.plazas[0],
      id: 'plaza-cuatro',
      slug: 'plaza-cuatro',
      name: 'Plaza Cuatro',
      active: false,
    },
  ],
  places: [
    ...contenido.places,
    {
      ...cafe,
      id: 'libreria-de-prueba',
      slug: 'libreria-de-prueba',
      name: 'Librería de Prueba',
      photos: [],
      cierre: { motivo: 'vacaciones', desde: hoy },
    },
    {
      ...cafe,
      id: 'panaderia-de-prueba',
      slug: 'panaderia-de-prueba',
      name: 'Panadería de Prueba',
      plazaId: 'plaza-cuatro',
      photos: [],
    },
    {
      ...cafe,
      id: 'nombre-largo',
      slug: 'nombre-largo',
      name: nombreLargo,
      photos: [],
    },
  ],
}

/** El estado de un local según la regla de la guía: lo que el filtro tiene que repetir sin leerla de la interfaz. */
const marcaDe = (lugar: LugarDePrueba): string => {
  if (!lugar.active) return 'no'
  if (conEstados.plazas.find((plaza) => plaza.id === lugar.plazaId)?.active === false)
    return 'plaza'
  return lugar.cierre ? 'cierre' : 'si'
}
const nombresCon = (marca: string): string[] =>
  conEstados.places.filter((lugar) => marcaDe(lugar) === marca).map((lugar) => lugar.name)

interface Opciones {
  /** El estado con el que responde `/api/panel/contenido`: 200 por defecto, 403 si no hay Access. */
  contenidoStatus?: number
  /** Los datos con los que responde: por defecto `contenido`. */
  datos?: object
}

/** Abre el panel con las rutas de lectura simuladas. */
async function abrirPanel(
  page: Page,
  { contenidoStatus = 200, datos = contenido }: Opciones = {},
): Promise<void> {
  await page.route(/\/api\/panel\?dias=\d+$/, (ruta) => ruta.fulfill({ json: estadisticas }))
  await page.route(/\/api\/panel\/contenido$/, (ruta) =>
    contenidoStatus === 200
      ? ruta.fulfill({ json: datos })
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

  test('negocios: filtrar por estado y por plaza, con recuento y salida del vacío', async ({
    page,
  }) => {
    await abrirPanel(page, { datos: conEstados })
    await irA(page, 'negocios', 'Negocios')
    const filas = page.locator('tbody tr .negocio-nombre')
    const nombresVisibles = async () => (await filas.allTextContents()).sort()
    const resultados = page.locator('[data-resultados]')
    const total = conEstados.places.length

    // Sin filtros no hay recuento aparte: el de arriba ya dice el total.
    await expect(resultados).toHaveText('')

    // Cada estado devuelve exactamente los locales que la regla de la guía les da.
    for (const [marca, rotulo] of [
      ['si', 'Visibles'],
      ['no', 'Ocultos'],
      ['cierre', 'Cerrados temporalmente'],
      ['plaza', 'En una plaza inactiva'],
    ] as const) {
      const esperados = nombresCon(marca).sort()
      expect(esperados.length, marca).toBeGreaterThan(0)
      await page
        .getByRole('combobox', { name: 'Filtrar por estado' })
        .selectOption({ label: `${rotulo} (${esperados.length})` })
      expect(await nombresVisibles(), marca).toEqual(esperados)
      await expect(resultados).toHaveText(`${esperados.length} de ${total} negocios`)
    }

    // Los estados reparten todos los locales: ninguno queda sin estado ni con dos.
    expect(
      ['si', 'no', 'cierre', 'plaza'].reduce((suma, marca) => suma + nombresCon(marca).length, 0),
    ).toBe(total)

    // Estado y plaza se combinan.
    await page.getByRole('combobox', { name: 'Filtrar por estado' }).selectOption('')
    const plazaFiltro = plazaUno
    await page.getByRole('combobox', { name: 'Filtrar por plaza' }).selectOption(plazaFiltro.id)
    const enPlaza = conEstados.places
      .filter((lugar) => lugar.plazaId === plazaFiltro.id)
      .map((lugar) => lugar.name)
      .sort()
    expect(await nombresVisibles()).toEqual(enPlaza)

    // Un filtro sin resultados ofrece quitarlos, y el foco vuelve al buscador (el botón desaparece).
    await page.getByRole('combobox', { name: 'Filtrar por estado' }).selectOption({ index: 4 })
    await page.getByRole('searchbox', { name: 'Buscar negocio' }).fill('zzz')
    await expect(page.getByText('Ningún negocio coincide.')).toBeVisible()
    await expect(resultados).toHaveText(`0 de ${total} negocios`)
    await page.getByRole('button', { name: 'Quitar filtros' }).click()
    await expect(filas).toHaveCount(total)
    await expect(resultados).toHaveText('')
    await expect(page.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Filtrar por plaza' })).toHaveValue('')
    await expect(page.getByRole('searchbox', { name: 'Buscar negocio' })).toBeFocused()
  })

  test('negocios: la plaza y los giros se ven bajo el nombre solo cuando no hay columnas', async ({
    page,
  }) => {
    await abrirPanel(page, { datos: conEstados })
    await irA(page, 'negocios', 'Negocios')
    const ancho = page.viewportSize()?.width ?? 0
    const detalle = page
      .locator('tbody tr', { hasText: 'Café de Prueba' })
      .locator('.negocio-detalle')
    // 52 rem es el punto de ruptura de las columnas de la tabla.
    if (ancho <= 52 * 16) {
      await expect(detalle).toBeVisible()
      await expect(detalle).toContainText('Plaza Uno')
    } else {
      await expect(detalle).toBeHidden()
    }
  })

  test('negocios: un nombre desmesurado no desplaza la página ni tapa el botón', async ({
    page,
  }) => {
    await abrirPanel(page, { datos: conEstados })
    await irA(page, 'negocios', 'Negocios')
    const fila = page.locator('tbody tr', { hasText: nombreLargo })
    await expect(fila).toBeVisible()
    await sinDesplazamientoLateral(page)
    const boton = fila.getByRole('button', { name: `Editar ${nombreLargo}` })
    await boton.scrollIntoViewIfNeeded()
    const caja = await boton.boundingBox()
    const ventana = page.viewportSize()?.width ?? 0
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(40)
    expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(ventana)
  })

  test('categorías: una búsqueda sin resultados ofrece quitarla', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('searchbox', { name: 'Buscar categoría' }).fill('zzz')
    await expect(page.getByText('Ninguna categoría coincide.')).toBeVisible()
    await page.getByRole('button', { name: 'Quitar la búsqueda' }).click()
    await expect(page.getByText('Servicios de prueba')).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Buscar categoría' })).toBeFocused()
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

  test('una categoría con locales no ofrece borrarse y dice por qué', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo.locator('form[data-editor="categoria"]')).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Borrar categoría' })).toHaveCount(0)
    await expect(dialogo).toContainText('primero cambia el giro de sus')
  })

  test('borrar una categoría vacía enseña el impacto primero y pide confirmación', async ({
    page,
  }) => {
    const cuerpos: { id: string; confirmar?: boolean }[] = []
    await page.route(/\/api\/panel\/contenido\/categoria\/borrar$/, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as { id: string; confirmar?: boolean }
      cuerpos.push(cuerpo)
      const impacto = {
        categoria: { id: 'vacia', nombre: 'Categoría vacía' },
        giros: ['Vacía'],
        gustosDeLocalesBorrados: 0,
        avisos: ['No se pierde ninguna dirección.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              seco: false,
              pr: { url: 'https://example.test/pr/14', numero: 14, creada: true },
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
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Categoría vacía' }).click()
    const dialogo = page.locator('#editor')

    // Primer paso: solo el impacto, sin confirmación mandada.
    await dialogo.getByRole('button', { name: 'Borrar categoría' }).click()
    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('Si borras Categoría vacía')
    await expect(impacto).toContainText('No se pierde ninguna dirección')
    expect(cuerpos).toEqual([{ id: 'vacia' }])
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
    await dialogo.getByRole('button', { name: 'Borrar categoría' }).click()
    await dialogo.getByRole('button', { name: 'Borrar esta categoría' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #14' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({ id: 'vacia', confirmar: true })
  })

  /** Simula `/negocio/slug` o `/plaza/slug`: sin confirmar el impacto, con confirmar la PR. */
  async function simularCambioDeDireccion(
    page: Page,
    tipo: 'negocio' | 'plaza' | 'categoria',
    numeroDePr: number,
  ): Promise<{ id: string; slug: string; lang?: string; confirmar?: boolean }[]> {
    const cuerpos: { id: string; slug: string; lang?: string; confirmar?: boolean }[] = []
    const [es, en] =
      tipo === 'negocio'
        ? ['lugar', 'place']
        : tipo === 'plaza'
          ? ['zona', 'area']
          : ['categoria', 'category']
    await page.route(new RegExp(`/api/panel/contenido/${tipo}/slug$`), async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as {
        id: string
        slug: string
        lang?: string
        confirmar?: boolean
      }
      cuerpos.push(cuerpo)
      const idiomas = cuerpo.lang ? [cuerpo.lang] : ['es', 'en']
      const impacto = {
        tipo: tipo === 'negocio' ? 'place' : tipo === 'plaza' ? 'plaza' : 'category',
        lang: cuerpo.lang ?? null,
        entidad: { id: cuerpo.id, nombre: 'Nombre de prueba' },
        antes: 'direccion-de-antes',
        despues: cuerpo.slug,
        redirecciones: idiomas.map((i) => {
          const seg = i === 'es' ? es : en
          return { desde: `/${i}/${seg}/direccion-de-antes`, hacia: `/${i}/${seg}/${cuerpo.slug}` }
        }),
        anterioresQueSeguiran: 0,
        vuelveAUnaAnterior: false,
        tienePagina: true,
        avisos: ['La dirección antigua pasa, con un 301, a la nueva.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              seco: false,
              pr: {
                url: `https://example.test/pr/${numeroDePr}`,
                numero: numeroDePr,
                creada: true,
              },
              mensaje: 'Cambio enviado a la PR.',
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
    return cuerpos
  }

  test('cambiar la dirección de un negocio enseña el impacto primero y pide confirmación', async ({
    page,
  }) => {
    const cuerpos = await simularCambioDeDireccion(page, 'negocio', 15)
    // Intro en el campo no puede enviar el formulario entero: eso guardaría el negocio.
    const guardados: unknown[] = []
    await page.route(/\/api\/panel\/contenido\/negocio$/, async (ruta) => {
      guardados.push(ruta.request().postDataJSON())
      await ruta.fulfill({ status: 500, json: { ok: false, problemas: ['no debía guardarse'] } })
    })

    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const campo = dialogo.locator('[data-slug-nuevo]')
    // El id y la dirección son distintos a propósito: la petición lleva el id.
    await expect(dialogo).toContainText('/es/lugar/taller-nuevo-nombre')
    await expect(campo).toHaveValue('taller-nuevo-nombre')

    // Primer paso: solo el impacto, sin confirmación mandada.
    await campo.fill('taller-con-otro-nombre')
    await dialogo.getByRole('button', { name: 'Ver el impacto' }).click()
    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('/es/lugar/direccion-de-antes')
    await expect(impacto).toContainText('/es/lugar/taller-con-otro-nombre')
    await expect(impacto).toContainText('301')
    expect(cuerpos).toEqual([{ id: 'taller-de-prueba', slug: 'taller-con-otro-nombre' }])
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // Escribir otra cosa descarta el impacto: describía otra dirección.
    await campo.fill('taller-con-otra-mas')
    await expect(impacto).toBeHidden()

    // Intro pide el impacto y no guarda el negocio.
    await campo.press('Enter')
    await expect(impacto).toContainText('/es/lugar/taller-con-otra-mas')
    expect(guardados).toEqual([])
    expect(cuerpos).toHaveLength(2)

    // "Mejor no" lo deja todo como estaba y devuelve el foco al campo.
    await impacto.getByRole('button', { name: 'Mejor no' }).click()
    await expect(impacto).toBeHidden()
    await expect(campo).toBeFocused()
    expect(cuerpos).toHaveLength(2)

    // Segundo paso: confirma lo que se vio, no lo que haya en el campo. El diálogo se cierra y avisa.
    await dialogo.getByRole('button', { name: 'Ver el impacto' }).click()
    await campo.evaluate((el) => {
      ;(el as HTMLInputElement).value = 'otra-distinta-que-no-se-vio'
    })
    await dialogo.getByRole('button', { name: 'Cambiar la dirección' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #15' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({
      id: 'taller-de-prueba',
      slug: 'taller-con-otra-mas',
      confirmar: true,
    })
    expect(guardados).toEqual([])
  })

  test('con cambios sin guardar no se cambia la dirección: el cambio solo guardaría la dirección', async ({
    page,
  }) => {
    const cuerpos = await simularCambioDeDireccion(page, 'negocio', 16)
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    const dialogo = page.locator('#editor')
    await dialogo.locator('input[name="nombre"]').fill('Otro nombre sin guardar')
    await dialogo.locator('[data-slug-nuevo]').fill('direccion-nueva')
    await dialogo.getByRole('button', { name: 'Ver el impacto' }).click()
    await expect(dialogo.locator('[data-problemas]')).toContainText('cambios sin guardar')
    await expect(dialogo.locator('.impacto-borrado')).toHaveCount(0)
    expect(cuerpos).toEqual([])
  })

  test('cambiar la dirección de una plaza usa su propia ruta y su propio prefijo', async ({
    page,
  }) => {
    const cuerpos = await simularCambioDeDireccion(page, 'plaza', 17)
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Dos' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo).toContainText('/es/zona/zona-dos')
    await dialogo.locator('[data-slug-nuevo]').fill('zona-segunda')
    await dialogo.getByRole('button', { name: 'Ver el impacto' }).click()
    const impacto = dialogo.locator('.impacto-borrado')
    await expect(impacto).toContainText('/es/zona/zona-segunda')
    await sinDesplazamientoLateral(page)
    await impacto.getByRole('button', { name: 'Cambiar la dirección' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #17' })).toBeVisible()
    expect(cuerpos).toEqual([
      { id: 'plaza-dos', slug: 'zona-segunda' },
      { id: 'plaza-dos', slug: 'zona-segunda', confirmar: true },
    ])
  })

  test('un error del Worker sale en el formulario y no deja un impacto a medias', async ({
    page,
  }) => {
    await page.route(/\/api\/panel\/contenido\/negocio\/slug$/, (ruta) =>
      ruta.fulfill({
        status: 400,
        json: { ok: false, problemas: ['"otro" ya es la dirección de otro.'] },
      }),
    )
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    const dialogo = page.locator('#editor')
    await dialogo.locator('[data-slug-nuevo]').fill('otro')
    await dialogo.getByRole('button', { name: 'Ver el impacto' }).click()
    await expect(dialogo.locator('[data-problemas]')).toContainText('ya es la dirección de otro')
    await expect(dialogo.locator('.impacto-borrado')).toHaveCount(0)
  })

  test('una categoría tiene un slug por idioma: cada sección pide y confirma el suyo', async ({
    page,
  }) => {
    const cuerpos = await simularCambioDeDireccion(page, 'categoria', 18)
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    const enEspanol = dialogo.locator('section[data-direccion][data-lang="es"]')
    const enIngles = dialogo.locator('section[data-direccion][data-lang="en"]')
    await expect(enEspanol).toContainText('/es/categoria/servicios')
    await expect(enIngles).toContainText('/en/category/services')

    // Solo el inglés: la petición lleva SU valor y su idioma, no el primer campo del formulario.
    await enIngles.locator('[data-slug-nuevo]').fill('test-services-renamed')
    await enIngles.getByRole('button', { name: /Ver el impacto/ }).click()
    await expect(enIngles.locator('.impacto-borrado')).toContainText(
      '/en/category/test-services-renamed',
    )
    await expect(enEspanol.locator('.impacto-borrado')).toHaveCount(0)
    expect(cuerpos).toEqual([{ id: 'servicios', slug: 'test-services-renamed', lang: 'en' }])
    await sinDesplazamientoLateral(page)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // Intro en el campo español pide el impacto del español, sin enviar el formulario ni tocar el inglés.
    await enEspanol.locator('[data-slug-nuevo]').fill('servicios-renombrados')
    await enEspanol.locator('[data-slug-nuevo]').press('Enter')
    await expect(enEspanol.locator('.impacto-borrado')).toContainText(
      '/es/categoria/servicios-renombrados',
    )
    expect(cuerpos.at(-1)).toEqual({ id: 'servicios', slug: 'servicios-renombrados', lang: 'es' })
    // Escribir en un campo solo descarta SU impacto.
    await enIngles.locator('[data-slug-nuevo]').fill('otro-ingles')
    await expect(enIngles.locator('.impacto-borrado')).toBeHidden()
    await expect(enEspanol.locator('.impacto-borrado')).toBeVisible()

    // Confirmar en la sección española manda el español, no lo que haya en el campo inglés.
    await enEspanol.getByRole('button', { name: 'Cambiar la dirección' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #18' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({
      id: 'servicios',
      slug: 'servicios-renombrados',
      lang: 'es',
      confirmar: true,
    })
  })

  test('una categoría con cambios sin guardar tampoco cambia la dirección', async ({ page }) => {
    const cuerpos = await simularCambioDeDireccion(page, 'categoria', 19)
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    await dialogo.locator('input[data-campo="labelEs"]').fill('Otro nombre')
    await dialogo.locator('section[data-lang="es"] [data-slug-nuevo]').fill('direccion-nueva')
    await dialogo
      .locator('section[data-lang="es"]')
      .getByRole('button', { name: /Ver el impacto/ })
      .click()
    await expect(dialogo.locator('[data-problemas]')).toContainText('cambios sin guardar')
    expect(cuerpos).toEqual([])
  })

  test('un giro sin locales se borra en dos pasos; el general no ofrece borrarse', async ({
    page,
  }) => {
    const cuerpos: { id: string; confirmar?: boolean }[] = []
    await page.route(/\/api\/panel\/contenido\/giro\/borrar$/, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as { id: string; confirmar?: boolean }
      cuerpos.push(cuerpo)
      const impacto = {
        giro: { id: cuerpo.id, nombre: 'Taller de prueba' },
        categoria: { id: 'servicios', nombre: 'Servicios de prueba' },
        gustosDeLocalesBorrados: 0,
        avisos: ['Ninguna página cambia.'],
      }
      await ruta.fulfill({
        json: cuerpo.confirmar
          ? {
              ok: true,
              confirmado: true,
              seco: false,
              pr: { url: 'https://example.test/pr/20', numero: 20, creada: true },
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
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    const general = dialogo.locator('[data-giro][data-id="servicios-general"]')
    const taller = dialogo.locator('[data-giro][data-id="servicios-taller"]')
    await expect(general).toContainText('No se borra')
    await expect(general.getByRole('button', { name: 'Borrar giro' })).toHaveCount(0)

    // Primer paso: solo el impacto, sin confirmación mandada.
    await taller.getByRole('button', { name: 'Borrar giro' }).click()
    const impacto = taller.locator('.impacto-borrado')
    await expect(impacto).toContainText('Si borras Taller de prueba')
    await expect(impacto).toContainText('Ninguna página cambia')
    expect(cuerpos).toEqual([{ id: 'servicios-taller' }])
    await sinDesplazamientoLateral(page)
    await sinTextoRoto(dialogo)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])

    // "Mejor no" lo deja todo como estaba y devuelve el foco al botón.
    await impacto.getByRole('button', { name: 'Mejor no' }).click()
    await expect(impacto).toBeHidden()
    await expect(taller.getByRole('button', { name: 'Borrar giro' })).toBeFocused()
    expect(cuerpos).toHaveLength(1)

    // Segundo paso: confirmar. El diálogo se cierra y la lista avisa de la PR.
    await taller.getByRole('button', { name: 'Borrar giro' }).click()
    await taller.getByRole('button', { name: 'Borrar este giro' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #20' })).toBeVisible()
    expect(cuerpos.at(-1)).toEqual({ id: 'servicios-taller', confirmar: true })
  })

  test('con cambios sin guardar no se borra un giro: al terminar se cierra el formulario', async ({
    page,
  }) => {
    const cuerpos: unknown[] = []
    await page.route(/\/api\/panel\/contenido\/giro\/borrar$/, async (ruta) => {
      cuerpos.push(ruta.request().postDataJSON())
      await ruta.fulfill({ status: 500, json: { ok: false, problemas: ['no debía llamarse'] } })
    })
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    const dialogo = page.locator('#editor')
    await dialogo.locator('input[data-campo="labelEs"]').fill('Otro nombre sin guardar')
    await dialogo
      .locator('[data-giro][data-id="servicios-taller"]')
      .getByRole('button', { name: 'Borrar giro' })
      .click()
    await expect(dialogo.locator('[data-problemas]')).toContainText('cambios sin guardar')
    expect(cuerpos).toEqual([])
  })

  test('un formulario largo tiene un índice fijo que lleva a cada sección y mueve el foco', async ({
    page,
  }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const indice = dialogo.getByRole('navigation', { name: 'Ir a una sección del formulario' })
    await expect(indice).toBeVisible()
    const nombres = await indice.getByRole('link').allInnerTexts()
    expect(nombres).toEqual(
      expect.arrayContaining(['Identidad', 'Fotos', 'Contacto', 'Zona delicada']),
    )
    // Un enlace por sección, sin la aclaración de su título ("la primera es la portada").
    expect(nombres.every((nombre) => !nombre.includes('portada'))).toBe(true)

    // Llevar a "Zona delicada" desde arriba: la sección entra en la vista y su título recibe el foco.
    await indice.getByRole('link', { name: 'Zona delicada' }).click()
    const titulo = dialogo.getByRole('heading', { name: 'Zona delicada' })
    await expect(titulo).toBeFocused()
    await expect(titulo).toBeInViewport()
    // El índice sigue a la vista al bajar: es lo que lo hace útil en una pantalla pequeña.
    await expect(indice).toBeInViewport()
    await sinDesplazamientoLateral(page)
    const graves = (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves.map((v) => v.id)).toEqual([])
  })

  test('lo que deja una redirección o no se deshace va en su zona, no junto a Guardar', async ({
    page,
  }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const zona = dialogo.locator('section.zona-delicada')
    await expect(zona.getByRole('button', { name: 'Borrar negocio' })).toBeVisible()
    await expect(zona.getByRole('button', { name: /Ver el impacto/ })).toBeVisible()
    // El pie queda con lo normal: guardar o cancelar. Nada de borrar al lado de "Guardar cambios".
    const pie = dialogo.locator('.editor-pie')
    await expect(pie.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    await expect(pie.getByRole('button', { name: 'Cancelar' })).toBeVisible()
    await expect(pie.getByRole('button', { name: /Borrar/ })).toHaveCount(0)

    // Lo mismo en una plaza sin locales y en una categoría vacía.
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Tres' }).click()
    await expect(
      dialogo.locator('section.zona-delicada').getByRole('button', { name: 'Borrar plaza' }),
    ).toBeVisible()
    await expect(
      dialogo.locator('.editor-pie').getByRole('button', { name: /Borrar/ }),
    ).toHaveCount(0)
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Categoría vacía' }).click()
    await expect(
      dialogo.locator('section.zona-delicada').getByRole('button', { name: 'Borrar categoría' }),
    ).toBeVisible()
    await expect(
      dialogo.locator('.editor-pie').getByRole('button', { name: /Borrar/ }),
    ).toHaveCount(0)
  })

  test('una plaza con locales no ofrece borrarse, pero su dirección sigue en la zona delicada', async ({
    page,
  }) => {
    await abrirPanel(page)
    await irA(page, 'plazas', 'Plazas')
    await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
    const zona = page.locator('#editor section.zona-delicada')
    await expect(zona.getByRole('button', { name: /Ver el impacto/ })).toBeVisible()
    await expect(zona.getByRole('button', { name: 'Borrar plaza' })).toHaveCount(0)
  })

  test('los textos concuerdan en número: "1 local", no "1 locales"', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'categorias', 'Categorías y giros')
    await page.getByRole('button', { name: 'Editar Categoría vacía' }).click()
    const dialogo = page.locator('#editor')
    await expect(dialogo).not.toContainText(/\b1 locales\b|\b1 plazas\b/)
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('button', { name: 'Editar Servicios de prueba' }).click()
    await expect(dialogo).not.toContainText(/\b1 locales\b|\b1 plazas\b/)
  })

  test('un negocio nuevo no ofrece cambiar la dirección', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Nuevo negocio' }).click()
    await expect(page.locator('#editor').locator('[data-slug-nuevo]')).toHaveCount(0)
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
