/** MapControls: zoom, orientación, vista 3D/cenital, mi ubicación y regreso a la vista de Zibatá. */
import { Box, Compass, House, LocateFixed, Minus, Plus } from 'lucide-react'
import { type Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { INITIAL_CAMERA, MAP_LIMITS } from '../../config/map.ts'
import { t } from '../../i18n/index.ts'
import type { Plaza } from '../../types/domain.ts'
import { resetCamera } from './camera.ts'
import styles from './MapControls.module.css'
import { prefersReducedMotion } from './mapRuntime.ts'

interface MapControlsProps {
  map: MapLibreMap
  plazas: readonly Plaza[]
  compact: boolean
}

export function MapControls({ map, plazas, compact }: MapControlsProps) {
  const [bearing, setBearing] = useState(map.getBearing())
  const [pitched, setPitched] = useState(map.getPitch() > 5)
  const [locating, setLocating] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const userMarker = useRef<Marker | null>(null)

  useEffect(() => {
    const sync = () => {
      setBearing(map.getBearing())
      setPitched(map.getPitch() > 5)
    }
    map.on('rotate', sync)
    map.on('pitch', sync)
    return () => {
      map.off('rotate', sync)
      map.off('pitch', sync)
    }
  }, [map])

  useEffect(
    () => () => {
      userMarker.current?.remove()
    },
    [],
  )

  useEffect(() => {
    if (!locateMessage) return
    const id = window.setTimeout(() => setLocateMessage(null), 5000)
    return () => window.clearTimeout(id)
  }, [locateMessage])

  const duration = prefersReducedMotion() ? 0 : 450

  /**
   * Geolocalización opcional: solo tras pulsar el botón. La posición se usa en memoria para centrar el
   * mapa y dibujar un punto; no se guarda ni se envía a ningún servidor.
   */
  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocateMessage(t('map.locateUnsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        const [west, south, east, north] = MAP_LIMITS.maxBounds
        const { longitude, latitude } = coords
        if (longitude < west || longitude > east || latitude < south || latitude > north) {
          setLocateMessage(t('map.locateOutside'))
          return
        }
        userMarker.current?.remove()
        const dot = document.createElement('div')
        dot.className = styles.userDot ?? ''
        dot.setAttribute('role', 'img')
        dot.setAttribute('aria-label', t('map.userLocation'))
        userMarker.current = new Marker({ element: dot })
          .setLngLat([longitude, latitude])
          .addTo(map)
        map.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(map.getZoom(), 16),
          duration: duration * 2,
        })
      },
      () => {
        setLocating(false)
        setLocateMessage(t('map.locateError'))
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  return (
    <fieldset className={styles.controls}>
      <legend className="visually-hidden">{t('map.controls')}</legend>
      {locateMessage && (
        <p className={styles.message} role="status">
          {locateMessage}
        </p>
      )}
      <div className={`${styles.stack} ${styles.zoomStack}`}>
        <button
          type="button"
          className={styles.button}
          onClick={() => map.zoomIn({ duration })}
          aria-label={t('map.zoomIn')}
          title={t('map.zoomIn')}
        >
          <Plus aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => map.zoomOut({ duration })}
          aria-label={t('map.zoomOut')}
          title={t('map.zoomOut')}
        >
          <Minus aria-hidden="true" />
        </button>
      </div>
      <div className={styles.stack}>
        <button
          type="button"
          className={styles.button}
          onClick={() => map.easeTo({ bearing: 0, duration })}
          aria-label={t('map.resetNorth')}
          title={t('map.resetNorth')}
        >
          <Compass aria-hidden="true" style={{ transform: `rotate(${-bearing - 45}deg)` }} />
        </button>
        <button
          type="button"
          className={styles.button}
          data-active={pitched}
          aria-pressed={pitched}
          onClick={() =>
            map.easeTo({ pitch: pitched ? 0 : INITIAL_CAMERA.pitch, duration: duration * 1.6 })
          }
          aria-label={t('map.toggle3d')}
          title={t('map.toggle3d')}
        >
          <Box aria-hidden="true" />
          <span className={styles.badge} aria-hidden="true">
            {pitched ? '3D' : '2D'}
          </span>
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={locate}
          aria-busy={locating}
          aria-label={t('map.locate')}
          title={t('map.locate')}
        >
          <LocateFixed aria-hidden="true" className={locating ? styles.spinning : undefined} />
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => resetCamera(map, plazas, compact)}
          aria-label={t('map.reset')}
          title={t('map.reset')}
        >
          <House aria-hidden="true" />
        </button>
      </div>
    </fieldset>
  )
}
