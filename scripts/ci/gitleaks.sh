#!/usr/bin/env bash
# Instala Gitleaks verificando su SHA-256 y escanea la historia del repositorio.
#
# Lo usa la acción local `.github/actions/gitleaks` desde CI y Deploy. Es un script y no YAML en línea
# para poder probarlo (`scripts/ci/gitleaks.test.ts`) y para que la versión y su hash vivan en un solo sitio.
#
# Por qué así:
#  - El binario y no `gitleaks-action`: la acción exige clave de licencia en organizaciones, y el
#    repositorio vive en una (`aurariola-studio`). El binario es el mismo escáner, MIT y sin clave.
#  - Se descarga a un archivo y no con `curl | tar`: con reintentos, un reintento a mitad de una
#    descarga corrompería la tubería.
#  - El hash fijado es la garantía de integridad. Gitleaks no publica firmas ni atestaciones, solo un
#    `checksums.txt` del mismo sitio; fijar el hash aquí equivale a fijar las acciones por SHA.
#  - `--retry` cubre un parpadeo (timeouts y HTTP 408, 429, 500, 502, 503, 504, 522 y 524, con espera
#    exponencial). Una caída larga, como la del 8 de noviembre de 2026 (13 minutos de 504 en las
#    descargas de GitHub), la cubre la caché de la acción local: el archivo ya está en el runner.
#
# Para subir de versión: cambiar GITLEAKS_VERSION y GITLEAKS_SHA256 con la línea de
# `gitleaks_<versión>_checksums.txt` de la release, y comprobarla calculando el hash del archivo bajado.
set -euo pipefail

VERSION="${GITLEAKS_VERSION:-8.30.1}"
SHA256="${GITLEAKS_SHA256:-551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb}"
URL="${GITLEAKS_URL:-https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_x64.tar.gz}"
DIR="${GITLEAKS_DIR:-${RUNNER_TEMP:-/tmp}/gitleaks}"
REINTENTOS="${GITLEAKS_REINTENTOS:-5}"
ARCHIVO="$DIR/gitleaks.tar.gz"

coincide() { echo "${SHA256}  ${ARCHIVO}" | sha256sum --check --status 2>/dev/null; }

mkdir -p "$DIR"
# Un archivo en caché solo vale si su hash es el fijado: una caché corrupta no se usa.
if [ ! -f "$ARCHIVO" ] || ! coincide; then
  rm -f "$ARCHIVO"
  curl --fail --silent --show-error --location \
    --retry "$REINTENTOS" --retry-max-time 120 --connect-timeout 15 \
    --output "$ARCHIVO" "$URL"
fi

if ! coincide; then
  rm -f "$ARCHIVO"
  echo "✗ El SHA-256 de Gitleaks ${VERSION} no coincide con el fijado en scripts/ci/gitleaks.sh" >&2
  exit 1
fi

tar -xzf "$ARCHIVO" -C "$DIR" gitleaks

if [ "${1:-}" = "--solo-instalar" ]; then
  echo "✓ Gitleaks ${VERSION} instalado en ${DIR}"
  exit 0
fi

"$DIR/gitleaks" git --no-banner --redact --exit-code 1
