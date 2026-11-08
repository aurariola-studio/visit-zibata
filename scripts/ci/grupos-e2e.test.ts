import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GRUPOS } from '../../tests/e2e/grupos.ts'

/**
 * Los grupos E2E reparten los archivos entre los trabajos del CI. El fallo que esto evita no hace
 * ruido: un archivo que no está en ningún grupo no corre nunca, y el CI sigue en verde.
 */

const especificaciones = readdirSync('tests/e2e')
  .filter((nombre) => nombre.endsWith('.spec.ts'))
  .map((nombre) => nombre.replace(/\.spec\.ts$/, ''))
  .sort()

const asignados = Object.values(GRUPOS).flatMap((grupo) => grupo.archivos)

describe('grupos de pruebas E2E', () => {
  it('cada archivo de pruebas está en un grupo', () => {
    expect(especificaciones.filter((nombre) => !asignados.includes(nombre))).toEqual([])
  })

  it('ningún archivo está en dos grupos', () => {
    const repetidos = asignados.filter((nombre, i) => asignados.indexOf(nombre) !== i)
    expect(repetidos).toEqual([])
  })

  it('ningún grupo nombra un archivo que no existe, ni está vacío', () => {
    expect(asignados.filter((nombre) => !especificaciones.includes(nombre))).toEqual([])
    for (const [id, grupo] of Object.entries(GRUPOS)) {
      expect(grupo.archivos.length, id).toBeGreaterThan(0)
    }
  })

  it('el CI corre exactamente los grupos que hay, en las dos bases', () => {
    const flujo = readFileSync('.github/workflows/ci.yml', 'utf8')
    // Cada entrada de la matriz lleva `grupos: 'a b'`; las dos bases suman los mismos grupos.
    const porBase = new Map<string, string[]>()
    for (const [, base, grupos] of flujo.matchAll(
      /base:\s*'([^']+)'[^\n]*\n(?:[^\n]*\n)*?\s*grupos:\s*'([^']+)'/g,
    )) {
      porBase.set(base ?? '', [...(porBase.get(base ?? '') ?? []), ...(grupos ?? '').split(' ')])
    }
    expect([...porBase.keys()].sort()).toEqual(['/', '/visit-zibata/'])
    for (const [base, grupos] of porBase) {
      expect([...grupos].sort(), base).toEqual(Object.keys(GRUPOS).sort())
    }
  })

  it('la raíz corre los cuatro proyectos: ninguna de sus entradas restringe proyectos', () => {
    const flujo = readFileSync('.github/workflows/ci.yml', 'utf8')
    const entradas = flujo.split(/\n\s*- id:\s*/).slice(1)
    const raiz = entradas.filter((entrada) => /base:\s*'\/'/.test(entrada))
    expect(raiz.length).toBe(Object.keys(GRUPOS).length)
    // Un `--project=...` suelto en la raíz quitaría cobertura sin que nada se pusiera en rojo.
    for (const entrada of raiz) expect(entrada).not.toMatch(/\bargs:/)
  })

  it('el trabajo de resultado espera a todos los demás, corre siempre y no admite nada que no sea éxito', () => {
    const flujo = readFileSync('.github/workflows/ci.yml', 'utf8')
    const trabajos = [
      ...flujo.slice(flujo.indexOf('\njobs:')).matchAll(/^ {2}([a-z][\w-]*):\s*$/gm),
    ]
      .map((m) => m[1] ?? '')
      .filter((id) => id !== 'resultado')
    const resultado = flujo.slice(flujo.indexOf('\n  resultado:\n'))
    const espera = (resultado.match(/needs:\s*\[([^\]]*)\]/)?.[1] ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    // Si se añade un trabajo y no entra aquí, la regla de la rama deja de exigirlo sin que nada avise.
    expect([...espera].sort()).toEqual([...trabajos].sort())
    // Un trabajo omitido cuenta como éxito en GitHub: sin `always()` un E2E en rojo daría verde.
    expect(resultado).toMatch(/if:\s*\$\{\{\s*always\(\)\s*\}\}/)
    expect(resultado).toContain('trabajo.result !== "success"')
  })

  it('el script entrega las rutas de los archivos de un grupo', () => {
    const salida = execFileSync('node', ['scripts/ci/archivos-del-grupo.ts', 'fichas'], {
      encoding: 'utf8',
    }).trim()
    expect(salida.split(' ')).toEqual(
      (GRUPOS.fichas?.archivos ?? []).map((nombre) => `tests/e2e/${nombre}.spec.ts`),
    )
  })

  it('el script rechaza un grupo que no existe', () =>
    expect(() =>
      execFileSync('node', ['scripts/ci/archivos-del-grupo.ts', 'no-existe'], { stdio: 'pipe' }),
    ).toThrow())
})
