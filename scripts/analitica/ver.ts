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
  const salida = execFileSync(
    process.execPath,
    [wrangler, 'd1', 'execute', 'visit-zibata-analitica', donde, '--json', `--command=${sql}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  const inicio = salida.indexOf('[')
  if (inicio === -1) throw new Error(`Respuesta inesperada de wrangler:\n${salida}`)
  const bloques = JSON.parse(salida.slice(inicio)) as { results: Fila[] }[]
  return bloques.flatMap((bloque) => bloque.results)
}

const filas = consultar(consulta)

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
