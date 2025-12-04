import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getIncidentEmoji } from '@/config/config'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'

interface IncidentMarkersProps {
  map: mapboxgl.Map | null
  mapLoaded: boolean
  showCommunityData: boolean
}

export function useIncidentMarkers({ map, mapLoaded, showCommunityData }: IncidentMarkersProps) {
  const incidentMarkers = useRef<mapboxgl.Marker[]>([])
  const currentPopup = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map || !mapLoaded) return

    // Clear markers if community data is hidden
    if (!showCommunityData) {
      incidentMarkers.current.forEach((marker) => marker.remove())
      incidentMarkers.current = []
      if (currentPopup.current) {
        currentPopup.current.remove()
        currentPopup.current = null
      }
      return
    }

    const loadIncidents = async () => {
      const bounds = map.getBounds()
      if (!bounds) return

      const zoom = map.getZoom()
      const boundsData = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      }

      try {
        const response = await fetch('/api/incidents-in-bounds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(boundsData),
        })

        if (!response.ok) {
          console.error('Failed to fetch incidents')
          return
        }

        const data = await response.json()
        const incidents = data.incidents || []

        // Clear existing markers
        incidentMarkers.current.forEach((marker) => marker.remove())
        incidentMarkers.current = []

        // Close any open popup
        if (currentPopup.current) {
          currentPopup.current.remove()
          currentPopup.current = null
        }

        // Cluster threshold - show individual markers above zoom 14
        const CLUSTER_ZOOM_THRESHOLD = 14
        const shouldCluster = zoom < CLUSTER_ZOOM_THRESHOLD

        if (shouldCluster && incidents.length > 0) {
          // Simple grid-based clustering
          const clusterRadius = 0.01 // ~1km in degrees
          const clusters = new Map<string, any[]>()

          incidents.forEach((incident: any) => {
            const gridX = Math.floor(incident.longitude / clusterRadius)
            const gridY = Math.floor(incident.latitude / clusterRadius)
            const key = `${gridX},${gridY}`

            if (!clusters.has(key)) {
              clusters.set(key, [])
            }
            clusters.get(key)!.push(incident)
          })

          // Create markers for each cluster
          clusters.forEach((clusterIncidents: any[]) => {
            const el = document.createElement('div')
            el.className = 'incident-marker'

            const root = createRoot(el)
            const firstIncident = clusterIncidents[0]
            const centerLng =
              clusterIncidents.reduce((sum: number, i: any) => sum + i.longitude, 0) /
              clusterIncidents.length
            const centerLat =
              clusterIncidents.reduce((sum: number, i: any) => sum + i.latitude, 0) /
              clusterIncidents.length

            if (clusterIncidents.length === 1) {
              // Single incident - show as avatar
              const emoji = getIncidentEmoji(firstIncident.type)
              root.render(
                <Avatar className="h-8 w-8 cursor-pointer shadow-lg hover:scale-110 transition-transform">
                  <AvatarFallback className="text-base shadow-none bg-transparent">
                    {emoji}
                  </AvatarFallback>
                </Avatar>
              )
            } else {
              // Multiple incidents - show stacked with count
              const firstEmoji = getIncidentEmoji(clusterIncidents[0].type)

              root.render(
                <div className="flex items-center -space-x-2 cursor-pointer hover:scale-110 transition-transform">
                  {/*<Avatar className="h-8 w-8 shadow-lg z-10">
                    <AvatarFallback className="text-sm bg-transparent">{firstEmoji}</AvatarFallback>
                  </Avatar>*/}
                  <Avatar className="h-8 w-8 shadow-lg z-9">
                    <AvatarFallback className="text-xs text-muted-foreground bg-background/30 backdrop-blur-sm font-normal">
                      +{clusterIncidents.length - 1}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )
            }

            // Click handler for cluster/incident
            el.addEventListener('click', (e) => {
              e.stopPropagation()

              if (clusterIncidents.length === 1) {
                // Single incident - show popup
                if (currentPopup.current) {
                  currentPopup.current.remove()
                }

                const popup = new mapboxgl.Popup({
                  closeButton: true,
                  closeOnClick: true,
                  className: 'incident-popup',
                  maxWidth: '300px',
                  anchor: 'bottom',
                  offset: 15,
                })
                  .setLngLat([centerLng, centerLat])
                  .setHTML(
                    `
                    <div style="padding: 15px; min-width: 180px; color: hsl(var(--foreground));">
                      <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${getIncidentEmoji(firstIncident.type)}</div>
                      <div style="font-weight: 600; font-size: 16px; text-transform: capitalize; margin-bottom: 6px;">${firstIncident.type}</div>
                      <div style="font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 4px;">Severity: ${firstIncident.severity}/10</div>
                      <div style="font-size: 13px; color: hsl(var(--muted-foreground));">Reported: ${new Date(firstIncident.created_at).toLocaleDateString()}</div>
                    </div>
                  `
                  )
                  .addTo(map!)

                currentPopup.current = popup
              } else {
                // Multiple incidents - zoom in to break up the cluster
                map?.flyTo({
                  center: [centerLng, centerLat],
                  zoom: map.getZoom() + 2,
                  essential: true,
                })
              }
            })

            const marker = new mapboxgl.Marker({
              element: el,
              anchor: 'center',
            })
              .setLngLat([centerLng, centerLat])
              .addTo(map!)

            incidentMarkers.current.push(marker)
          })
        } else {
          // Show individual markers (zoom >= 14)
          incidents.forEach((incident: any) => {
            const el = document.createElement('div')
            el.className = 'incident-marker'

            const root = createRoot(el)
            const emoji = getIncidentEmoji(incident.type)

            root.render(
              <Avatar className="h-8 w-8 cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <AvatarFallback className="text-base shadow-none bg-transparent">
                  {emoji}
                </AvatarFallback>
              </Avatar>
            )

            el.addEventListener('click', (e) => {
              e.stopPropagation()

              if (currentPopup.current) {
                currentPopup.current.remove()
              }

              const date = new Date(incident.created_at).toLocaleDateString()
              const popup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: true,
                className: 'incident-popup',
                maxWidth: '300px',
                anchor: 'bottom',
                offset: 15,
              })
                .setLngLat([incident.longitude, incident.latitude])
                .setHTML(
                  `
                  <div style="padding: 15px; min-width: 180px; color: hsl(var(--foreground));">
                    <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${emoji}</div>
                    <div style="font-weight: 600; font-size: 16px; text-transform: capitalize; margin-bottom: 6px;">${incident.type}</div>
                    <div style="font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 4px;">Severity: ${incident.severity}/10</div>
                    <div style="font-size: 13px; color: hsl(var(--muted-foreground));">Reported: ${date}</div>
                  </div>
                `
                )
                .addTo(map!)

              currentPopup.current = popup
            })

            const marker = new mapboxgl.Marker({
              element: el,
              anchor: 'center',
            })
              .setLngLat([incident.longitude, incident.latitude])
              .addTo(map!)

            incidentMarkers.current.push(marker)
          })
        }
      } catch (error) {
        console.error('Error loading incidents:', error)
      }
    }

    loadIncidents()

    map.on('moveend', loadIncidents)
    map.on('zoomend', loadIncidents)

    return () => {
      if (map) {
        map.off('moveend', loadIncidents)
        map.off('zoomend', loadIncidents)
      }
      incidentMarkers.current.forEach((marker) => marker.remove())
      incidentMarkers.current = []
      if (currentPopup.current) {
        currentPopup.current.remove()
        currentPopup.current = null
      }
    }
  }, [map, mapLoaded, showCommunityData])
}
