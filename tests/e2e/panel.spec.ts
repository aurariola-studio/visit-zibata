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

import extentJson from '../../data/geographic/extent.json' with { type: 'json' }

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
const categoriaUno = contenido.categories[0] as (typeof contenido.categories)[number]
const conEstados = {
  ...contenido,
  categories: [
    ...contenido.categories,
    {
      ...categoriaUno,
      id: 'categoria-larga',
      slug: { es: 'categoria-larga', en: 'long-category' },
      label: { es: nombreLargo, en: nombreLargo },
      giros: [
        {
          ...(categoriaUno.giros[0] as (typeof categoriaUno.giros)[number]),
          id: 'giro-largo',
          label: { es: nombreLargo, en: nombreLargo },
        },
      ],
    },
  ],
  plazas: [
    ...contenido.plazas,
    { ...plazaUno, id: 'plaza-larga', slug: 'plaza-larga', name: nombreLargo },
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
      // En la plaza de nombre largo y con tres giros, uno de ellos de nombre largo: el peor caso de las
      // columnas de plaza y giros, que no pueden quedarse sin partir línea.
      ...cafe,
      id: 'lugar-con-giros-largos',
      slug: 'lugar-con-giros-largos',
      name: 'Lugar con giros largos',
      plazaId: 'plaza-larga',
      giros: ['servicios-general', 'servicios-taller', 'giro-largo'],
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

/**
 * El contorno de dos plazas del panel simulado, en el centro real de Zibatá (el aviso del panel usa el
 * contorno de verdad), y un local dentro de la primera. Datos de la prueba: no son ninguna plaza real.
 */
const [centroLng = 0, centroLat = 0] = extentJson.center as [number, number]
const seis = (n: number) => Number(n.toFixed(6))
const cuadradoEn = (lng: number, lat: number, lado = 0.002) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [seis(lng - lado / 2), seis(lat - lado / 2)],
      [seis(lng + lado / 2), seis(lat - lado / 2)],
      [seis(lng + lado / 2), seis(lat + lado / 2)],
      [seis(lng - lado / 2), seis(lat + lado / 2)],
      [seis(lng - lado / 2), seis(lat - lado / 2)],
    ],
  ],
})
const conContorno = {
  ...contenido,
  plazas: contenido.plazas.map((plaza) =>
    plaza.id === 'plaza-uno'
      ? {
          ...plaza,
          coordinates: { lat: centroLat, lng: centroLng },
          geometry: cuadradoEn(centroLng, centroLat),
        }
      : plaza.id === 'plaza-dos'
        ? { ...plaza, geometry: cuadradoEn(centroLng + 0.004, centroLat) }
        : plaza,
  ),
  places: contenido.places.map((lugar) =>
    lugar.id === 'cafe-de-prueba'
      ? { ...lugar, location: { lat: centroLat, lng: seis(centroLng + 0.0003) } }
      : lugar,
  ),
}
const impactoDePrueba = {
  plaza: { id: 'plaza-uno', nombre: 'Plaza Uno' },
  vertices: { antes: 4, despues: 4 },
  area: { antes: 1000, despues: 1100, cambio: 100 },
  locales: { quedanFuera: [], vuelvenDentro: [], siguenFuera: 0 },
  avisos: ['Aviso de prueba del contorno.'],
}

interface Opciones {
  /** El estado con el que responde `/api/panel/contenido`: 200 por defecto, 403 si no hay Access. */
  contenidoStatus?: number
  /** Los datos con los que responde: por defecto `contenido`. */
  datos?: object
}

