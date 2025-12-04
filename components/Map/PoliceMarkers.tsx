import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'

interface PoliceMarkersProps {
  map: mapboxgl.Map | null
  mapLoaded: boolean
}

export function usePoliceMarkers({ map, mapLoaded }: PoliceMarkersProps) {
  const policeMarkers = useRef<mapboxgl.Marker[]>([])
  const currentPopup = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map || !mapLoaded) return

    const loadPoliceStations = async () => {
      const bounds = map.getBounds()
      if (!bounds) return

      const boundsData = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      }

      try {
        const response = await fetch('/api/police-stations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(boundsData),
        })

        if (!response.ok) {
          console.error('Failed to fetch police stations')
          return
        }

        const data = await response.json()
        const stations = data.stations || []

        console.log(`Loaded ${stations.length} police stations`)

        // Clear existing markers
        policeMarkers.current.forEach((marker) => marker.remove())
        policeMarkers.current = []

        // Close any open popup
        if (currentPopup.current) {
          currentPopup.current.remove()
          currentPopup.current = null
        }

        // Create individual markers for each police station (no clustering)
        stations.forEach((station: any) => {
          const el = document.createElement('div')
          el.className = 'police-marker'
          el.style.width = '30px'
          el.style.height = '30px'
          el.style.cursor = 'pointer'

          // Create img element for shield icon
          const img = document.createElement('img')
          img.src = '/shield-icon2.png'
          img.style.width = '100%'
          img.style.height = '100%'
          img.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'

          el.appendChild(img)

          // Click handler for police station
          el.addEventListener('click', (e) => {
            e.stopPropagation()

            // Remove existing popup
            if (currentPopup.current) {
              currentPopup.current.remove()
            }

            // Create and show popup with station details
            const popup = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              className: 'police-popup',
              maxWidth: '350px',
              anchor: 'bottom',
              offset: 20,
            })
              .setLngLat([station.longitude, station.latitude])
              .setHTML(
                `
                <div style="padding: 15px; min-width: 250px; color: hsl(var(--foreground));">
                  <div style="text-align: center; margin-bottom: 12px;">
                    <img src="/shield-icon2.png" style="width: 40px; height: 40px; display: inline-block;" />
                  </div>
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; text-align: center;">${station.name}</div>
                  <div style="font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 12px; text-align: center;">
                    <span style="display: block; margin-bottom: 4px;">📍 ${station.address}</span>
                  </div>

                </div>
              `
              )
              .addTo(map!)

            currentPopup.current = popup
          })

          // Create marker
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([station.longitude, station.latitude])
            .addTo(map!)

          policeMarkers.current.push(marker)
        })
      } catch (error) {
        console.error('Error loading police stations:', error)
      }
    }

    // Load police stations initially
    loadPoliceStations()

    // Reload on map movement
    map.on('moveend', loadPoliceStations)

    return () => {
      if (map) {
        map.off('moveend', loadPoliceStations)
      }
      policeMarkers.current.forEach((marker) => marker.remove())
      policeMarkers.current = []
      if (currentPopup.current) {
        currentPopup.current.remove()
        currentPopup.current = null
      }
    }
  }, [map, mapLoaded])
}
