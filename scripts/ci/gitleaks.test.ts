import { execFile, execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/*
 * El script de CI se prueba de verdad: contra un servidor local que se porta como se portó GitHub el 8
 * de noviembre de 2026 (un 504 tras otro), con un tarball real. Ningún Gitleaks de verdad: el "binario"
 * es un archivo cualquiera, que es lo único que el script instala antes de ejecutarlo.
 *
 * `bash` tiene que ser un bash de verdad: en Windows, el de Git (el de WSL ve las rutas de otra forma).
 */
const SCRIPT = fileURLToPath(new URL('./gitleaks.sh', import.meta.url))
const BASH = process.env.BASH_PARA_PRUEBAS ?? 'bash'
const bashFunciona = spawnSync(BASH, ['-c', 'command -v sha256sum tar curl'], { encoding: 'utf8' })
const sePuede = bashFunciona.status === 0

/** Una ruta que bash entiende en cualquier sistema (en Windows, `C:\\x` pasa a `/c/x`). */
const aBash = (ruta: string): string =>
  ruta
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):/, (_, unidad: string) => `/${unidad.toLowerCase()}`)

describe.skipIf(!sePuede)('scripts/ci/gitleaks.sh', () => {
  let raiz = ''
  let servidor: Server
  let url = ''
  let tarball = Buffer.alloc(0)
  let sha = ''
  /** Cuántos 504 quedan por servir antes de contestar bien. */
  let fallos = 0
  let peticiones = 0

  beforeAll(async () => {
    raiz = mkdtempSync(join(tmpdir(), 'gitleaks-ci-'))
    const origen = join(raiz, 'origen')
    mkdirSync(origen)
    writeFileSync(join(origen, 'gitleaks'), '#!/bin/sh\necho "falso gitleaks"\n')
    execFileSync(BASH, [
      '-c',
      `tar -czf "${aBash(join(raiz, 'falso.tar.gz'))}" -C "${aBash(origen)}" gitleaks`,
    ])
    tarball = readFileSync(join(raiz, 'falso.tar.gz'))
    sha = createHash('sha256').update(tarball).digest('hex')
    servidor = createServer((_peticion, respuesta) => {
      peticiones += 1
      if (fallos > 0) {
        fallos -= 1
        respuesta.statusCode = 504
        respuesta.end('Gateway Timeout')
        return
      }
      respuesta.end(tarball)
    })
    await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo))
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/gitleaks.tar.gz`
  })
  afterAll(() => {
    servidor.close()
    rmSync(raiz, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })
  beforeEach(() => {
    fallos = 0
    peticiones = 0
  })

  const carpeta = () => {
    const dir = mkdtempSync(join(raiz, 'run-'))
    return dir
  }
  /**
   * Asíncrono a propósito: el servidor de prueba vive en este mismo proceso y un `spawnSync` lo bloquearía
   * mientras `curl` espera su respuesta.
   */
  const correr = (dir: string, env: Record<string, string> = {}) =>
    new Promise<{ status: number; stderr: string }>((listo) => {
      execFile(
        BASH,
        [aBash(SCRIPT), '--solo-instalar'],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            GITLEAKS_DIR: aBash(dir),
            GITLEAKS_URL: url,
            GITLEAKS_SHA256: sha,
            ...env,
          },
        },
        (error, _salida, stderr) =>
          listo({
            status: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
            stderr,
          }),
      )
    })

  it('descarga, verifica el hash y deja el binario listo', async () => {
    const dir = carpeta()
    const resultado = await correr(dir)
    expect(resultado.status, resultado.stderr).toBe(0)
    expect(existsSync(join(dir, 'gitleaks'))).toBe(true)
    expect(peticiones).toBe(1)
  })

  it('un 504 seguido de otro no lo rompe: reintenta y acaba descargando', async () => {
    fallos = 2
    const dir = carpeta()
    const resultado = await correr(dir)
    expect(resultado.status, resultado.stderr).toBe(0)
    // Dos 504 y la buena: tres peticiones, con la espera exponencial entre ellas.
    expect(peticiones).toBe(3)
    expect(existsSync(join(dir, 'gitleaks'))).toBe(true)
  })

  it('si el servidor no se recupera, falla con el error de la descarga y no instala nada', async () => {
    fallos = 1000
    const dir = carpeta()
    const resultado = await correr(dir, {
      GITLEAKS_URL: `${url}?sin-suerte`,
      GITLEAKS_REINTENTOS: '2',
    })
    expect(resultado.status).not.toBe(0)
    // El error es el de la descarga (curl 22 por el 504), no un "hash distinto" engañoso sobre la página de error.
    expect(resultado.stderr).toMatch(/curl: \(22\)/)
    expect(resultado.stderr).not.toMatch(/no coincide con el fijado/)
    expect(existsSync(join(dir, 'gitleaks'))).toBe(false)
    // Se intentó más de una vez: no es un fallo a la primera.
    expect(peticiones).toBeGreaterThan(1)
  })

  it('un archivo con otro hash se rechaza y se borra: nada que no sea el fijado se ejecuta', async () => {
    const dir = carpeta()
    const resultado = await correr(dir, { GITLEAKS_SHA256: 'a'.repeat(64) })
    expect(resultado.status).not.toBe(0)
    expect(resultado.stderr).toMatch(/no coincide con el fijado/)
    expect(existsSync(join(dir, 'gitleaks'))).toBe(false)
    expect(existsSync(join(dir, 'gitleaks.tar.gz'))).toBe(false)
  })

  it('con el archivo ya en caché y válido no toca la red', async () => {
    const dir = carpeta()
    writeFileSync(join(dir, 'gitleaks.tar.gz'), tarball)
    const resultado = await correr(dir)
    expect(resultado.status, resultado.stderr).toBe(0)
    expect(peticiones).toBe(0)
    expect(existsSync(join(dir, 'gitleaks'))).toBe(true)
  })

  it('con una caché corrupta no la usa: la descarga de nuevo', async () => {
    const dir = carpeta()
    writeFileSync(join(dir, 'gitleaks.tar.gz'), 'basura que no es el archivo')
    const resultado = await correr(dir)
    expect(resultado.status, resultado.stderr).toBe(0)
    expect(peticiones).toBe(1)
    expect(readFileSync(join(dir, 'gitleaks.tar.gz')).equals(tarball)).toBe(true)
  })

  it('el hash fijado por omisión es el de la versión fijada (formato y versión coherentes)', () => {
    const fuente = readFileSync(SCRIPT, 'utf8')
    expect(fuente).toMatch(/GITLEAKS_SHA256:-[0-9a-f]{64}\}/)
    const version = /GITLEAKS_VERSION:-([0-9.]+)\}/.exec(fuente)?.[1]
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
