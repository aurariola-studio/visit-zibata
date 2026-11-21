/**
 * Escribe los archivos de pruebas E2E del humo del despliegue, separados por espacios, para pasárselos a
 * `playwright test`. La lista está en `tests/e2e/grupos.ts` (`HUMO`).
 *
 * Uso: node scripts/ci/archivos-del-humo.ts
 */
import { HUMO } from '../../tests/e2e/grupos.ts'

console.log(HUMO.map((archivo) => `tests/e2e/${archivo}.spec.ts`).join(' '))
