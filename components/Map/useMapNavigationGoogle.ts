import { useState, useRef, useCallback, useEffect } from 'react'
import { NavigationState, RouteInfo, NavigationStep } from '@/types/navigation'
import {
    calculateRoutes,
    createUserLocationMarkerElement,
    createDestinationMarkerElement,
    getBoundsForRoutes,
} from '@/utils/googlemaps'

export function useMapNavigationGoogle(map: google.maps.Map | null) {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const userLocationRef = useRef<[number, number] | null>(null)
    const userMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const destinationMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const infoWindow = useRef<google.maps.InfoWindow | null>(null)
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

    // Route polylines for custom rendering
    const routePolylines = useRef<google.maps.Polyline[]>([])

    // Navigation state
    const [navigationState, setNavigationState] = useState<NavigationState>('idle')
    const [destinationPlace, setDestinationPlace] = useState<any>(null)
    const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null)

    // Routes
    const [routes, setRoutes] = useState<RouteInfo[]>([])
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(1)

    // Active navigation
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([])
    const [remainingDuration, setRemainingDuration] = useState(0)
    const [remainingDistance, setRemainingDistance] = useState(0)
    const [totalDistance, setTotalDistance] = useState(0)
    const [showRecenter, setShowRecenter] = useState(false)
    const [isFollowingUser, setIsFollowingUser] = useState(true)
    const watchPositionId = useRef<number | null>(null)
    const idleWatchPositionId = useRef<number | null>(null)
    const previousLocation = useRef<[number, number] | null>(null)
    const currentBearing = useRef<number>(0)

    // Initialize DirectionsService when map is ready
    useEffect(() => {
        if (map && !directionsServiceRef.current) {
            directionsServiceRef.current = new google.maps.DirectionsService()
        }
    }, [map])

    // Calculate bearing between two points
    const calculateBearing = useCallback((start: [number, number], end: [number, number]): number => {
        const dLng = end[0] - start[0]
        const y = Math.sin(dLng) * Math.cos(end[1])
        const x =
            Math.cos(start[1]) * Math.sin(end[1]) - Math.sin(start[1]) * Math.cos(end[1]) * Math.cos(dLng)
        const bearing = (Math.atan2(y, x) * 180) / Math.PI
        return (bearing + 360) % 360
    }, [])

    // Calculate distance between two coordinates in meters
    const calculateDistance = useCallback(
        (coord1: [number, number], coord2: [number, number]): number => {
            const R = 6371e3 // Earth's radius in meters
            const φ1 = (coord1[1] * Math.PI) / 180
            const φ2 = (coord2[1] * Math.PI) / 180
            const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180
            const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180

            const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

            return R * c
        },
        []
    )

    // Create or update user location marker
    const updateUserMarker = useCallback((coords: [number, number]) => {
        if (!map) return

        const position = { lat: coords[1], lng: coords[0] }

        if (userMarker.current) {
            userMarker.current.position = position
        } else {
            // Create a simple marker using regular Marker for now
            const markerElement = createUserLocationMarkerElement()

            // Use AdvancedMarkerElement if available, fallback to regular marker
            if (google.maps.marker?.AdvancedMarkerElement) {
                userMarker.current = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position,
                    content: markerElement,
                })
            } else {
                // Fallback: use a simple circle marker
                const marker = new google.maps.Marker({
                    map,
                    position,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                    },
                }) as any
                userMarker.current = marker
            }
        }
    }, [map])

    // Always-on location tracking (runs even when not navigating)
    useEffect(() => {
        if (!map || !navigator.geolocation) return

        // Start continuous location tracking immediately
        console.log('Starting continuous location tracking...')

        idleWatchPositionId.current = navigator.geolocation.watchPosition(
            (position) => {
                const newCoords: [number, number] = [position.coords.longitude, position.coords.latitude]

                // Only update if not in active navigation (navigation has its own watcher)
                if (navigationState !== 'navigating') {
                    setUserLocation(newCoords)
                    userLocationRef.current = newCoords
                    updateUserMarker(newCoords)
                }
            },
            (error) => {
                console.error('Continuous location tracking error:', error)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000, // Allow cached position up to 1 second old for smoother updates
            }
        )

        return () => {
            if (idleWatchPositionId.current !== null) {
                navigator.geolocation.clearWatch(idleWatchPositionId.current)
                idleWatchPositionId.current = null
                console.log('Stopped continuous location tracking')
            }
        }
    }, [map, navigationState, updateUserMarker])

    // Get user location with promise support
    const getUserLocation = useCallback(() => {
        return new Promise<[number, number]>((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation is not supported')
                reject(new Error('Geolocation is not supported by your browser'))
                return
            }

            console.log('Requesting user location...')
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords: [number, number] = [position.coords.longitude, position.coords.latitude]
                    console.log('User location obtained:', userCoords)

                    setUserLocation(userCoords)
                    userLocationRef.current = userCoords

                    // Pan to user location
                    if (map) {
                        map.panTo({ lat: userCoords[1], lng: userCoords[0] })
                        map.setZoom(14)
                    }

                    // Update user marker
                    updateUserMarker(userCoords)

                    resolve(userCoords)
                },
                (error) => {
                    // Log more detailed error info (GeolocationPositionError doesn't serialize well)
                    console.warn('Location error - Code:', error.code, 'Message:', error.message)

                    let errorMessage = 'Unable to get your location. '

                    switch (error.code) {
                        case 1: // PERMISSION_DENIED
                            errorMessage +=
                                'Please enable location access for this website in your browser settings.'
                            break
                        case 2: // POSITION_UNAVAILABLE
                            errorMessage +=
                                'Location information is unavailable. Please check your device settings.'
                            break
                        case 3: // TIMEOUT
                            errorMessage += 'Location request timed out. Please try again.'
                            break
                        default:
                            errorMessage += 'Please check your location settings and try again.'
                    }

                    reject(new Error(errorMessage))
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000, // Increase timeout to 15 seconds
                    maximumAge: 60000, // Allow cached position up to 1 minute old
                }
            )
        })
    }, [map, updateUserMarker])

    // Handle destination selection
    const handleSelectDestination = useCallback(
        (place: any) => {
            console.log('handleSelectDestination called with:', place)
            const coords: [number, number] = place.center
            console.log('Extracted coords:', coords)
            setDestinationPlace(place)
            setDestinationCoords(coords)

            if (!map) return

            // Close existing info window
            if (infoWindow.current) {
                infoWindow.current.close()
            }

            // Create info window with "Go there" button
            infoWindow.current = new google.maps.InfoWindow({
                content: `
          <div style="padding: 15px; min-width: 180px; text-align: center;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">${place.text}</div>
            <button
              id="go-there-btn"
              style="
                background: #635CFF;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
                width: 100%;
              "
            >
              Go there
            </button>
          </div>
        `,
            })

            const position = { lat: coords[1], lng: coords[0] }

            // Create or update destination marker
            if (destinationMarker.current) {
                destinationMarker.current.position = position
            } else {
                if (google.maps.marker?.AdvancedMarkerElement) {
                    const markerElement = createDestinationMarkerElement()
                    destinationMarker.current = new google.maps.marker.AdvancedMarkerElement({
                        map,
                        position,
                        content: markerElement,
                    })
                } else {
                    const marker = new google.maps.Marker({
                        map,
                        position,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#EF4444',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                        },
                    }) as any
                    destinationMarker.current = marker
                }
            }

            // Open info window
            infoWindow.current.open(map, destinationMarker.current as any)

            // Add click listener for "Go there" button
            google.maps.event.addListenerOnce(infoWindow.current, 'domready', () => {
                const btn = document.getElementById('go-there-btn')
                if (btn) {
                    btn.onclick = () => {
                        handleCalculateRoutes(coords)
                    }
                }
            })

            // Pan to destination
            map.panTo(position)
            map.setZoom(15)
        },
        [map]
    )

    // Calculate routes
    const handleCalculateRoutes = useCallback(
        async (coords?: [number, number]) => {
            console.log('Calculating routes...')
            let currentUserLocation = userLocationRef.current

            const destination = coords || destinationCoords

            if (!destination) {
                alert('Please select a destination first.')
                return
            }

            if (!directionsServiceRef.current) {
                directionsServiceRef.current = new google.maps.DirectionsService()
            }

            // If user location is not available, request it
            if (!currentUserLocation) {
                console.log('User location not available, requesting...')

                try {
                    setNavigationState('searching')
                    currentUserLocation = await getUserLocation()
                } catch (error) {
                    console.error('Failed to get user location:', error)
                    setNavigationState('idle')

                    if (error instanceof Error) {
                        alert(error.message)
                    } else {
                        alert('Unable to access your location. Please enable location services and try again.')
                    }
                    return
                }
            }

            setNavigationState('searching')

            // Close info window
            if (infoWindow.current) {
                infoWindow.current.close()
            }

            const { toast } = await import('sonner')

            const toastId = toast.loading('Calculating routes...', {
                description: 'Finding the safest path for you',
            })

            const onProgress = (message: string) => {
                toast.loading(message, {
                    id: toastId,
                    description: 'Please wait...',
                })
            }

            const calculatedRoutes = await calculateRoutes(
                currentUserLocation,
                destination,
                directionsServiceRef.current,
                onProgress
            )

            if (calculatedRoutes.length > 0) {
                if (calculatedRoutes.length > 1) {
                    toast.success('Routes calculated!', {
                        id: toastId,
                        description: `Found route options`,
                    })
                } else {
                    toast.success('Route calculated!', {
                        id: toastId,
                        description: 'Found the fastest & safest route for you',
                    })
                }

                setRoutes(calculatedRoutes)
                setSelectedRouteIndex(calculatedRoutes.length > 1 ? 1 : 0)
                displayRoutes(calculatedRoutes, calculatedRoutes.length > 1 ? 1 : 0)
                setNavigationState('route-selection')
            } else {
                console.error('No routes found')
                toast.error('No route found', {
                    id: toastId,
                    description: 'Please try a different destination',
                })
                setNavigationState('idle')
            }
        },
        [destinationCoords, getUserLocation]
    )

    // Display routes on map using Polylines
    const displayRoutes = useCallback(
        (routesToDisplay: RouteInfo[], selectedIndex: number) => {
            if (!map) return

            // Clear existing polylines
            routePolylines.current.forEach((polyline) => polyline.setMap(null))
            routePolylines.current = []

            // Add each route as a polyline
            routesToDisplay.forEach((route, index) => {
                const isSelected = index === selectedIndex

                // Convert GeoJSON coordinates to Google Maps path
                const path = route.geometry?.coordinates?.map((coord: [number, number]) => ({
                    lat: coord[1],
                    lng: coord[0],
                })) || []

                // Determine color based on lighting
                let strokeColor = '#9CA3AF' // Default gray

                if (route.lightingPercentage !== undefined) {
                    const lightingPercent = route.lightingPercentage

                    if (lightingPercent >= 99) {
                        strokeColor = '#FCD34D'
                    } else if (lightingPercent >= 95) {
                        strokeColor = '#FDE047'
                    } else if (lightingPercent >= 80) {
                        strokeColor = '#FB923C'
                    } else if (lightingPercent >= 45) {
                        strokeColor = '#F97316'
                    } else if (lightingPercent >= 30) {
                        strokeColor = '#EA580C'
                    } else if (lightingPercent >= 15) {
                        strokeColor = '#DC2626'
                    } else {
                        strokeColor = '#991B1B'
                    }
                } else if (isSelected) {
                    strokeColor = '#635CFF'
                }

                // Create border polyline for selected route
                if (isSelected) {
                    const borderPolyline = new google.maps.Polyline({
                        path,
                        strokeColor: '#ffffff',
                        strokeOpacity: 0.3,
                        strokeWeight: 10,
                        map,
                        zIndex: index,
                    })
                    routePolylines.current.push(borderPolyline)
                }

                // Create main polyline
                const polyline = new google.maps.Polyline({
                    path,
                    strokeColor,
                    strokeOpacity: isSelected ? 0.9 : 0.5,
                    strokeWeight: isSelected ? 6 : 3,
                    map,
                    zIndex: isSelected ? index + 100 : index,
                })
                routePolylines.current.push(polyline)
            })

            // Fit map to show all routes
            const bounds = getBoundsForRoutes(routesToDisplay)
            map.fitBounds(bounds, {
                top: 100,
                bottom: 300,
                left: 50,
                right: 50,
            })
        },
        [map]
    )

    // Handle route selection
    const handleSelectRoute = useCallback(
        (index: number) => {
            setSelectedRouteIndex(index)
            displayRoutes(routes, index)
        },
        [routes, displayRoutes]
    )

    // Go back to destination selection
    const handleBackToDestination = useCallback(() => {
        // Clear route polylines
        routePolylines.current.forEach((polyline) => polyline.setMap(null))
        routePolylines.current = []

        setNavigationState('idle')
        setRoutes([])

        // Re-center on destination if available
        if (destinationCoords && map) {
            map.panTo({ lat: destinationCoords[1], lng: destinationCoords[0] })
            map.setZoom(14)
        }
    }, [destinationCoords, map])

    // Start navigation
    const handleStartNavigation = useCallback(() => {
        const selectedRoute = routes[selectedRouteIndex]
        if (!selectedRoute) return

        setNavigationSteps(selectedRoute.steps || [])
        setCurrentStepIndex(0)
        setRemainingDuration(selectedRoute.duration)
        setRemainingDistance(selectedRoute.distance)
        setTotalDistance(selectedRoute.distance) // Store total distance for progress tracking
        setIsFollowingUser(true)
        setShowRecenter(false)
        setNavigationState('navigating')

        // Reset bearing tracking
        previousLocation.current = null
        currentBearing.current = 0

        // Focus on user location with 3D view
        if (userLocation && map) {
            map.panTo({ lat: userLocation[1], lng: userLocation[0] })
            map.setZoom(18)
            map.setTilt(45)
            map.setHeading(0)
        }
    }, [routes, selectedRouteIndex, userLocation, map])

    // Exit navigation
    const handleExitNavigation = useCallback(() => {
        setNavigationState('idle')
        setRoutes([])
        setNavigationSteps([])
        setCurrentStepIndex(0)
        setIsFollowingUser(true)
        setShowRecenter(false)

        // Clear destination
        setDestinationPlace(null)
        setDestinationCoords(null)

        // Clear route polylines
        routePolylines.current.forEach((polyline) => polyline.setMap(null))
        routePolylines.current = []

        // Remove destination marker
        if (destinationMarker.current) {
            if ('setMap' in destinationMarker.current) {
                (destinationMarker.current as any).setMap(null)
            } else if ('map' in destinationMarker.current) {
                destinationMarker.current.map = null
            }
            destinationMarker.current = null
        }

        // Reset map view
        if (map) {
            map.setTilt(0)
            map.setHeading(0)
            map.setZoom(14)
        }
    }, [map])

    // Recenter map
    const handleRecenter = useCallback(() => {
        if (userLocation && map) {
            setIsFollowingUser(true)
            setShowRecenter(false)

            map.panTo({ lat: userLocation[1], lng: userLocation[0] })
            map.setZoom(18)
            map.setTilt(45)
            map.setHeading(currentBearing.current)
        }
    }, [userLocation, map])

    // Track user location during navigation
    useEffect(() => {
        if (navigationState === 'navigating' && navigator.geolocation) {
            watchPositionId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const newCoords: [number, number] = [position.coords.longitude, position.coords.latitude]
                    setUserLocation(newCoords)
                    userLocationRef.current = newCoords

                    // Update user marker
                    updateUserMarker(newCoords)

                    // Step progression logic
                    if (navigationSteps.length > 0 && currentStepIndex < navigationSteps.length) {
                        const currentStep = navigationSteps[currentStepIndex]
                        const stepEndPoint = currentStep.maneuver?.location

                        if (stepEndPoint) {
                            const distanceToStepEnd = calculateDistance(
                                newCoords,
                                stepEndPoint as [number, number]
                            )

                            if (distanceToStepEnd < 15) {
                                const nextIndex = currentStepIndex + 1

                                if (nextIndex < navigationSteps.length) {
                                    setCurrentStepIndex(nextIndex)

                                    let newRemainingDistance = 0
                                    let newRemainingDuration = 0

                                    for (let i = nextIndex; i < navigationSteps.length; i++) {
                                        newRemainingDistance += navigationSteps[i].distance || 0
                                        newRemainingDuration += navigationSteps[i].duration || 0
                                    }

                                    setRemainingDistance(newRemainingDistance)
                                    setRemainingDuration(newRemainingDuration)
                                } else {
                                    console.log('Arrived at destination!')
                                }
                            } else {
                                const updatedDistance = Math.max(0, distanceToStepEnd)
                                const updatedSteps = [...navigationSteps]
                                updatedSteps[currentStepIndex] = {
                                    ...updatedSteps[currentStepIndex],
                                    distance: updatedDistance,
                                }
                                setNavigationSteps(updatedSteps)
                            }
                        }
                    }

                    // Calculate bearing
                    if (previousLocation.current) {
                        const distance = Math.sqrt(
                            Math.pow(newCoords[0] - previousLocation.current[0], 2) +
                            Math.pow(newCoords[1] - previousLocation.current[1], 2)
                        )

                        if (distance > 0.00001) {
                            const newBearing = calculateBearing(previousLocation.current, newCoords)
                            currentBearing.current = newBearing
                        }
                    }

                    previousLocation.current = newCoords

                    if (isFollowingUser && map) {
                        map.panTo({ lat: newCoords[1], lng: newCoords[0] })
                        map.setHeading(currentBearing.current)
                    }
                },
                (error) => {
                    // GeolocationPositionError doesn't serialize well, log code and message separately
                    console.warn('Position tracking error - Code:', error.code, 'Message:', error.message)
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 1000, // Allow 1 second old positions
                    timeout: 10000, // Increase timeout to 10 seconds
                }
            )

            return () => {
                if (watchPositionId.current) {
                    navigator.geolocation.clearWatch(watchPositionId.current)
                    watchPositionId.current = null
                }
            }
        }
    }, [
        navigationState,
        isFollowingUser,
        map,
        calculateBearing,
        calculateDistance,
        navigationSteps,
        currentStepIndex,
        updateUserMarker,
    ])

    return {
        // State
        userLocation,
        navigationState,
        destinationPlace,
        destinationCoords,
        routes,
        selectedRouteIndex,
        currentStepIndex,
        navigationSteps,
        remainingDuration,
        remainingDistance,
        totalDistance,
        showRecenter,
        isFollowingUser,
        setIsFollowingUser,
        setShowRecenter,
        // Handlers
        getUserLocation,
        handleSelectDestination,
        handleCalculateRoutes,
        handleSelectRoute,
        handleBackToDestination,
        handleStartNavigation,
        handleExitNavigation,
        handleRecenter,
    }
}