/** Abre el panel con las rutas de lectura simuladas. */
/** Un ajuste con un motivo larguísimo y sin espacios: el peor caso para la tabla en un teléfono. */
const ajustesDePrueba = [
  {
    accion: 'ocultar' as const,
    punto: { lat: 20.69, lng: -100.35 },
    motivo: `Demolido ${'sinespaciosylargo'.repeat(8)}`,
    creado: '2026-11-01',
  },
  {
    accion: 'altura' as const,
    alturaM: 10.5,
    punto: { lat: 20.6905, lng: -100.3455 },
    motivo: 'Medida en el sitio',
    creado: '2026-11-02',
  },
]

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

  test('a cualquier ancho cada sección cabe en el espacio que tiene, sin desplazarse', async ({
    page,
  }) => {
    // Del teléfono más estrecho a una pantalla grande, con los saltos del diseño (la barra lateral
    // aparece en 60 rem, las columnas de la tabla se quitan en 52 y el diálogo pasa a pantalla
    // completa en 44) a un píxel de cada lado. A 320 px la tabla de negocios se desplazaba por dentro:
    // con el nombre, "Cerrado temporalmente" y el botón en una sola línea cada uno no cabía.
    const anchos = [
      320, 375, 414, 640, 703, 704, 768, 831, 832, 833, 900, 959, 960, 961, 1000, 1024, 1100, 1280,
      1440,
    ]
    const secciones = [
      ['resumen', 'Resumen'],
      ['sugerencias', 'Sugerencias'],
      ['negocios', 'Negocios'],
      ['categorias', 'Categorías y giros'],
      ['plazas', 'Plazas'],
      ['edificios', 'Edificios'],
    ] as const
    await abrirPanel(page, {
      datos: { ...conEstados, edificios: { valido: true, ajustes: ajustesDePrueba } },
    })

    const fallos: string[] = []
    for (const ancho of anchos) {
      await page.setViewportSize({ width: ancho, height: 900 })
      for (const [vista, titulo] of secciones) {
        await irA(page, vista, titulo)
        const sobra = await page.evaluate(() => {
          const raiz = document.documentElement
          const tabla = document.querySelector('.tabla')
          return {
            pagina: raiz.scrollWidth - raiz.clientWidth,
            // Lo que no cabe en la tabla y se esconde tras una barra de desplazamiento propia.
            tabla: tabla ? tabla.scrollWidth - tabla.clientWidth : 0,
          }
        })
        if (sobra.pagina > 0)
          fallos.push(`${ancho}px ${vista}: la página se desplaza ${sobra.pagina}px`)
        if (sobra.tabla > 1)
          fallos.push(`${ancho}px ${vista}: la tabla se desplaza ${sobra.tabla}px por dentro`)
      }
    }
    expect(fallos).toEqual([])
  })

  test('negocios: un nombre desmesurado no desplaza la página ni tapa el botón', async ({
    page,
  }) => {
    await abrirPanel(page, { datos: conEstados })
    await irA(page, 'negocios', 'Negocios')
    // Por el nombre del local: el texto largo también sale en la plaza y el giro de otra fila.
    const fila = page.locator('tbody tr', {
      has: page.locator('.negocio-nombre', { hasText: nombreLargo }),
    })
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

    // Hay un cambio sin guardar, así que cerrar pregunta, y al descartar el diálogo se cierra.
    await dialogo.getByRole('button', { name: 'Cerrar' }).click()
    await page.getByRole('button', { name: 'Descartar cambios' }).click()
    await expect(dialogo).toBeHidden()
  })

  test('cambios sin guardar: se pregunta con un diálogo propio y se puede seguir editando', async ({
    page,
  }) => {
    // El `confirm()` del navegador ya no se usa: si saltara, la prueba lo vería y fallaría.
    let nativo = false
    page.on('dialog', (aviso) => {
      nativo = true
      void aviso.dismiss()
    })
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    const dialogo = page.locator('#editor')
    const pregunta = page.getByRole('dialog', { name: '¿Descartar los cambios?' })
    await expect(dialogo).toBeVisible()

    // Sin cambios, cerrar no pregunta nada.
    await dialogo.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(pregunta).toBeHidden()

    // Con un cambio, tanto el botón como Escape preguntan, y el foco empieza en la opción segura.
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    await dialogo.locator('input[name="nombre"]').fill('Otro nombre')
    await dialogo.getByRole('button', { name: 'Cerrar' }).click()
    await expect(pregunta).toBeVisible()
    await expect(pregunta.getByRole('button', { name: 'Seguir editando' })).toBeFocused()

    // Escape en la pregunta es seguir editando: el formulario sigue abierto con lo escrito.
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeHidden()
    await expect(dialogo).toBeVisible()
    await expect(dialogo.locator('input[name="nombre"]')).toHaveValue('Otro nombre')

    // Escape en el formulario también pregunta, en vez de cerrarlo sin avisar.
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeVisible()
    await pregunta.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(dialogo).toBeVisible()

    // Escape, Escape y otra vez Escape, sin un solo clic entre medias: el navegador deja de permitir
    // cancelar el cierre si no hay activación del usuario, y el formulario no debe cerrarse por eso.
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(pregunta).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.locator('input[name="nombre"]')).toHaveValue('Otro nombre')

    // Descartar cierra y el foco vuelve a la lista, sin pasar por el aviso del navegador.
    await dialogo.getByRole('button', { name: 'Cerrar' }).click()
    await pregunta.getByRole('button', { name: 'Descartar cambios' }).click()
    await expect(dialogo).toBeHidden()
    await expect(pregunta).toBeHidden()
    expect(nativo).toBe(false)
  })

  test('el resumen dice si hay cambios esperando revisión', async ({ page }) => {
    // En desarrollo (`seco`) no se commitea nada, y el resumen lo dice en vez de prometer una PR.
    await abrirPanel(page)
    await expect(page.locator('[data-pendiente]')).toContainText('no hay nada pendiente')

    await abrirPanel(page, { datos: { ...contenido, seco: false } })
    await expect(page.locator('[data-pendiente]')).toContainText('No hay cambios pendientes')

    const pr = { url: 'https://github.com/o/r/pull/7', numero: 7 }
    await abrirPanel(page, { datos: { ...contenido, seco: false, pr } })
    const bloque = page.locator('[data-pendiente]')
    await expect(bloque).toContainText('Hay cambios esperando revisión')
    await expect(bloque.getByRole('link', { name: 'Revisar la PR #7' })).toHaveAttribute(
      'href',
      pr.url,
    )
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

  test('un negocio nuevo nace visible y no se puede ocultar de nacimiento', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Nuevo negocio' }).click()
    const visible = page.locator('#editor').getByRole('checkbox', { name: 'Visible en la guía' })
    await expect(visible).toBeChecked()
    await expect(visible).toBeDisabled()
    await expect(page.locator('#editor')).toContainText('Un negocio nuevo se crea visible')
  })

  test('un local visible no puede elegir una plaza que no abre, y uno oculto sí', async ({
    page,
  }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Nuevo negocio' }).click()
    const plaza = page.locator('#editor select[name="plazaId"]')
    await expect(plaza.locator('option', { hasText: 'Plaza Tres' })).toHaveAttribute('disabled', '')
    await expect(plaza.locator('option', { hasText: 'Plaza Uno' })).not.toHaveAttribute('disabled')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Editar Café de Prueba' }).click()
    await expect(
      page.locator('#editor select[name="plazaId"] option', { hasText: 'Plaza Tres' }),
    ).toHaveAttribute('disabled', '')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Editar Taller de Prueba' }).click()
    await expect(
      page.locator('#editor select[name="plazaId"] option', { hasText: 'Plaza Tres' }),
    ).not.toHaveAttribute('disabled')
  })

  test('un negocio nuevo no ofrece borrar', async ({ page }) => {
    await abrirPanel(page)
    await irA(page, 'negocios', 'Negocios')
    await page.getByRole('button', { name: 'Nuevo negocio' }).click()
    await expect(page.locator('#editor')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Borrar negocio' })).toHaveCount(0)
  })

  test.describe('edificios', () => {
    const conAjustes = { ...contenido, edificios: { valido: true, ajustes: ajustesDePrueba } }

    test('sin ajustes lo dice y no enseña una tabla vacía', async ({ page }) => {
      await abrirPanel(page)
      await irA(page, 'edificios', 'Edificios')
      await expect(page.getByText('Todavía no hay ajustes')).toBeVisible()
      await expect(page.locator('.tabla')).toHaveCount(0)
      await sinDesplazamientoLateral(page)
    })

    test('lista cada ajuste con lo que hace, el punto y el motivo', async ({ page }) => {
      await abrirPanel(page, { datos: conAjustes })
      await irA(page, 'edificios', 'Edificios')
      await expect(page.getByText('2 ajustes de edificios')).toBeVisible()
      await expect(page.getByText('Oculto', { exact: true })).toBeVisible()
      await expect(page.getByText(/Altura fijada a 10[.,]5 m/)).toBeVisible()
      await expect(page.getByText('Medida en el sitio')).toBeVisible()
      await sinDesplazamientoLateral(page)
    })

    test('un archivo inválido se avisa y el resto sigue', async ({ page }) => {
      await abrirPanel(page, { datos: { ...contenido, edificios: { valido: false, ajustes: [] } } })
      await irA(page, 'edificios', 'Edificios')
      await expect(page.getByRole('alert').filter({ hasText: 'no pasa el esquema' })).toBeVisible()
    })

    test('quitar un ajuste enseña lo que cambia y confirma lo que se vio', async ({ page }) => {
      const cuerpos: Record<string, unknown>[] = []
      await page.route(/\/api\/panel\/contenido\/edificio$/, async (ruta) => {
        const cuerpo = ruta.request().postDataJSON() as Record<string, unknown>
        cuerpos.push(cuerpo)
        await ruta.fulfill({
          json: {
            ok: true,
            confirmado: cuerpo.confirmar === true,
            seco: false,
            pr: cuerpo.confirmar
              ? { url: 'https://example.test/pr/8', numero: 8, creada: true }
              : null,
            mensaje: cuerpo.confirmar ? 'Ajuste quitado en la PR.' : 'Esto es lo que cambiaría.',
            resumen: {
              operacion: 'quitar',
              total: 1,
              avisos: ['El edificio vuelve a aparecer en el mapa.'],
            },
          },
        })
      })
      await abrirPanel(page, { datos: conAjustes })
      await irA(page, 'edificios', 'Edificios')
      await page.getByRole('button', { name: /Quitar el ajuste: Oculto/ }).click()
      const dialogo = page.locator('#editor')
      await expect(dialogo.getByRole('heading', { name: 'Se quitará este ajuste' })).toBeVisible()
      await expect(dialogo.getByText('vuelve a aparecer en el mapa')).toBeVisible()
      // El primer paso no confirma nada.
      expect(cuerpos).toHaveLength(1)
      expect(cuerpos[0]).toEqual({ operacion: 'quitar', punto: { lat: 20.69, lng: -100.35 } })
      await dialogo.getByRole('button', { name: 'Quitar ajuste' }).click()
      await expect(dialogo).toBeHidden()
      await expect(page.getByRole('status').filter({ hasText: 'PR abierta #8' })).toBeVisible()
      expect(cuerpos).toHaveLength(2)
      expect(cuerpos[1]).toEqual({ ...cuerpos[0], confirmar: true })
    })

    test('"Mejor no" cierra sin mandar nada más', async ({ page }) => {
      const cuerpos: unknown[] = []
      await page.route(/\/api\/panel\/contenido\/edificio$/, async (ruta) => {
        cuerpos.push(ruta.request().postDataJSON())
        await ruta.fulfill({
          json: {
            ok: true,
            confirmado: false,
            seco: false,
            pr: null,
            mensaje: '',
            resumen: { operacion: 'quitar', total: 1, avisos: ['Aviso.'] },
          },
        })
      })
      await abrirPanel(page, { datos: conAjustes })
      await irA(page, 'edificios', 'Edificios')
      await page.getByRole('button', { name: /Quitar el ajuste: Oculto/ }).click()
      await page.locator('#editor').getByRole('button', { name: 'Mejor no' }).click()
      await expect(page.locator('#editor')).toBeHidden()
      expect(cuerpos).toHaveLength(1)
    })

    test('si el servidor lo rechaza, lo dice y no hay botón para confirmar', async ({ page }) => {
      await page.route(/\/api\/panel\/contenido\/edificio$/, (ruta) =>
        ruta.fulfill({ status: 400, json: { ok: false, problemas: ['Ese ajuste ya no existe'] } }),
      )
      await abrirPanel(page, { datos: conAjustes })
      await irA(page, 'edificios', 'Edificios')
      await page.getByRole('button', { name: /Quitar el ajuste: Oculto/ }).click()
      const dialogo = page.locator('#editor')
      await expect(dialogo.getByText('Ese ajuste ya no existe')).toBeVisible()
      await expect(dialogo.getByRole('button', { name: 'Quitar ajuste' })).toHaveCount(0)
    })
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

  test.describe('el contorno de una plaza', () => {
    /** El Worker simulado: apunta cada cuerpo y responde con el impacto (y la PR si se confirma). */
    async function abrirPlaza(page: Page, datos: object = conContorno) {
      const cuerpos: {
        id: string
        geometria: { coordinates: number[][][] }
        confirmar?: boolean
      }[] = []
      await page.route(/\/api\/panel\/contenido\/plaza\/contorno$/, async (ruta) => {
        const cuerpo = ruta.request().postDataJSON() as (typeof cuerpos)[number]
        cuerpos.push(cuerpo)
        await ruta.fulfill({
          json: {
            ok: true,
            confirmado: cuerpo.confirmar === true,
            seco: false,
            pr: cuerpo.confirmar
              ? { url: 'https://example.test/pr/5', numero: 5, creada: true }
              : null,
            mensaje: cuerpo.confirmar ? 'Contorno enviado a la PR.' : 'Esto es lo que cambiaría.',
            impacto: impactoDePrueba,
          },
        })
      })
      await abrirPanel(page, { datos })
      await irA(page, 'plazas', 'Plazas')
      await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
      const dialogo = page.locator('#editor')
      await expect(dialogo.getByRole('heading', { level: 3, name: 'Contorno' })).toBeVisible()
      return { cuerpos, dialogo, lista: dialogo.locator('[data-contorno-lista]') }
    }

    test('muestra los vértices y una vista previa, y deja ver el impacto antes de guardar', async ({
      page,
    }) => {
      const { cuerpos, dialogo, lista } = await abrirPlaza(page)
      await expect(lista.locator('li')).toHaveCount(4)
      await expect(dialogo.getByRole('status').filter({ hasText: '4 vértices' })).toBeVisible()
      await expect(dialogo.getByRole('img', { name: /Vista previa del contorno/ })).toBeVisible()

      await dialogo.getByRole('button', { name: 'Ver el impacto del contorno' }).click()
      await expect(
        dialogo.getByRole('heading', { name: 'Si guardas este contorno en Plaza Uno' }),
      ).toBeVisible()
      expect(cuerpos).toHaveLength(1)
      expect(cuerpos[0]?.confirmar).toBeUndefined()
      // El anillo viaja cerrado: cuatro vértices y el primero repetido.
      expect(cuerpos[0]?.geometria.coordinates[0]).toHaveLength(5)
      await expect(dialogo.getByText('Aviso de prueba del contorno.')).toBeVisible()
    })

    test('un impacto no se puede confirmar si el contorno cambió después de verlo', async ({
      page,
    }) => {
      const { cuerpos, dialogo, lista } = await abrirPlaza(page)
      await dialogo.getByRole('button', { name: 'Ver el impacto del contorno' }).click()
      await expect(dialogo.getByRole('button', { name: 'Guardar contorno' })).toBeVisible()

      // Cualquier cambio en un vértice borra el impacto y, con él, el botón de guardar.
      const lng = lista.locator('li').first().locator('[data-contorno-campo="lng"]')
      await lng.fill(`${Number(await lng.inputValue()) + 0.0001}`)
      await expect(
        dialogo.getByRole('heading', { name: 'Si guardas este contorno en Plaza Uno' }),
      ).toBeHidden()
      await expect(dialogo.getByRole('button', { name: 'Guardar contorno' })).toHaveCount(0)

      // Se vuelve a pedir y entonces sí: lo que se guarda es exactamente lo que se vio.
      await dialogo.getByRole('button', { name: 'Ver el impacto del contorno' }).click()
      await dialogo.getByRole('button', { name: 'Guardar contorno' }).click()
      await expect(dialogo).toBeHidden()
      await expect(page.getByRole('status').filter({ hasText: 'PR abierta #5' })).toBeVisible()
      expect(cuerpos).toHaveLength(3)
      expect(cuerpos[2]?.confirmar).toBe(true)
      expect(cuerpos[2]?.geometria).toEqual(cuerpos[1]?.geometria)
      expect(cuerpos[2]?.geometria).not.toEqual(cuerpos[0]?.geometria)
    })

    test('"Guardar cambios" nunca manda el contorno, y cerrar con vértices a medio escribir pregunta', async ({
      page,
    }) => {
      const { dialogo, lista } = await abrirPlaza(page)
      const guardados: Record<string, unknown>[] = []
      await page.route(/\/api\/panel\/contenido\/plaza$/, async (ruta) => {
        guardados.push(ruta.request().postDataJSON() as Record<string, unknown>)
        await ruta.fulfill({
          json: { ok: true, confirmado: true, seco: false, pr: null, mensaje: 'ok', impacto: {} },
        })
      })
      // Los campos de los vértices no llevan `name`: no entran en el formulario.
      await expect(lista.locator('input[name]')).toHaveCount(0)

      await lista.locator('li').first().locator('[data-contorno-campo="lat"]').fill('20.5')
      await dialogo.getByRole('button', { name: 'Cerrar' }).click()
      await expect(page.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible()
      await page.getByRole('button', { name: 'Seguir editando' }).click()

      await dialogo.locator('input[name="direccion"]').fill('Calle Nueva 9')
      await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect.poll(() => guardados.length).toBe(1)
      expect(Object.keys(guardados[0] ?? {})).not.toContain('geometry')
      expect(Object.keys(guardados[0] ?? {})).not.toContain('geometria')
      expect(JSON.stringify(guardados[0])).not.toContain('20.5')
    })

    test('avisa en el campo de lo que no es un número y acepta la coma decimal', async ({
      page,
    }) => {
      const { dialogo, lista } = await abrirPlaza(page)
      const primera = lista.locator('li').first()
      const lng = primera.locator('[data-contorno-campo="lng"]')
      const ver = dialogo.getByRole('button', { name: 'Ver el impacto del contorno' })

      await lng.fill('abc')
      await expect(lng).toHaveAttribute('aria-invalid', 'true')
      await expect(primera.getByText(/Escribe un número/)).toBeVisible()
      await expect(ver).toBeDisabled()

      // Con coma decimal se entiende igual: -100,35 es -100.35.
      await lng.fill(`${centroLng - 0.001}`.replace('.', ','))
      await expect(lng).not.toHaveAttribute('aria-invalid', 'true')
      await expect(ver).toBeEnabled()
    })

    test('rechaza en vivo un contorno que se cruza consigo mismo', async ({ page }) => {
      const { dialogo, lista } = await abrirPlaza(page)
      const filas = lista.locator('li')
      // Cruzar el segundo vértice con el cuarto convierte el cuadrado en un lazo.
      const segundo = filas.nth(1)
      const cuarto = filas.nth(3)
      const lng4 = await cuarto.locator('[data-contorno-campo="lng"]').inputValue()
      const lat4 = await cuarto.locator('[data-contorno-campo="lat"]').inputValue()
      await segundo.locator('[data-contorno-campo="lng"]').fill(lng4)
      await segundo.locator('[data-contorno-campo="lat"]').fill(lat4)
      await expect(dialogo.locator('[data-contorno-avisos]')).toContainText(/cruza|toca|repetidos/)
      await expect(
        dialogo.getByRole('button', { name: 'Ver el impacto del contorno' }),
      ).toBeDisabled()
    })

    test('añade un vértice en el punto medio, quita hasta tres, y mueve el foco a la fila afectada', async ({
      page,
    }) => {
      const { cuerpos, lista } = await abrirPlaza(page)
      const dialogo = page.locator('#editor')
      const primero = lista.locator('li').first()
      const lng1 = Number(await primero.locator('[data-contorno-campo="lng"]').inputValue())
      const lng2 = Number(
        await lista.locator('li').nth(1).locator('[data-contorno-campo="lng"]').inputValue(),
      )

      await dialogo.getByRole('button', { name: 'Añadir un vértice después del 1' }).click()
      await expect(lista.locator('li')).toHaveCount(5)
      const nuevo = lista.locator('li').nth(1)
      await expect(nuevo.locator('[data-contorno-campo="lng"]')).toBeFocused()
      expect(Number(await nuevo.locator('[data-contorno-campo="lng"]').inputValue())).toBeCloseTo(
        (lng1 + lng2) / 2,
        5,
      )

      // Se quitan hasta quedar tres: a tres, "Quitar" ya no se puede pulsar y el foco no se pierde.
      await dialogo.getByRole('button', { name: 'Quitar el vértice 2' }).click()
      await expect(lista.locator('li')).toHaveCount(4)
      await dialogo.getByRole('button', { name: 'Quitar el vértice 4' }).click()
      await expect(lista.locator('li')).toHaveCount(3)
      await expect(lista.locator('li').nth(2).locator('[data-contorno-campo="lng"]')).toBeFocused()
      await expect(
        dialogo.getByRole('button', { name: /Quitar el vértice/ }).first(),
      ).toBeDisabled()
      expect(cuerpos).toHaveLength(0)
    })

    test('no manda nada si el resto del formulario tiene cambios sin guardar', async ({ page }) => {
      const { cuerpos, dialogo } = await abrirPlaza(page)
      await dialogo.locator('input[name="direccion"]').fill('Calle Nueva 9')
      await dialogo.getByRole('button', { name: 'Ver el impacto del contorno' }).click()
      await expect(dialogo.locator('[data-problemas]')).toContainText(
        'Hay cambios sin guardar en el resto del formulario',
      )
      expect(cuerpos).toHaveLength(0)
    })

    test('con cien vértices en un teléfono la lista se desplaza dentro y la página no', async ({
      page,
    }) => {
      const circulo = {
        type: 'Polygon' as const,
        coordinates: [
          (() => {
            const anillo = Array.from({ length: 100 }, (_, i) => {
              const t = (2 * Math.PI * i) / 100
              return [
                seis(centroLng + 0.0008 * Math.cos(t)),
                seis(centroLat + 0.0008 * Math.sin(t)),
              ]
            })
            return [...anillo, anillo[0] ?? []]
          })(),
        ],
      }
      const datos = {
        ...conContorno,
        plazas: conContorno.plazas.map((plaza) =>
          plaza.id === 'plaza-uno' ? { ...plaza, geometry: circulo } : plaza,
        ),
      }
      await page.setViewportSize({ width: 320, height: 640 })
      const { dialogo, lista } = await abrirPlaza(page, datos)
      await expect(lista.locator('li')).toHaveCount(100)
      await sinDesplazamientoLateral(page)
      const [seDesplaza, dialogoAncho] = await Promise.all([
        lista.evaluate((el) => el.scrollHeight > el.clientHeight),
        dialogo.evaluate((el) => el.scrollWidth - el.clientWidth),
      ])
      expect(seDesplaza).toBe(true)
      expect(dialogoAncho).toBeLessThanOrEqual(0)
      // En 100 vértices ya no se puede añadir otro.
      await expect(
        dialogo.getByRole('button', { name: 'Añadir un vértice después del 1', exact: true }),
      ).toBeDisabled()
    })
  })

  test.describe('crear una plaza', () => {
    const resumenDePrueba = {
      id: 'plaza-de-prueba',
      nombre: 'Plaza de Prueba',
      estado: 'proximamente',
      investigacion: 'coming_soon',
      confianza: 'medium',
      locationSource: 'Evidencia escrita en la prueba. Huella provisional: cuadrado de 60 m.',
      fuentes: ['https://uno.test/a', 'https://dos.test/b', 'campo:2026-11-09'],
      areaProvisional: 3600,
      avisos: ['Aviso de prueba de la plaza nueva.'],
    }

    /** El Worker simulado: apunta cada cuerpo; responde con el resumen y, al confirmar, con la PR. */
    async function abrirNueva(page: Page, respuesta?: { status: number; json: object }) {
      const cuerpos: Record<string, unknown>[] = []
      await page.route(/\/api\/panel\/contenido\/plaza\/nueva$/, async (ruta) => {
        const cuerpo = ruta.request().postDataJSON() as Record<string, unknown>
        cuerpos.push(cuerpo)
        if (respuesta) {
          await ruta.fulfill(respuesta)
          return
        }
        await ruta.fulfill({
          json: {
            ok: true,
            confirmado: cuerpo.confirmar === true,
            seco: false,
            pr: cuerpo.confirmar
              ? { url: 'https://example.test/pr/7', numero: 7, creada: true }
              : null,
            mensaje: cuerpo.confirmar ? 'Plaza enviada a la PR.' : 'Esto es lo que se guardaría.',
            resumen: resumenDePrueba,
          },
        })
      })
      await abrirPanel(page)
      await irA(page, 'plazas', 'Plazas')
      await page.getByRole('button', { name: 'Nueva plaza' }).click()
      const dialogo = page.locator('#editor')
      await expect(
        dialogo.getByRole('heading', { level: 3, name: 'De dónde sale la ubicación' }),
      ).toBeVisible()
      return { cuerpos, dialogo }
    }

    async function rellenar(
      dialogo: Locator,
      extra: { campo?: boolean; estado?: 'activa' | 'proximamente' | null } = {},
    ) {
      // El estado se elige siempre: por omisión, próximamente. `null` lo deja sin elegir.
      const estado = extra.estado === undefined ? 'proximamente' : extra.estado
      if (estado) await dialogo.locator(`input[name="estado"][value="${estado}"]`).check()
      await dialogo.locator('[name="nombre"]').fill('Plaza de Prueba')
      await dialogo.locator('[name="lat"]').fill('20,6905')
      await dialogo.locator('[name="lng"]').fill('-100.3355')
      await dialogo.locator('[name="fuentes"]').fill('https://uno.test/a\nhttps://dos.test/b')
      await dialogo.locator('[name="evidencia"]').fill('Evidencia escrita en la prueba.')
      await dialogo.locator('[name="confianza"]').selectOption('medium')
      if (extra.campo)
        await dialogo.getByRole('checkbox', { name: 'Lo comprobé yo en el lugar' }).check()
    }

    test('el estado es obligatorio: sin elegirlo no se manda nada, y no hay un "no sé"', async ({
      page,
    }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      // Ninguna opción viene marcada y solo hay dos.
      await expect(dialogo.locator('input[name="estado"]')).toHaveCount(2)
      await expect(dialogo.locator('input[name="estado"]:checked')).toHaveCount(0)
      await expect(dialogo.getByText('No hay una opción de "no sé"')).toBeVisible()
      await rellenar(dialogo, { estado: null })
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      // El aviso queda en el propio grupo de opciones, no en una caja aparte.
      await expect(dialogo.locator('.estado-plaza .campo-error')).toContainText(
        'Elige si la plaza está activa o es próximamente',
      )
      await expect(dialogo.locator('input[name="estado"]').first()).toHaveAttribute(
        'aria-invalid',
        'true',
      )
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toHaveCount(0)
      expect(cuerpos).toHaveLength(0)
      // Al elegir una, ya se puede.
      await dialogo.locator('input[name="estado"][value="activa"]').check()
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      expect(cuerpos).toHaveLength(1)
      expect(cuerpos[0]).toMatchObject({ estado: 'activa' })
    })

    test('el estado elegido se manda tal cual y cambiarlo borra lo enseñado', async ({ page }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      await rellenar(dialogo, { estado: 'proximamente' })
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toBeVisible()
      expect(cuerpos[0]).toMatchObject({ estado: 'proximamente' })
      await dialogo.locator('input[name="estado"][value="activa"]').check()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toHaveCount(0)
    })

    test('por defecto no afirma nada: nada de "campo:" ni confianza alta', async ({ page }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      await expect(
        dialogo.getByRole('checkbox', { name: 'Lo comprobé yo en el lugar' }),
      ).not.toBeChecked()
      await expect(dialogo.locator('[name="confianza"]')).toHaveValue('low')
      // El formulario, sin violaciones graves de accesibilidad.
      const resultado = await new AxeBuilder({ page }).include('#editor').analyze()
      const graves = resultado.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      )
      expect(graves, graves.map((v) => v.id).join(', ')).toEqual([])
      await rellenar(dialogo)
      await dialogo.locator('[name="confianza"]').selectOption('low')
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(
        dialogo.getByRole('heading', { name: 'Se creará la plaza "Plaza de Prueba"' }),
      ).toBeVisible()
      expect(cuerpos).toHaveLength(1)
      expect(cuerpos[0]).toMatchObject({
        aportadoPorMi: false,
        estado: 'proximamente',
        confianza: 'low',
      })
      expect(Object.keys(cuerpos[0] ?? {})).not.toContain('confirmar')
    })

    test('lee la coma decimal y una URL por línea, y manda lo escrito', async ({ page }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      await rellenar(dialogo, { campo: true })
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.getByText(resumenDePrueba.locationSource)).toBeVisible()
      expect(cuerpos[0]).toMatchObject({
        nombre: 'Plaza de Prueba',
        lat: 20.6905,
        lng: -100.3355,
        fuentes: ['https://uno.test/a', 'https://dos.test/b'],
        evidencia: 'Evidencia escrita en la prueba.',
        aportadoPorMi: true,
        confianza: 'medium',
      })
      await expect(dialogo.getByText('Aviso de prueba de la plaza nueva.')).toBeVisible()
    })

    test('lo que se confirma es lo que se vio: cambiar algo después borra el botón de crear', async ({
      page,
    }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      await rellenar(dialogo)
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toBeVisible()

      // Cualquier cambio (un campo de texto, una casilla o la confianza) borra lo enseñado y el botón.
      await dialogo.locator('[name="evidencia"]').fill('Otra evidencia distinta.')
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toHaveCount(0)
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toBeVisible()
      await dialogo.getByRole('checkbox', { name: 'Lo comprobé yo en el lugar' }).check()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toHaveCount(0)
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()

      await dialogo.getByRole('button', { name: 'Crear plaza' }).click()
      await expect(dialogo).toBeHidden()
      await expect(page.getByRole('status').filter({ hasText: 'PR abierta #7' })).toBeVisible()
      expect(cuerpos).toHaveLength(4)
      expect(cuerpos[3]?.confirmar).toBe(true)
      // Lo que se guarda es lo del último impacto, campo por campo.
      const { confirmar: _c, ...guardado } = cuerpos[3] ?? {}
      expect(guardado).toEqual(cuerpos[2])
      expect(guardado).toMatchObject({ evidencia: 'Otra evidencia distinta.', aportadoPorMi: true })
    })

    test('avisa en el campo de lo que el servidor rechaza, y no crea nada', async ({ page }) => {
      const { cuerpos, dialogo } = await abrirNueva(page, {
        status: 400,
        json: { ok: false, problemas: ['fuentes: Aporta al menos una fuente (una URL)'] },
      })
      await rellenar(dialogo)
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.locator('[name="fuentes"]')).toHaveAttribute('aria-invalid', 'true')
      await expect(dialogo.getByText('Aporta al menos una fuente')).toBeVisible()
      await expect(dialogo.getByRole('button', { name: 'Crear plaza' })).toHaveCount(0)
      expect(cuerpos.every((cuerpo) => cuerpo.confirmar === undefined)).toBe(true)
    })

    test('una coordenada que no es un número se avisa en el campo y no se manda', async ({
      page,
    }) => {
      const { cuerpos, dialogo } = await abrirNueva(page)
      await rellenar(dialogo)
      await dialogo.locator('[name="lat"]').fill('veinte')
      await dialogo.getByRole('button', { name: 'Ver lo que se guardará' }).click()
      await expect(dialogo.locator('[name="lat"]')).toHaveAttribute('aria-invalid', 'true')
      expect(cuerpos).toHaveLength(0)
    })

    test('cerrar con algo escrito pregunta antes de descartarlo, y cabe en un teléfono', async ({
      page,
    }) => {
      const { dialogo } = await abrirNueva(page)
      await dialogo.locator('[name="nombre"]').fill('Plaza a medias')
      await sinDesplazamientoLateral(page)
      await dialogo.getByRole('button', { name: 'Cerrar' }).click()
      await expect(page.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible()
      await page.getByRole('button', { name: 'Descartar cambios' }).click()
      await expect(dialogo).toBeHidden()
    })
  })

  test('sin permiso el panel lo dice con palabras', async ({ page }) => {
    await abrirPanel(page, { contenidoStatus: 403 })
    // El resumen no se queda en "Cargando": dice que no pudo consultar y por qué.
    const pendiente = page.locator('[data-pendiente]')
    await expect(pendiente).toContainText('No se pudo consultar el estado de los cambios')
    await expect(pendiente).toContainText('Sin permiso')
    await expect(pendiente).not.toContainText('Cargando')
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
