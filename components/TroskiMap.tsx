'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bus, ChevronLeft, MapPin, Navigation, Plus, Search, X, AlertTriangle, Footprints, Car, Layers } from 'lucide-react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, useCallback } from 'react'
import { TroskiSearchDrawer } from './TroskiSearchDrawer'
import { TroskiContributeDrawer } from './TroskiContributeDrawer'
import { TroskiJourneyView } from './TroskiJourneyView'
import type { TroskiRoute, TroskiRouteStop, JourneyResult } from '@/utils/troski'
import { motion, AnimatePresence } from 'framer-motion'
import {
    DARK_MAP_STYLE,
    LIGHT_MAP_STYLE,
    GOOGLE_MAPS_LIBRARIES,
    getMapTypeId,
    type MapViewMode,
} from '@/utils/googlemaps'

interface TroskiMapProps {
    className?: string
    onExitTroskiMode: () => void
}

const containerStyle = {
    width: '100%',
    height: '100%',
}

const defaultCenter = {
    lat: 5.6037,
    lng: -0.1870,
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
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const markersRef = useRef<google.maps.Marker[]>([])
    const userMarkerRef = useRef<google.maps.Marker | null>(null)
    const journeyMarkersRef = useRef<google.maps.Marker[]>([])
    const journeyPolylinesRef = useRef<google.maps.Polyline[]>([])
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
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
    const [mapViewMode, setMapViewMode] = useState<MapViewMode>('standard')

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

    // Load Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
    })

    // Update user marker position
    const updateUserMarker = useCallback((location: [number, number]) => {
        if (!map) return

        const position = { lat: location[1], lng: location[0] }

        if (!userMarkerRef.current) {
            userMarkerRef.current = new google.maps.Marker({
                map,
                position,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                zIndex: 1000,
            })
        } else {
            userMarkerRef.current.setPosition(position)
        }
    }, [map])

    // Start watching user location (continuous tracking)
    const startLocationTracking = useCallback(() => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported')
            return
        }

        // Avoid starting multiple watchers
        if (watchIdRef.current !== null) {
            console.log('Location tracking already active')
            return
        }

        console.log('Starting Troski location tracking...')
        setIsTracking(true)

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const loc: [number, number] = [position.coords.longitude, position.coords.latitude]
                setUserLocation(loc)
                updateUserMarker(loc)
            },
            (error) => {
                console.error('Geolocation tracking error:', error)
                // Don't stop tracking on error, geolocation might recover
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 1000 // Allow cached position up to 1 second for smoother updates
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

                    if (map) {
                        map.panTo({ lat: loc[1], lng: loc[0] })
                        map.setZoom(15)
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
    }, [map, updateUserMarker])

    // Center map on user location
    const centerOnUser = useCallback(() => {
        if (userLocation && map) {
            map.panTo({ lat: userLocation[1], lng: userLocation[0] })
            map.setZoom(16)
        }
    }, [userLocation, map])

    // Handle map load
    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
        setMapLoaded(true)
        directionsServiceRef.current = new google.maps.DirectionsService()
        console.log('TroskiMap loaded successfully!')
    }, [])

    // Handle map unmount
    const onUnmount = useCallback(() => {
        stopLocationTracking()
        setMap(null)
        setMapLoaded(false)
    }, [stopLocationTracking])

    // Initialize location and load stops when map is ready
    useEffect(() => {
        if (mapLoaded && map) {
            // Start continuous tracking immediately
            startLocationTracking()

            // Also try to get initial location and pan to it
            getUserLocation()
                .catch((error) => {
                    console.log('Could not get initial user location:', error)
                })

            loadTroskiStops()
        }

        // Cleanup on unmount
        return () => {
            stopLocationTracking()
        }
    }, [mapLoaded, map, getUserLocation, startLocationTracking, stopLocationTracking])

    // Update map style when theme or view mode changes
    useEffect(() => {
        if (!map || !mapLoaded) return

        map.setMapTypeId(getMapTypeId(mapViewMode))

        if (mapViewMode === 'standard') {
            map.setOptions({
                styles: resolvedTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
            })
        } else {
            map.setOptions({ styles: [] })
        }
    }, [resolvedTheme, mapLoaded, mapViewMode, map])

    // Handle map center changes
    const handleCenterChanged = useCallback(() => {
        if (!map) return
        const center = map.getCenter()
        if (center) {
            setLng(parseFloat(center.lng().toFixed(4)))
            setLat(parseFloat(center.lat().toFixed(4)))
        }
    }, [map])

    const handleZoomChanged = useCallback(() => {
        if (!map) return
        setZoom(map.getZoom() || 12)
    }, [map])

    // Load troski stops and display on map
    const loadTroskiStops = async () => {
        if (!map) return

        try {
            const response = await fetch('/api/troski/stops')
            const data = await response.json()

            if (data.stops) {
                // Clear existing markers
                markersRef.current.forEach((marker) => marker.setMap(null))
                markersRef.current = []

                // Add markers for each stop
                data.stops.forEach((stop: { id: string; name: string; latitude: number; longitude: number }) => {
                    const marker = new google.maps.Marker({
                        position: { lat: stop.latitude, lng: stop.longitude },
                        map,
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                                    <circle cx="16" cy="16" r="14" fill="#10b981" stroke="white" stroke-width="2"/>
                                    <text x="16" y="20" font-size="14" text-anchor="middle" fill="white">🚌</text>
                                </svg>
                            `),
                            scaledSize: new google.maps.Size(32, 32),
                            anchor: new google.maps.Point(16, 16),
                        },
                        title: stop.name,
                    })

                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                            <div style="padding: 8px;">
                                <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">${stop.name}</h3>
                                <p style="font-size: 12px; color: #666; margin: 0;">Troski Stop</p>
                            </div>
                        `,
                    })

                    marker.addListener('click', () => {
                        infoWindow.open(map, marker)
                    })

                    markersRef.current.push(marker)
                })
            }
        } catch (error) {
            console.error('Error loading troski stops:', error)
        }
    }

    // Find the best boarding point on a journey
    interface BoardingPoint {
        type: 'origin' | 'stop'
        name: string
        lat: number
        lng: number
        distance: number
        stopIndex?: number
        fareSaved?: number
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

        points.sort((a, b) => a.distance - b.distance)
        return points[0]
    }

    // Handle journey selection with smart boarding point detection
    const handleJourneySelect = async (journey: JourneyResult) => {
        setSearchOpen(false)

        if (!userLocation) {
            proceedWithJourney(journey, null)
            return
        }

        const { toast } = await import('sonner')
        const toastId = toast.loading('Finding best route...', {
            description: 'Checking nearby boarding points'
        })

        const bestPoint = findBestBoardingPoint(journey)

        if (!bestPoint) {
            toast.dismiss(toastId)
            proceedWithJourney(journey, null)
            return
        }

        if (bestPoint.distance <= 500) {
            toast.dismiss(toastId)

            if (bestPoint.type === 'origin') {
                toast.success('You\'re near the start!', {
                    description: `Board at ${bestPoint.name}`,
                    duration: 3000
                })
                proceedWithJourney(journey, bestPoint)
            } else {
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
            toast.dismiss(toastId)
            setDistanceWarning({
                show: true,
                distance: bestPoint.distance,
                originName: bestPoint.name,
                journey
            })
        }
    }

    // Proceed with journey
    const proceedWithJourney = (journey: JourneyResult, boardingPoint: BoardingPoint | null) => {
        setDistanceWarning({ show: false, distance: 0, originName: '', journey: null })

        let adjustedJourney = journey
        if (boardingPoint && boardingPoint.type === 'stop' && boardingPoint.stopIndex !== undefined) {
            const remainingStops = journey.stops.slice(boardingPoint.stopIndex + 1)

            adjustedJourney = {
                ...journey,
                route: {
                    ...journey.route,
                    origin_name: boardingPoint.name,
                    origin_latitude: boardingPoint.lat,
                    origin_longitude: boardingPoint.lng,
                    total_fare: journey.route.total_fare
                        ? Math.max(0, Number(journey.route.total_fare) - (boardingPoint.fareSaved || 0))
                        : undefined
                },
                stops: remainingStops,
            } as JourneyResult
        }

        setSelectedJourney(adjustedJourney)

        if (map && adjustedJourney.route) {
            const bounds = new google.maps.LatLngBounds()

            if (userLocation) {
                bounds.extend({ lat: userLocation[1], lng: userLocation[0] })
            }

            bounds.extend({ lat: adjustedJourney.route.origin_latitude, lng: adjustedJourney.route.origin_longitude })
            bounds.extend({ lat: adjustedJourney.route.destination_latitude, lng: adjustedJourney.route.destination_longitude })

            adjustedJourney.stops.forEach((stop) => {
                bounds.extend({ lat: stop.stop_latitude, lng: stop.stop_longitude })
            })

            map.fitBounds(bounds, { top: 80, bottom: 300, left: 80, right: 80 })

            drawJourneyOnMap(adjustedJourney)
        }
    }

    // Draw journey route on map using Google Directions API
    const drawJourneyOnMap = async (journey: JourneyResult) => {
        if (!map || !directionsServiceRef.current) return

        // Clear existing journey elements
        journeyPolylinesRef.current.forEach((polyline) => polyline.setMap(null))
        journeyPolylinesRef.current = []
        journeyMarkersRef.current.forEach((marker) => marker.setMap(null))
        journeyMarkersRef.current = []

        // Build waypoints
        const waypoints = journey.stops.map((stop) => ({
            location: { lat: stop.stop_latitude, lng: stop.stop_longitude },
            stopover: true,
        }))

        try {
            // Draw walking route to origin if user is not there
            if (userLocation) {
                const distanceToOrigin = calculateDistance(
                    userLocation[1],
                    userLocation[0],
                    journey.route.origin_latitude,
                    journey.route.origin_longitude
                )

                if (distanceToOrigin > 50) {
                    const walkRequest: google.maps.DirectionsRequest = {
                        origin: { lat: userLocation[1], lng: userLocation[0] },
                        destination: { lat: journey.route.origin_latitude, lng: journey.route.origin_longitude },
                        travelMode: google.maps.TravelMode.WALKING,
                    }

                    directionsServiceRef.current.route(walkRequest, (result, status) => {
                        if (status === google.maps.DirectionsStatus.OK && result) {
                            const path = result.routes[0].overview_path
                            const walkPolyline = new google.maps.Polyline({
                                path,
                                strokeColor: '#3b82f6',
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                map,
                            })
                            // Make it dashed using icons
                            walkPolyline.setOptions({
                                icons: [{
                                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                                    offset: '0',
                                    repeat: '15px'
                                }],
                                strokeOpacity: 0
                            })
                            journeyPolylinesRef.current.push(walkPolyline)
                        }
                    })
                }
            }

            // Request driving directions for the troski route
            const request: google.maps.DirectionsRequest = {
                origin: { lat: journey.route.origin_latitude, lng: journey.route.origin_longitude },
                destination: { lat: journey.route.destination_latitude, lng: journey.route.destination_longitude },
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
            }

            directionsServiceRef.current.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    const path = result.routes[0].overview_path

                    // Casing (outline)
                    const casingPolyline = new google.maps.Polyline({
                        path,
                        strokeColor: '#064e3b',
                        strokeOpacity: 1,
                        strokeWeight: 8,
                        map,
                        zIndex: 1,
                    })
                    journeyPolylinesRef.current.push(casingPolyline)

                    // Main line
                    const mainPolyline = new google.maps.Polyline({
                        path,
                        strokeColor: '#10b981',
                        strokeOpacity: 1,
                        strokeWeight: 5,
                        map,
                        zIndex: 2,
                    })
                    journeyPolylinesRef.current.push(mainPolyline)
                } else {
                    // Fallback to straight lines
                    const coordinates: google.maps.LatLngLiteral[] = [
                        { lat: journey.route.origin_latitude, lng: journey.route.origin_longitude },
                        ...journey.stops.map((stop) => ({ lat: stop.stop_latitude, lng: stop.stop_longitude })),
                        { lat: journey.route.destination_latitude, lng: journey.route.destination_longitude },
                    ]

                    const polyline = new google.maps.Polyline({
                        path: coordinates,
                        strokeColor: '#10b981',
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map,
                    })
                    journeyPolylinesRef.current.push(polyline)
                }
            })
        } catch (error) {
            console.error('Error drawing journey:', error)
        }

        // Add markers
        addJourneyMarkers(journey)
    }

    // Add markers for journey stops
    const addJourneyMarkers = (journey: JourneyResult) => {
        if (!map) return

        // Origin marker
        const originMarker = new google.maps.Marker({
            position: { lat: journey.route.origin_latitude, lng: journey.route.origin_longitude },
            map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="2"/>
                        <text x="16" y="21" font-size="16" text-anchor="middle" fill="white">📍</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
            },
            zIndex: 10,
        })

        const originInfo = new google.maps.InfoWindow({
            content: `
                <div style="padding: 8px;">
                    <h3 style="font-weight: 600; font-size: 14px;">${journey.route.origin_name}</h3>
                    <p style="font-size: 12px; color: #3b82f6;">Start here</p>
                    ${journey.route.total_fare ? `<p style="font-size: 12px; font-weight: 600; color: #10b981; margin-top: 4px;">Fare: GH₵${journey.route.total_fare}</p>` : ''}
                </div>
            `,
        })
        originMarker.addListener('click', () => originInfo.open(map, originMarker))
        journeyMarkersRef.current.push(originMarker)

        // Stop markers
        journey.stops.forEach((stop, index) => {
            const bgColor = stop.stop_type === 'board' ? '#3b82f6' : stop.stop_type === 'alight' ? '#f97316' : '#8b5cf6'

            const marker = new google.maps.Marker({
                position: { lat: stop.stop_latitude, lng: stop.stop_longitude },
                map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="${bgColor}" stroke="white" stroke-width="2"/>
                            <text x="12" y="16" font-size="12" text-anchor="middle" fill="white" font-weight="bold">${index + 1}</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12),
                },
                zIndex: 10,
            })

            const info = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px;">
                        <h3 style="font-weight: 600; font-size: 14px;">${stop.stop_name}</h3>
                        <p style="font-size: 12px; color: #666; text-transform: capitalize;">${stop.stop_type}</p>
                        ${stop.troski_description ? `<p style="font-size: 12px; margin-top: 4px;">${stop.troski_description}</p>` : ''}
                    </div>
                `,
            })
            marker.addListener('click', () => info.open(map, marker))
            journeyMarkersRef.current.push(marker)
        })

        // Destination marker
        const destMarker = new google.maps.Marker({
            position: { lat: journey.route.destination_latitude, lng: journey.route.destination_longitude },
            map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#f97316" stroke="white" stroke-width="2"/>
                        <text x="16" y="21" font-size="16" text-anchor="middle" fill="white">🎯</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
            },
            zIndex: 10,
        })

        const destInfo = new google.maps.InfoWindow({
            content: `
                <div style="padding: 8px;">
                    <h3 style="font-weight: 600; font-size: 14px;">${journey.route.destination_name}</h3>
                    <p style="font-size: 12px; color: #f97316;">Destination</p>
                </div>
            `,
        })
        destMarker.addListener('click', () => destInfo.open(map, destMarker))
        journeyMarkersRef.current.push(destMarker)
    }

    // Cancel distance warning
    const cancelDistanceWarning = () => {
        setDistanceWarning({ show: false, distance: 0, originName: '', journey: null })
    }

    // Close the journey view
    const closeJourneyView = () => {
        setSelectedJourney(null)
    }

    // Clear journey from map completely
    const clearJourney = () => {
        setSelectedJourney(null)
        setDestinationQuery('')

        journeyPolylinesRef.current.forEach((polyline) => polyline.setMap(null))
        journeyPolylinesRef.current = []
        journeyMarkersRef.current.forEach((marker) => marker.setMap(null))
        journeyMarkersRef.current = []

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

    // Handle load error
    if (loadError) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
                <div className="text-destructive p-4 text-center">
                    <div className="text-lg mb-2">Failed to load Google Maps</div>
                    <div className="text-sm">{loadError.message}</div>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative h-full w-full bg-background overflow-hidden ${className}`}>
            {/* Map container */}
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={defaultCenter}
                    zoom={zoom}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onCenterChanged={handleCenterChanged}
                    onZoomChanged={handleZoomChanged}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        styles: resolvedTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
                        gestureHandling: 'greedy',
                    }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
                    <div className="text-foreground text-sm">Loading Troski Map...</div>
                </div>
            )}

            {/* Loading indicator */}
            {isLoaded && !mapLoaded && !mapError && (
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

            {/* Top controls */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="shadow-md"
                        onClick={onExitTroskiMode}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                    </Button>
                    <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/20 self-start">
                        BETA
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-lg pointer-events-auto">
                    <Bus className="h-4 w-4" />
                    Troski Mode
                    {isTracking && (
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                </div>

                <button
                    onClick={centerOnUser}
                    className="bg-card rounded-full p-3 shadow-md hover:shadow-lg transition-shadow border border-border pointer-events-auto"
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
