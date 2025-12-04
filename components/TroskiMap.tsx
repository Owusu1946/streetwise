'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bus, ChevronLeft, MapPin, Navigation, Plus, Search, X, AlertTriangle, Footprints, Car, Layers } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, useCallback } from 'react'
import { TroskiSearchDrawer } from './TroskiSearchDrawer'
import { TroskiContributeDrawer } from './TroskiContributeDrawer'
import { TroskiJourneyView } from './TroskiJourneyView'
import type { TroskiRoute, TroskiRouteStop, JourneyResult } from '@/utils/troski'
import { motion, AnimatePresence } from 'framer-motion'

interface TroskiMapProps {
    className?: string
    onExitTroskiMode: () => void
}

// Calculate distance between two coordinates in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// Format distance for display
function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
}

export function TroskiMap({ className = '', onExitTroskiMode }: TroskiMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const [lng, setLng] = useState<number>(-0.187)
    const [lat, setLat] = useState<number>(5.6037)
    const [zoom, setZoom] = useState<number>(12)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [mapError, setMapError] = useState<string | null>(null)
    const { resolvedTheme } = useTheme()

    // User location (continuously updated)
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const [isTracking, setIsTracking] = useState(false)

    // Map View Mode state
    const [mapViewMode, setMapViewMode] = useState<'standard' | 'satellite'>('standard')

    // UI states
    const [searchOpen, setSearchOpen] = useState(false)
    const [contributeOpen, setContributeOpen] = useState(false)
    const [selectedJourney, setSelectedJourney] = useState<JourneyResult | null>(null)
    const [destinationQuery, setDestinationQuery] = useState('')

    // Distance warning state
    const [distanceWarning, setDistanceWarning] = useState<{
        show: boolean
        distance: number
        originName: string
        journey: JourneyResult | null
    }>({ show: false, distance: 0, originName: '', journey: null })

    // Create user location marker element
    const createUserLocationMarker = useCallback(() => {
        const el = document.createElement('div')
        el.className = 'user-location-marker'
        el.innerHTML = `
            <div class="relative">
                <div class="w-5 h-5 bg-blue-500 rounded-full border-3 border-white shadow-lg z-10 relative"></div>
                <div class="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                <div class="absolute -inset-3 bg-blue-300/30 rounded-full"></div>
            </div>
        `
        return el
    }, [])

    // Update user marker position
    const updateUserMarker = useCallback((location: [number, number]) => {
        if (!map.current) return

        if (!userMarkerRef.current) {
            // Create new marker
            userMarkerRef.current = new mapboxgl.Marker({
                element: createUserLocationMarker(),
                anchor: 'center'
            })
                .setLngLat(location)
                .addTo(map.current)
        } else {
            // Update existing marker position with smooth animation
            userMarkerRef.current.setLngLat(location)
        }
    }, [createUserLocationMarker])

    // Start watching user location
    const startLocationTracking = useCallback(() => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported')
            return
        }

        setIsTracking(true)

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const loc: [number, number] = [position.coords.longitude, position.coords.latitude]
                setUserLocation(loc)
                updateUserMarker(loc)
            },
            (error) => {
                console.error('Geolocation error:', error)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000 // Update every second max
            }
        )
    }, [updateUserMarker])

    // Stop watching location
    const stopLocationTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setIsTracking(false)
    }, [])

    // Get initial user location and fly to it
    const getUserLocation = useCallback(async (): Promise<[number, number]> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'))
                return
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.longitude, position.coords.latitude]
                    setUserLocation(loc)
                    updateUserMarker(loc)

                    if (map.current) {
                        map.current.flyTo({
                            center: loc,
                            zoom: 15,
                            duration: 1500,
                        })
                    }

                    resolve(loc)
                },
                (error) => {
                    console.error('Geolocation error:', error)
                    reject(new Error('Could not get your location'))
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            )
        })
    }, [updateUserMarker])

    // Center map on user location
    const centerOnUser = useCallback(() => {
        if (userLocation && map.current) {
            map.current.flyTo({
                center: userLocation,
                zoom: 16,
                duration: 1000,
            })
        }
    }, [userLocation])

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return

        const mapStyle =
            resolvedTheme === 'dark'
                ? 'mapbox://styles/mapbox/dark-v11'
                : 'mapbox://styles/mapbox/light-v11'

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: mapStyle,
                center: [lng, lat],
                zoom: zoom,
                attributionControl: false,
            })
        } catch (error) {
            console.error('Error initializing map:', error)
            setMapError(error instanceof Error ? error.message : 'Failed to initialize map')
            return
        }

        map.current.on('move', () => {
            if (!map.current) return
            setLng(parseFloat(map.current.getCenter().lng.toFixed(4)))
            setLat(parseFloat(map.current.getCenter().lat.toFixed(4)))
            setZoom(parseFloat(map.current.getZoom().toFixed(2)))
        })

        map.current.on('load', async () => {
            if (!map.current) return
            setMapLoaded(true)

            try {
                await getUserLocation()
                // Start continuous tracking
                startLocationTracking()
            } catch (error) {
                console.log('Could not get user location:', error)
            }

            // Load troski stops
            await loadTroskiStops()
        })

        return () => {
            stopLocationTracking()
            map.current?.remove()
            map.current = null
        }
    }, [getUserLocation, startLocationTracking, stopLocationTracking])

    // Update map style when theme or view mode changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        let mapStyle = ''
        if (mapViewMode === 'satellite') {
            mapStyle = 'mapbox://styles/mapbox/satellite-streets-v12'
        } else {
            mapStyle =
                resolvedTheme === 'dark'
                    ? 'mapbox://styles/mapbox/dark-v11'
                    : 'mapbox://styles/mapbox/light-v11'
        }

        map.current.setStyle(mapStyle)
    }, [resolvedTheme, mapLoaded, mapViewMode])

    // Load troski stops and display on map
    const loadTroskiStops = async () => {
        try {
            const response = await fetch('/api/troski/stops')
            const data = await response.json()

            if (data.stops && map.current) {
                // Clear existing markers
                markersRef.current.forEach((marker) => marker.remove())
                markersRef.current = []

                // Add markers for each stop
                data.stops.forEach((stop: { id: string; name: string; latitude: number; longitude: number }) => {
                    const el = document.createElement('div')
                    el.className = 'troski-stop-marker'
                    el.innerHTML = `
            <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"></path>
                <path d="M15 6v6"></path>
                <path d="M2 12h19.6"></path>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
                <circle cx="7" cy="18" r="2"></circle>
                <path d="M9 18h5"></path>
                <circle cx="16" cy="18" r="2"></circle>
              </svg>
            </div>
          `

                    const marker = new mapboxgl.Marker({ element: el })
                        .setLngLat([stop.longitude, stop.latitude])
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${stop.name}</h3>
                  <p class="text-xs text-gray-500">Troski Stop</p>
                </div>
              `)
                        )
                        .addTo(map.current!)

                    markersRef.current.push(marker)
                })
            }
        } catch (error) {
            console.error('Error loading troski stops:', error)
        }
    }

    // Find the best boarding point on a journey (closest stop or origin to user)
    interface BoardingPoint {
        type: 'origin' | 'stop'
        name: string
        lat: number
        lng: number
        distance: number
        stopIndex?: number // If it's a stop, which index in the stops array
        fareSaved?: number // Estimated fare saved by boarding here
    }

    const findBestBoardingPoint = (journey: JourneyResult): BoardingPoint | null => {
        if (!userLocation) return null

        const points: BoardingPoint[] = []

        // Check origin
        const originDistance = calculateDistance(
            userLocation[1], userLocation[0],
            journey.route.origin_latitude,
            journey.route.origin_longitude
        )
        points.push({
            type: 'origin',
            name: journey.route.origin_name,
            lat: journey.route.origin_latitude,
            lng: journey.route.origin_longitude,
            distance: originDistance,
            fareSaved: 0
        })

        // Check all stops along the route
        journey.stops.forEach((stop, index) => {
            const stopDistance = calculateDistance(
                userLocation[1], userLocation[0],
                stop.stop_latitude,
                stop.stop_longitude
            )

            // Calculate estimated fare saved (sum of fares before this stop)
            let fareSaved = 0
            for (let i = 0; i <= index; i++) {
                if (journey.stops[i].fare_from_previous) {
                    fareSaved += Number(journey.stops[i].fare_from_previous)
                }
            }

            points.push({
                type: 'stop',
                name: stop.stop_name,
                lat: stop.stop_latitude,
                lng: stop.stop_longitude,
                distance: stopDistance,
                stopIndex: index,
                fareSaved
            })
        })

        // Sort by distance and return the closest one
        points.sort((a, b) => a.distance - b.distance)
        return points[0]
    }

    // Handle journey selection with smart boarding point detection
    const handleJourneySelect = async (journey: JourneyResult) => {
        setSearchOpen(false)

        if (!userLocation) {
            // No location, just proceed normally
            proceedWithJourney(journey, null)
            return
        }

        // Show "Finding best route" toast
        const { toast } = await import('sonner')
        const toastId = toast.loading('Finding best route...', {
            description: 'Checking nearby boarding points'
        })

        // Find the best boarding point
        const bestPoint = findBestBoardingPoint(journey)

        if (!bestPoint) {
            toast.dismiss(toastId)
            proceedWithJourney(journey, null)
            return
        }

        // If within 500m of ANY point, board there
        if (bestPoint.distance <= 500) {
            toast.dismiss(toastId)

            if (bestPoint.type === 'origin') {
                // User is close to origin, proceed normally
                toast.success('You\'re near the start!', {
                    description: `Board at ${bestPoint.name}`,
                    duration: 3000
                })
                proceedWithJourney(journey, bestPoint)
            } else {
                // User is close to a stop along the route - board there instead!
                const savingsMsg = bestPoint.fareSaved && bestPoint.fareSaved > 0
                    ? `Save GH₵${bestPoint.fareSaved} by boarding here`
                    : 'Board closer to you'

                toast.success(`Board at ${bestPoint.name}`, {
                    description: savingsMsg,
                    duration: 4000
                })
                proceedWithJourney(journey, bestPoint)
            }
        } else {
            // User is far from all points - show the closest option
            toast.dismiss(toastId)

            // Show warning about distance
            setDistanceWarning({
                show: true,
                distance: bestPoint.distance,
                originName: bestPoint.name,
                journey
            })
        }
    }

    // Proceed with journey, optionally starting from a different point
    const proceedWithJourney = (journey: JourneyResult, boardingPoint: BoardingPoint | null) => {
        setDistanceWarning({ show: false, distance: 0, originName: '', journey: null })

        // Create adjusted journey if boarding at a stop instead of origin
        let adjustedJourney = journey
        if (boardingPoint && boardingPoint.type === 'stop' && boardingPoint.stopIndex !== undefined) {
            // Filter out stops before the boarding point
            const remainingStops = journey.stops.slice(boardingPoint.stopIndex + 1)

            // Create new route with adjusted origin
            adjustedJourney = {
                ...journey,
                route: {
                    ...journey.route,
                    origin_name: boardingPoint.name,
                    origin_latitude: boardingPoint.lat,
                    origin_longitude: boardingPoint.lng,
                    // Adjust fare if we know how much was saved
                    total_fare: journey.route.total_fare
                        ? Math.max(0, Number(journey.route.total_fare) - (boardingPoint.fareSaved || 0))
                        : undefined
                },
                stops: remainingStops,
                // Store original journey for reference
                originalJourney: journey
            } as JourneyResult & { originalJourney?: JourneyResult }
        }

        setSelectedJourney(adjustedJourney)

        if (map.current && adjustedJourney.route) {
            // Fit map to show user location and the journey
            const bounds = new mapboxgl.LngLatBounds()

            // Include user location
            if (userLocation) {
                bounds.extend(userLocation)
            }

            bounds.extend([adjustedJourney.route.origin_longitude, adjustedJourney.route.origin_latitude])
            bounds.extend([adjustedJourney.route.destination_longitude, adjustedJourney.route.destination_latitude])

            adjustedJourney.stops.forEach((stop) => {
                bounds.extend([stop.stop_longitude, stop.stop_latitude])
            })

            map.current.fitBounds(bounds, { padding: 80, duration: 1000 })

            // Draw the journey on the map
            drawJourneyOnMap(adjustedJourney)
        }
    }

    // Cancel distance warning
    const cancelDistanceWarning = () => {
        setDistanceWarning({ show: false, distance: 0, originName: '', journey: null })
    }

    // Close the journey view but KEEP the route visible on the map
    const closeJourneyView = () => {
        setSelectedJourney(null)
    }

    // Draw journey route on map using Mapbox Directions API for real roads
    const drawJourneyOnMap = async (journey: JourneyResult) => {
        if (!map.current) return

        // Remove existing journey layers
        if (map.current.getLayer('journey-line')) {
            map.current.removeLayer('journey-line')
        }
        if (map.current.getLayer('journey-line-casing')) {
            map.current.removeLayer('journey-line-casing')
        }
        if (map.current.getLayer('walk-to-start-line')) {
            map.current.removeLayer('walk-to-start-line')
        }
        if (map.current.getSource('journey-route')) {
            map.current.removeSource('journey-route')
        }
        if (map.current.getSource('walk-to-start')) {
            map.current.removeSource('walk-to-start')
        }

        // Remove existing journey markers
        document.querySelectorAll('.journey-stop-marker').forEach(el => el.remove())

        // Build waypoints array for Mapbox Directions API
        const waypoints: [number, number][] = [
            [journey.route.origin_longitude, journey.route.origin_latitude],
            ...journey.stops.map((stop) => [stop.stop_longitude, stop.stop_latitude] as [number, number]),
            [journey.route.destination_longitude, journey.route.destination_latitude],
        ]

        try {
            // If user is not at origin, draw walking route to origin first
            if (userLocation) {
                const distanceToOrigin = calculateDistance(
                    userLocation[1],
                    userLocation[0],
                    journey.route.origin_latitude,
                    journey.route.origin_longitude
                )

                if (distanceToOrigin > 50) { // More than 50m away
                    // Fetch walking route to start point
                    const walkUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation[0]},${userLocation[1]};${journey.route.origin_longitude},${journey.route.origin_latitude}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&geometries=geojson&overview=full`

                    const walkResponse = await fetch(walkUrl)
                    const walkData = await walkResponse.json()

                    if (walkData.routes && walkData.routes.length > 0) {
                        map.current!.addSource('walk-to-start', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: walkData.routes[0].geometry,
                            },
                        })

                        // Dashed blue line for walking
                        map.current!.addLayer({
                            id: 'walk-to-start-line',
                            type: 'line',
                            source: 'walk-to-start',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                            },
                            paint: {
                                'line-color': '#3b82f6',
                                'line-width': 4,
                                'line-dasharray': [2, 2],
                            },
                        })
                    }
                }
            }

            // Fetch route from Mapbox Directions API
            const coordsString = waypoints.map(coord => `${coord[0]},${coord[1]}`).join(';')
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&geometries=geojson&overview=full`

            const response = await fetch(url)
            const data = await response.json()

            if (data.routes && data.routes.length > 0) {
                // Use actual road-following geometry from Directions API
                const routeGeometry = data.routes[0].geometry

                // Add source
                map.current!.addSource('journey-route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: routeGeometry,
                    },
                })

                // Add casing layer (outline)
                map.current!.addLayer({
                    id: 'journey-line-casing',
                    type: 'line',
                    source: 'journey-route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#064e3b',
                        'line-width': 8,
                    },
                })

                // Add main line layer
                map.current!.addLayer({
                    id: 'journey-line',
                    type: 'line',
                    source: 'journey-route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#10b981',
                        'line-width': 5,
                    },
                })
            } else {
                // Fallback to straight lines if Directions API fails
                console.warn('Directions API failed, using straight lines')
                addStraightLineRoute(waypoints)
            }
        } catch (error) {
            console.error('Error fetching directions:', error)
            // Fallback to straight lines
            addStraightLineRoute(waypoints)
        }

        // Add markers for journey stops
        addJourneyMarkers(journey)
    }

    // Fallback: Add straight line route
    const addStraightLineRoute = (coordinates: [number, number][]) => {
        if (!map.current) return

        map.current.addSource('journey-route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
            },
        })

        map.current.addLayer({
            id: 'journey-line',
            type: 'line',
            source: 'journey-route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#10b981',
                'line-width': 4,
                'line-dasharray': [2, 1],
            },
        })
    }

    // Add markers for journey stops
    const addJourneyMarkers = (journey: JourneyResult) => {
        if (!map.current) return

        // Add origin marker
        const originEl = document.createElement('div')
        originEl.className = 'journey-stop-marker'
        originEl.innerHTML = `
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>
        `
        new mapboxgl.Marker({ element: originEl })
            .setLngLat([journey.route.origin_longitude, journey.route.origin_latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                    <h3 class="font-semibold text-sm">${journey.route.origin_name}</h3>
                    <p class="text-xs text-blue-600">Start here</p>
                </div>
            `))
            .addTo(map.current!)

        // Add stop markers
        journey.stops.forEach((stop, index) => {
            const el = document.createElement('div')
            el.className = 'journey-stop-marker'

            const bgColor = stop.stop_type === 'board' ? 'bg-blue-500' : stop.stop_type === 'alight' ? 'bg-orange-500' : 'bg-purple-500'

            el.innerHTML = `
        <div class="w-6 h-6 ${bgColor} rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white text-xs font-bold">
          ${index + 1}
        </div>
      `

            new mapboxgl.Marker({ element: el })
                .setLngLat([stop.stop_longitude, stop.stop_latitude])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${stop.stop_name}</h3>
              <p class="text-xs text-gray-500 capitalize">${stop.stop_type}</p>
              ${stop.troski_description ? `<p class="text-xs mt-1">${stop.troski_description}</p>` : ''}
            </div>
          `)
                )
                .addTo(map.current!)
        })

        // Add destination marker
        const destEl = document.createElement('div')
        destEl.className = 'journey-stop-marker'
        destEl.innerHTML = `
            <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>
        `
        new mapboxgl.Marker({ element: destEl })
            .setLngLat([journey.route.destination_longitude, journey.route.destination_latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                    <h3 class="font-semibold text-sm">${journey.route.destination_name}</h3>
                    <p class="text-xs text-orange-600">Destination</p>
                </div>
            `))
            .addTo(map.current!)
    }

    // Clear journey from map completely (for new search)
    const clearJourney = () => {
        setSelectedJourney(null)
        setDestinationQuery('')

        if (!map.current) return

        if (map.current.getLayer('journey-line')) {
            map.current.removeLayer('journey-line')
        }
        if (map.current.getLayer('journey-line-casing')) {
            map.current.removeLayer('journey-line-casing')
        }
        if (map.current.getLayer('walk-to-start-line')) {
            map.current.removeLayer('walk-to-start-line')
        }
        if (map.current.getSource('journey-route')) {
            map.current.removeSource('journey-route')
        }
        if (map.current.getSource('walk-to-start')) {
            map.current.removeSource('walk-to-start')
        }

        // Remove journey markers
        document.querySelectorAll('.journey-stop-marker').forEach(el => el.remove())

        // Reload stops
        loadTroskiStops()
    }

    // Handle route contribution success
    const handleContributeSuccess = () => {
        setContributeOpen(false)
        loadTroskiStops()

        import('sonner').then(({ toast }) => {
            toast.success('Route contributed!', {
                description: 'Thank you for helping others navigate.',
            })
        })
    }

    return (
        <div className={`relative h-full w-full bg-background overflow-hidden ${className}`}>
            {/* Map container */}
            <div
                ref={mapContainer}
                className="absolute inset-0 z-0"
                style={{ width: '100%', height: '100%' }}
            />

            {/* Loading indicator */}
            {!mapLoaded && !mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
                    <div className="text-foreground text-sm">Loading Troski Map...</div>
                </div>
            )}

            {/* Error display */}
            {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
                    <div className="text-destructive p-4 text-center">
                        <div className="text-lg mb-2">Failed to load map</div>
                        <div className="text-sm">{mapError}</div>
                    </div>
                </div>
            )}

            {/* Distance Warning Modal */}
            <AnimatePresence>
                {distanceWarning.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">No nearby boarding points</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Closest stop is {formatDistance(distanceWarning.distance)} away
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                The nearest point to board is <span className="font-semibold text-foreground">{distanceWarning.originName}</span>.
                                You'll need to get there first.
                            </p>

                            <div className="flex items-center gap-4 mb-6 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Footprints className="h-4 w-4" />
                                    <span>{distanceWarning.distance < 2000 ? 'Walk there' : 'Take a ride'}</span>
                                </div>
                                <div className="text-muted-foreground">•</div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Car className="h-4 w-4" />
                                    <span>~{Math.ceil(distanceWarning.distance / 1000 * 3)} min</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={cancelDistanceWarning}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                    onClick={() => distanceWarning.journey && proceedWithJourney(distanceWarning.journey, null)}
                                >
                                    Continue Anyway
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top bar - Mode indicator & Exit */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExitTroskiMode}
                    className="bg-card/90 backdrop-blur-sm"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Exit Troski
                </Button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-lg">
                    <Bus className="h-4 w-4" />
                    Troski Mode
                    {isTracking && (
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                </div>

                <button
                    onClick={centerOnUser}
                    className="bg-card rounded-full p-3 shadow-md hover:shadow-lg transition-shadow border border-border"
                    aria-label="My location"
                >
                    <Navigation className="h-5 w-5 text-foreground" />
                </button>
            </div>

            {/* Map Style Toggle Button */}
            <button
                onClick={() => setMapViewMode(prev => prev === 'standard' ? 'satellite' : 'standard')}
                className={`absolute top-24 right-6 z-10 rounded-full p-3 shadow-md hover:shadow-lg transition-all border border-border ${mapViewMode === 'satellite' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                    }`}
                aria-label="Toggle Satellite View"
            >
                <Layers className="h-5 w-5" />
            </button>

            {/* Journey View (when a journey is selected) */}
            {selectedJourney && (
                <TroskiJourneyView
                    journey={selectedJourney}
                    onClose={closeJourneyView}
                    onClearRoute={clearJourney}
                    userLocation={userLocation}
                />
            )}

            {/* Bottom controls */}
            {!selectedJourney && (
                <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
                    <div className="px-4 pb-8 bg-gradient-to-t from-background via-background/50 to-transparent">
                        <div className="space-y-3 max-w-lg mx-auto pointer-events-auto">
                            {/* Contribute route button */}
                            <Button
                                onClick={() => setContributeOpen(true)}
                                variant="outline"
                                className="w-full h-12 font-semibold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                            >
                                <Plus className="h-5 w-5" />
                                Contribute a Route
                            </Button>

                            {/* Search input */}
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Where do you want to go?"
                                    value={destinationQuery}
                                    onClick={() => setSearchOpen(true)}
                                    readOnly
                                    className="w-full h-14 text-base pl-12 pr-4 bg-card backdrop-blur-sm text-foreground placeholder-muted-foreground shadow-2xl border border-border rounded-xl cursor-pointer"
                                />
                                <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Drawer */}
            <TroskiSearchDrawer
                open={searchOpen}
                onOpenChange={setSearchOpen}
                userLocation={userLocation}
                onSelectJourney={handleJourneySelect}
                onQueryChange={setDestinationQuery}
            />

            {/* Contribute Drawer */}
            <TroskiContributeDrawer
                open={contributeOpen}
                onOpenChange={setContributeOpen}
                userLocation={userLocation}
                onSuccess={handleContributeSuccess}
            />
        </div>
    )
}
