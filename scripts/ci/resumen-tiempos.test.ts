import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

/** El resumen que el CI escribe al terminar cada trabajo: tiempos por archivo y proyecto, e intermitentes. */
function resumenDe(informe: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'resumen-'))
  const ruta = join(dir, 'informe.json')
  writeFileSync(ruta, JSON.stringify(informe))
  return execFileSync('node', ['scripts/ci/resumen-tiempos.ts', ruta], { encoding: 'utf8' })
}

const prueba = (projectName: string, status: string, duraciones: number[]) => ({
  projectName,
  status,
  results: duraciones.map((duration) => ({ duration })),
})

it('suma el tiempo por archivo y por proyecto, y lista las intermitentes con su proyecto', () => {
  const salida = resumenDe({
    suites: [
      {
        specs: [
          {
            file: 'a.spec.ts',
            title: 'estable',
            tests: [
              prueba('desktop', 'expected', [60_000]),
              prueba('mobile', 'expected', [120_000]),
            ],
          },
          {
            file: 'b.spec.ts',
            title: 'caprichosa',
            // Falló y pasó al reintentar: el tiempo gastado son los dos intentos.
            tests: [prueba('webkit-iphone', 'flaky', [30_000, 30_000])],
          },
        ],
      },
    ],
  })
  expect(salida).toContain('| a.spec.ts | 2 | 3.0 |')
  expect(salida).toContain('| b.spec.ts | 1 | 1.0 |')
  expect(salida).toContain('| mobile | 2.0 |')
  expect(salida).toContain('### Pruebas intermitentes (1)')
  expect(salida).toContain('- b.spec.ts (webkit-iphone): caprichosa')
  expect(salida).not.toContain('estable')
})

it('sin intermitentes no escribe la sección', () => {
  const salida = resumenDe({
    suites: [
      {
        specs: [{ file: 'a.spec.ts', title: 'x', tests: [prueba('desktop', 'expected', [1000])] }],
      },
    ],
  })
  expect(salida).not.toContain('intermitentes')
})
