/**
 * Los grupos de pruebas E2E: cada uno corre en su propio trabajo del CI, en paralelo con los demás.
 *
 * Son por tema y no por reparto automático (`--shard=1/4`): si un trabajo falla, su nombre ya dice
 * qué se rompió ("mapa: medición, táctil y errores") sin abrir el registro. A cambio hay que mantenerlos
 * repartidos a mano, y para eso está el resumen de tiempos por archivo que cada trabajo escribe al
 * terminar (`scripts/ci/resumen-tiempos.ts`): si un grupo pasa de unos 20 minutos, se mueve un
 * archivo a otro grupo, editando solo este archivo.
 *
 * El reparto inicial salió de los tiempos de un informe real del CI (los archivos de contenido) y de una
 * medición local (los de mapa, que no tenían informe), y de unos 22 a 33 minutos de prueba por grupo,
 * que con dos trabajadores son 11 a 17 de reloj. Es una primera aproximación: hay que revisarlo con los
 * informes de las primeras ejecuciones.
 *
 * Cada archivo `*.spec.ts` tiene que estar en uno y solo uno. Si no, no correría nunca en el CI y
 * nadie se enteraría: `scripts/ci/grupos-e2e.test.ts` lo comprueba, y también que el CI y este archivo
 * hablen de los mismos grupos.
 */

export interface Grupo {
  /** Cómo se llama el trabajo en el CI. */
  nombre: string
  /** Los archivos de `tests/e2e`, sin la ruta. */
  archivos: string[]
}

export const GRUPOS: Record<string, Grupo> = {
  fichas: {
    nombre: 'fichas y búsqueda',
    archivos: [
      'places',
      'search',
      'categorias',
      'ranking',
      'abierto-ahora',
      'calificacion',
      'lugar-borrado',
      'detalle',
    ],
  },
  interfaz: {
    nombre: 'interfaz y accesibilidad',
    archivos: ['catalogo', 'tipografia', 'keyboard-links', 'perfil', 'carga'],
  },
  rutas: {
    nombre: 'rutas, SEO y panel',
    archivos: [
      'about',
      'panel',
      'es-ruta',
      'fragmentos',
      'security',
      'seo-regresion',
      'sin-javascript',
      'metadatos',
    ],
  },
  'mapa-capas': {
    nombre: 'mapa: capas y datos',
    archivos: ['map', 'layering'],
  },
  'mapa-realismo': {
    nombre: 'mapa: realismo y títulos',
    archivos: ['realismo', 'titulos-sin-desborde'],
  },
  'mapa-uso': {
    nombre: 'mapa: medición, táctil y errores',
    archivos: ['responsive', 'medicion', 'camara', 'touch', 'resilience', 'panel-mapa'],
  },
}

/**
 * El humo del despliegue: los archivos que corren contra el build que se publica (escritorio, una base).
 *
 * La suite entera ya corrió en el pull request. El humo existe porque al fusionar con squash el commit que llega a
 * `main` es nuevo y puede ser una combinación que nadie probó junta; basta con comprobar lo que un artefacto roto
 * rompe primero. Primero, lo que mira el HTML que se sirve (SEO, metadatos, rutas, CSP, sin JavaScript, trozos de
 * carga) y, después, los recorridos básicos (una ficha, el buscador, el detalle, abierto ahora, el orden).
 *
 * Es una lista y no "el proyecto de escritorio" a propósito. Antes el humo era `--project=desktop`, pensado como
 * siete minutos, y creció solo con cada archivo nuevo hasta pasar de media hora y rozar el tope del trabajo (40
 * minutos). Aquí cada archivo entra a mano. Si el humo vuelve a pasar de unos diez minutos, es la
 * señal de que se coló algo que no es humo.
 *
 * Quedan fuera, y corren completos en el pull request: el mapa y sus capas, el realismo, los títulos sin desborde, el
 * catálogo de interfaz, la tipografía, el panel y la accesibilidad. `scripts/ci/grupos-e2e.test.ts` comprueba que
 * esta lista nombra archivos que existen y que el despliegue la usa.
 */
export const HUMO: string[] = [
  'seo-regresion',
  'metadatos',
  'es-ruta',
  'security',
  'sin-javascript',
  'fragmentos',
  'carga',
  'lugar-borrado',
  'keyboard-links',
  'places',
  'search',
  'detalle',
  'abierto-ahora',
  'ranking',
]
