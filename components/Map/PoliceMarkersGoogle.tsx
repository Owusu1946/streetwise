import { useEffect, useRef } from 'react'

interface PoliceMarkersGoogleProps {
    map: google.maps.Map | null
    mapLoaded: boolean
}

export function usePoliceMarkersGoogle({ map, mapLoaded }: PoliceMarkersGoogleProps) {
    const policeMarkers = useRef<google.maps.Marker[]>([])
    const currentInfoWindow = useRef<google.maps.InfoWindow | null>(null)

    useEffect(() => {
        if (!map || !mapLoaded) return

        const loadPoliceStations = async () => {
            const bounds = map.getBounds()
            if (!bounds) return

            const ne = bounds.getNorthEast()
            const sw = bounds.getSouthWest()

            const boundsData = {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng(),
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
                policeMarkers.current.forEach((marker) => marker.setMap(null))
                policeMarkers.current = []

                // Close any open info window
                if (currentInfoWindow.current) {
                    currentInfoWindow.current.close()
                    currentInfoWindow.current = null
                }

                // Create markers for each police station
                stations.forEach((station: any) => {
                    const marker = new google.maps.Marker({
                        position: { lat: station.latitude, lng: station.longitude },
                        map,
                        icon: {
                            url: '/shield-icon2.png',
                            scaledSize: new google.maps.Size(30, 30),
                            anchor: new google.maps.Point(15, 15),
                        },
                        title: station.name,
                    })

                    // Click handler
                    marker.addListener('click', () => {
                        if (currentInfoWindow.current) {
                            currentInfoWindow.current.close()
                        }

                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                <div style="padding: 15px; min-width: 250px;">
                  <div style="text-align: center; margin-bottom: 12px;">
                    <img src="/shield-icon2.png" style="width: 40px; height: 40px; display: inline-block;" />
                  </div>
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; text-align: center;">${station.name}</div>
                  <div style="font-size: 13px; color: #666; margin-bottom: 12px; text-align: center;">
                    <span style="display: block; margin-bottom: 4px;">📍 ${station.address}</span>
                  </div>
                </div>
              `,
                        })

                        infoWindow.open(map, marker)
                        currentInfoWindow.current = infoWindow
                    })

                    policeMarkers.current.push(marker)
                })
            } catch (error) {
                console.error('Error loading police stations:', error)
            }
        }

        // Load police stations initially
        loadPoliceStations()

        // Reload on map movement
        const moveEndListener = map.addListener('idle', loadPoliceStations)

        return () => {
            google.maps.event.removeListener(moveEndListener)
            policeMarkers.current.forEach((marker) => marker.setMap(null))
            policeMarkers.current = []
            if (currentInfoWindow.current) {
                currentInfoWindow.current.close()
                currentInfoWindow.current = null
            }
        }
    }, [map, mapLoaded])
}
