/**
 * Escribe los archivos de pruebas E2E de uno o más grupos, separados por espacios, para pasárselos a
 * `playwright test` desde el CI. Los grupos se definen en `tests/e2e/grupos.ts`.
 *
 * Uso: node scripts/ci/archivos-del-grupo.ts fichas interfaz
 */
import { GRUPOS } from '../../tests/e2e/grupos.ts'

const pedidos = process.argv.slice(2)
if (pedidos.length === 0) {
  console.error('Falta el nombre de al menos un grupo.')
  process.exit(1)
}

const desconocidos = pedidos.filter((id) => !(id in GRUPOS))
if (desconocidos.length > 0) {
  console.error(
    `Grupo desconocido: ${desconocidos.join(', ')}. Hay: ${Object.keys(GRUPOS).join(', ')}.`,
  )
  process.exit(1)
}

console.log(
  pedidos
    .flatMap((id) => (GRUPOS[id]?.archivos ?? []).map((a) => `tests/e2e/${a}.spec.ts`))
    .join(' '),
)
