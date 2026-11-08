/**
 * Los grupos de pruebas E2E: cada uno corre en su propio trabajo del CI, en paralelo con los demás.
 *
 * Son por tema y no por reparto automático (`--shard=1/4`): si un trabajo falla, su nombre ya dice
 * qué se rompió ("Mapa: medición y táctil") sin abrir el registro. A cambio hay que mantenerlos
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
    archivos: ['responsive', 'medicion', 'camara', 'touch', 'resilience'],
  },
}
