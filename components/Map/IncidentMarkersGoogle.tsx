import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getIncidentEmoji } from '@/config/config'
import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'

interface IncidentMarkersGoogleProps {
    map: google.maps.Map | null
    mapLoaded: boolean
    showCommunityData: boolean
}

export function useIncidentMarkersGoogle({ map, mapLoaded, showCommunityData }: IncidentMarkersGoogleProps) {
    const incidentMarkers = useRef<google.maps.Marker[]>([])
    const currentInfoWindow = useRef<google.maps.InfoWindow | null>(null)

    useEffect(() => {
        if (!map || !mapLoaded) return

        // Clear markers if community data is hidden
        if (!showCommunityData) {
            incidentMarkers.current.forEach((marker) => marker.setMap(null))
            incidentMarkers.current = []
            if (currentInfoWindow.current) {
                currentInfoWindow.current.close()
                currentInfoWindow.current = null
            }
            return
        }

        const loadIncidents = async () => {
            const bounds = map.getBounds()
            if (!bounds) return

            const zoom = map.getZoom() || 12
            const ne = bounds.getNorthEast()
            const sw = bounds.getSouthWest()

            const boundsData = {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng(),
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
                incidentMarkers.current.forEach((marker) => marker.setMap(null))
                incidentMarkers.current = []

                // Close any open info window
                if (currentInfoWindow.current) {
                    currentInfoWindow.current.close()
                    currentInfoWindow.current = null
                }

                // Cluster threshold
                const CLUSTER_ZOOM_THRESHOLD = 14
                const shouldCluster = zoom < CLUSTER_ZOOM_THRESHOLD

                if (shouldCluster && incidents.length > 0) {
                    // Simple grid-based clustering
                    const clusterRadius = 0.01
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
                        const firstIncident = clusterIncidents[0]
                        const centerLng =
                            clusterIncidents.reduce((sum: number, i: any) => sum + i.longitude, 0) /
                            clusterIncidents.length
                        const centerLat =
                            clusterIncidents.reduce((sum: number, i: any) => sum + i.latitude, 0) /
                            clusterIncidents.length

                        // Create custom marker element
                        const el = document.createElement('div')
                        el.className = 'incident-marker'
                        el.style.cursor = 'pointer'

                        const root = createRoot(el)

                        if (clusterIncidents.length === 1) {
                            const emoji = getIncidentEmoji(firstIncident.type)
                            root.render(
                                <Avatar className="h-8 w-8 cursor-pointer shadow-lg hover:scale-110 transition-transform">
                                    <AvatarFallback className="text-base shadow-none bg-transparent">
                                        {emoji}
                                    </AvatarFallback>
                                </Avatar>
                            )
                        } else {
                            root.render(
                                <div className="flex items-center -space-x-2 cursor-pointer hover:scale-110 transition-transform">
                                    <Avatar className="h-8 w-8 shadow-lg z-9">
                                        <AvatarFallback className="text-xs text-muted-foreground bg-background/30 backdrop-blur-sm font-normal">
                                            +{clusterIncidents.length - 1}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )
                        }

                        // Create marker with custom icon using SVG
                        const marker = new google.maps.Marker({
                            position: { lat: centerLat, lng: centerLng },
                            map,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                                    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <text x="16" y="24" font-size="24" text-anchor="middle">${getIncidentEmoji(firstIncident.type)}</text>
                  </svg>`
                                ),
                                scaledSize: new google.maps.Size(32, 32),
                                anchor: new google.maps.Point(16, 16),
                            },
                            title: clusterIncidents.length === 1 ? firstIncident.type : `${clusterIncidents.length} incidents`,
                        })

                        // Click handler
                        marker.addListener('click', () => {
                            if (clusterIncidents.length === 1) {
                                // Single incident - show info window
                                if (currentInfoWindow.current) {
                                    currentInfoWindow.current.close()
                                }

                                const emoji = getIncidentEmoji(firstIncident.type)
                                const infoWindow = new google.maps.InfoWindow({
                                    content: `
                    <div style="padding: 15px; min-width: 180px;">
                      <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${emoji}</div>
                      <div style="font-weight: 600; font-size: 16px; text-transform: capitalize; margin-bottom: 6px;">${firstIncident.type}</div>
                      <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Severity: ${firstIncident.severity}/10</div>
                      <div style="font-size: 13px; color: #666;">Reported: ${new Date(firstIncident.created_at).toLocaleDateString()}</div>
                    </div>
                  `,
                                })

                                infoWindow.open(map, marker)
                                currentInfoWindow.current = infoWindow
                            } else {
                                // Multiple incidents - zoom in
                                map.setCenter({ lat: centerLat, lng: centerLng })
                                map.setZoom((map.getZoom() || 12) + 2)
                            }
                        })

                        incidentMarkers.current.push(marker)
                    })
                } else {
                    // Show individual markers
                    incidents.forEach((incident: any) => {
                        const emoji = getIncidentEmoji(incident.type)

                        const marker = new google.maps.Marker({
                            position: { lat: incident.latitude, lng: incident.longitude },
                            map,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                                    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <text x="16" y="24" font-size="24" text-anchor="middle">${emoji}</text>
                  </svg>`
                                ),
                                scaledSize: new google.maps.Size(32, 32),
                                anchor: new google.maps.Point(16, 16),
                            },
                            title: incident.type,
                        })

                        marker.addListener('click', () => {
                            if (currentInfoWindow.current) {
                                currentInfoWindow.current.close()
                            }

                            const date = new Date(incident.created_at).toLocaleDateString()
                            const infoWindow = new google.maps.InfoWindow({
                                content: `
                  <div style="padding: 15px; min-width: 180px;">
                    <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${emoji}</div>
                    <div style="font-weight: 600; font-size: 16px; text-transform: capitalize; margin-bottom: 6px;">${incident.type}</div>
                    <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Severity: ${incident.severity}/10</div>
                    <div style="font-size: 13px; color: #666;">Reported: ${date}</div>
                  </div>
                `,
                            })

                            infoWindow.open(map, marker)
                            currentInfoWindow.current = infoWindow
                        })

                        incidentMarkers.current.push(marker)
                    })
                }
            } catch (error) {
                console.error('Error loading incidents:', error)
            }
        }

        loadIncidents()

        const moveEndListener = map.addListener('idle', loadIncidents)

        return () => {
            google.maps.event.removeListener(moveEndListener)
            incidentMarkers.current.forEach((marker) => marker.setMap(null))
            incidentMarkers.current = []
            if (currentInfoWindow.current) {
                currentInfoWindow.current.close()
                currentInfoWindow.current = null
            }
        }
    }, [map, mapLoaded, showCommunityData])
}
