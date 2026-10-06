/**
 * npm run analitica:ver
 *
 * Las visitas, en una tabla que se lee. Por debajo es `wrangler d1 execute`, que devuelve un JSON
 * crudo con metadatos de la consulta; aquí se queda solo lo que interesa y se le pone forma.
 *
 * No hay panel ni endpoint de lectura a propósito: una página que muestre estos números habría que
 * protegerla, y proteger algo es justo el trabajo que este proyecto no quiere tener. Los números los
 * mira quien tiene las llaves de Cloudflare, desde su propia máquina.
 *
 * Con `--dias=N` se cambia la ventana (30 por omisión), y con `--local` se lee la base de desarrollo
 * en vez de la publicada.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

interface Fila {
  ruta: string
  idioma: string
  visitas: number
}

const argumentos = process.argv.slice(2)
const dias = Number(argumentos.find((a) => a.startsWith('--dias='))?.slice(7) ?? 30)
const donde = argumentos.includes('--local') ? '--local' : '--remote'

const consulta = `
SELECT ruta, idioma, SUM(cuenta) AS visitas
  FROM visitas
 WHERE fecha >= date('now', '-${dias} days')
 GROUP BY ruta, idioma
 ORDER BY visitas DESC
`.trim()

/** Wrangler escribe avisos antes del JSON, así que se recorta desde el primer corchete. */
function consultar(sql: string): Fila[] {
  /*
   * Se llama al archivo de wrangler con el propio Node, y no a `npx`. Con `shell` de por medio,
   * Windows vuelve a trocear los argumentos y parte la consulta por los espacios; y sin él, Node ya
   * no deja lanzar un `.cmd`. Así no hay intérprete que reinterprete nada, en ningún sistema.
   */
  // Por ruta y no con `import.meta.resolve`: wrangler no publica su `bin` en los `exports`.
  const wrangler = fileURLToPath(
    new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url),
  )
  let salida: string
  try {
    salida = execFileSync(
      process.execPath,
      [wrangler, 'd1', 'execute', 'visit-zibata-analitica', donde, '--json', `--command=${sql}`],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    )
  } catch (error) {
    // Un fallo de wrangler sale como un volcado de Node de cincuenta líneas con el comando entero
    // dentro. Aquí se queda el motivo y qué hacer: esto lo lee alguien que quiere ver un número, no
    // depurar un proceso hijo.
    throw new Error(explicar(error))
  }
  const inicio = salida.indexOf('[')
  if (inicio === -1) throw new Error(`Respuesta inesperada de wrangler:\n${salida}`)
  const bloques = JSON.parse(salida.slice(inicio)) as { results: Fila[] }[]
  return bloques.flatMap((bloque) => bloque.results)
}

/** Traduce el fallo de wrangler a una frase y, cuando se reconoce, a qué hacer con él. */
function explicar(error: unknown): string {
  const fallo = error as { stderr?: string; stdout?: string }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: es el escape ANSI, y quitar los colores de wrangler es justo lo que se quiere.
  const salida = `${fallo.stderr ?? ''}${fallo.stdout ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '')
  const motivo = salida.match(/"text":\s*"([^"]+)"/)?.[1]

  if (/7403|not authorized to access this service/i.test(salida)) {
    return [
      'Cloudflare rechazó la consulta: la cuenta no está autorizada para D1.',
      '',
      '  Suele ser pasajero, justo después de publicar. Vuelve a intentarlo.',
      '  Si sigue: `npx wrangler whoami` y comprueba que `d1` esté entre los permisos;',
      '  si no está, `npx wrangler login` para volver a concederlos.',
    ].join('\n')
  }
  if (/no such table|SQLITE_ERROR/i.test(salida)) {
    return 'La tabla de visitas no existe todavía. Créala con `npm run analitica:esquema`.'
  }
  if (/not logged in|Unable to authenticate|credentials/i.test(salida)) {
    return 'Esta máquina no está identificada en Cloudflare. Ejecuta `npx wrangler login`.'
  }
  return `No se pudo leer la base de visitas${motivo ? `: ${motivo}` : '.'}`
}

/*
 * Se corta aquí en vez de dejar que el error suba: una pila de Node no le dice nada a quien solo
 * quería ver un número, y el mensaje de `explicar()` ya trae el motivo y el siguiente paso.
 */
let filas: Fila[]
try {
  filas = consultar(consulta)
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

if (filas.length === 0) {
  console.log(
    `Sin visitas en los últimos ${dias} días.\n` +
      'Si el sitio acaba de publicarse, es lo esperado: los números empiezan a llegar con la gente.',
  )
  process.exit(0)
}

const total = filas.reduce((suma, fila) => suma + fila.visitas, 0)
const porIdioma = new Map<string, number>()
for (const fila of filas)
  porIdioma.set(fila.idioma, (porIdioma.get(fila.idioma) ?? 0) + fila.visitas)

const ancho = Math.max(...filas.map((fila) => fila.ruta.length), 'PÁGINA'.length)
// La barra es relativa a la página más vista, que es la primera porque vienen ordenadas.
const mayor = filas.reduce((maximo, fila) => Math.max(maximo, fila.visitas), 1)
const barra = (visitas: number) => '█'.repeat(Math.max(1, Math.round((visitas / mayor) * 24)))

console.log(`\nVisitas de los últimos ${dias} días\n`)
console.log(`  ${'PÁGINA'.padEnd(ancho)}  ${'IDIOMA'}  ${'VISITAS'.padStart(7)}`)
console.log(`  ${'-'.repeat(ancho)}  ------  -------`)
for (const fila of filas) {
  const cifra = String(fila.visitas).padStart(7)
  console.log(
    `  ${fila.ruta.padEnd(ancho)}  ${fila.idioma.padEnd(6)}  ${cifra}  ${barra(fila.visitas)}`,
  )
}

const reparto = [...porIdioma.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([idioma, visitas]) => `${idioma} ${Math.round((visitas / total) * 100)}%`)
  .join(' · ')
console.log(`\n  ${total} visitas en ${filas.length} páginas  (${reparto})\n`)
