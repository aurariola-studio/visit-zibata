import { Component, type ReactNode } from 'react'
import { MapErrorMessage } from './MapErrorMessage.tsx'

interface MapErrorBoundaryProps {
  children: ReactNode
  onError: () => void
}

/**
 * Si el código del mapa no llega a cargarse (red inestable o una publicación nueva que retiró el chunk
 * anterior), la guía sigue funcionando con la lista en lugar de quedar en blanco.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[mapa]', error)
    this.props.onError()
  }

  render() {
    if (!this.state.failed) return this.props.children
    // Recargar es lo fiable: los navegadores recuerdan un import() fallido.
    return <MapErrorMessage reason="generic" onRetry={() => window.location.reload()} />
  }
}
