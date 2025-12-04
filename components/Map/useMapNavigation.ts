import { useState, useRef, useCallback, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { NavigationState, RouteInfo, NavigationStep } from '@/types/navigation'
import {
  calculateRoutes,
  createUserLocationMarker,
  createDestinationMarker,
  getBoundsForRoutes,
} from '@/utils/mapbox'

export function useMapNavigation(map: React.RefObject<mapboxgl.Map | null>) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const userLocationRef = useRef<[number, number] | null>(null)
  const userMarker = useRef<mapboxgl.Marker | null>(null)
  const destinationMarker = useRef<mapboxgl.Marker | null>(null)
  const destinationPopup = useRef<mapboxgl.Popup | null>(null)

  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>('idle')
  const [destinationPlace, setDestinationPlace] = useState<any>(null)
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null)

  // Routes
  const [routes, setRoutes] = useState<RouteInfo[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(1)
  const routeLayers = useRef<string[]>([])

  // Active navigation
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([])
  const [remainingDuration, setRemainingDuration] = useState(0)
  const [remainingDistance, setRemainingDistance] = useState(0)
  const [showRecenter, setShowRecenter] = useState(false)
  const [isFollowingUser, setIsFollowingUser] = useState(true)
  const watchPositionId = useRef<number | null>(null)
  const previousLocation = useRef<[number, number] | null>(null)
  const currentBearing = useRef<number>(0)

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

          // Fly to user location
          map.current?.flyTo({
            center: userCoords,
            zoom: 14,
            essential: true,
          })

          // Update user marker
          if (userMarker.current) {
            userMarker.current.setLngLat(userCoords)
          } else if (map.current) {
            const el = createUserLocationMarker()
            userMarker.current = new mapboxgl.Marker(el).setLngLat(userCoords).addTo(map.current)
          }

          resolve(userCoords)
        },
        (error) => {
          console.error('Unable to retrieve location:', error)
          let errorMessage = 'Unable to get your location. '

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage +=
                'Please enable location access for this website in your browser settings.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage +=
                'Location information is unavailable. Please check your device settings.'
              break
            case error.TIMEOUT:
              errorMessage += 'Location request timed out. Please try again.'
              break
            default:
              errorMessage += 'Please check your location settings and try again.'
          }

          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout for mobile
          maximumAge: 0,
        }
      )
    })
  }, [])

  // Handle destination selection
  const handleSelectDestination = useCallback(
    (place: any) => {
      console.log('handleSelectDestination called with:', place)
      const coords: [number, number] = place.center
      console.log('Extracted coords:', coords)
      setDestinationPlace(place)
      setDestinationCoords(coords)

      // Remove existing popup
      if (destinationPopup.current) {
        destinationPopup.current.remove()
        destinationPopup.current = null
      }

      // Create popup with "Go there" button
      const popupHTML = `
        <div style="padding: 15px; min-width: 180px; text-align: center; color: hsl(var(--foreground));">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">${place.text}</div>
          <button
            onclick="window.goToDestination()"
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
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#514ADB'"
            onmouseout="this.style.background='#635CFF'"
          >
            Go there
          </button>
        </div>
      `

      // Store the callback globally for the button
      ;(window as any).goToDestination = () => {
        handleCalculateRoutes(coords)
      }

      destinationPopup.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'incident-popup',
        maxWidth: '300px',
        anchor: 'bottom',
        offset: 15,
      })
        .setLngLat(coords)
        .setHTML(popupHTML)

      // Add or update destination marker
      if (destinationMarker.current) {
        destinationMarker.current.setLngLat(coords)
        destinationMarker.current.setPopup(destinationPopup.current)
      } else if (map.current) {
        const el = createDestinationMarker()
        destinationMarker.current = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(destinationPopup.current)
          .addTo(map.current)
      }

      // Show popup and fly to destination
      if (map.current) {
        destinationPopup.current.addTo(map.current)
        map.current.flyTo({
          center: coords,
          zoom: 15,
          essential: true,
        })
      }
    },
    [map]
  )

  // Calculate routes
  const handleCalculateRoutes = useCallback(
    async (coords?: [number, number]) => {
      console.log('Calculating routes...')
      let currentUserLocation = userLocationRef.current
      console.log('userLocation from ref:', currentUserLocation)
      console.log('destinationCoords state:', destinationCoords)

      const destination = coords || destinationCoords
      console.log('destination:', destination)

      if (!destination) {
        alert('Please select a destination first.')
        return
      }

      // If user location is not available, request it
      if (!currentUserLocation) {
        console.log('User location not available, requesting...')

        try {
          // Show loading state
          setNavigationState('searching')

          // Request user location
          currentUserLocation = await getUserLocation()
          console.log('User location obtained:', currentUserLocation)
        } catch (error) {
          console.error('Failed to get user location:', error)
          setNavigationState('idle')

          // Show user-friendly error message
          if (error instanceof Error) {
            alert(error.message)
          } else {
            alert('Unable to access your location. Please enable location services and try again.')
          }
          return
        }
      }

      setNavigationState('searching')

      // Close popup
      if (destinationPopup.current) {
        destinationPopup.current.remove()
      }

      // Import toast for notifications
      const { toast } = await import('sonner')

      // Show loading toast
      const toastId = toast.loading('Calculating routes...', {
        description: 'Finding the safest path for you',
      })

      // Update toast with progress
      const onProgress = (message: string) => {
        toast.loading(message, {
          id: toastId,
          description: 'Please wait...',
        })
      }

      const calculatedRoutes = await calculateRoutes(currentUserLocation, destination, onProgress)

      if (calculatedRoutes.length > 0) {
        // Update toast based on results
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

  // Display routes on map
  const displayRoutes = useCallback(
    (routesToDisplay: RouteInfo[], selectedIndex: number) => {
      if (!map.current) return

      // Clear existing route layers (remove layers before sources)
      // First remove all layers
      routeLayers.current.forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId)
        }
      })

      // Then remove sources (only for base route IDs, not border layers)
      routeLayers.current.forEach((layerId) => {
        // Only remove source if it's not a border layer
        if (!layerId.endsWith('-border') && map.current?.getSource(layerId)) {
          map.current.removeSource(layerId)
        }
      })
      routeLayers.current = []

      // Add each route to the map
      routesToDisplay.forEach((route, index) => {
        const routeId = `route-${Date.now()}-${index}`
        routeLayers.current.push(routeId)

        const isSelected = index === selectedIndex

        // Color based on lighting percentage with gradient expression
        let lineColor: any = '#9CA3AF' // Default gray

        // Apply lighting-based colors to ALL routes, not just selected
        if (route.lightingPercentage !== undefined) {
          // Use a gradient expression for smooth color transitions
          // This creates a visual effect where the route changes color based on lighting
          const lightingPercent = route.lightingPercentage

          if (lightingPercent >= 99) {
            lineColor = '#FCD34D' // Bright yellow for excellent lighting
          } else if (lightingPercent >= 95) {
            lineColor = '#FDE047' // Light yellow for very good lighting
          } else if (lightingPercent >= 80) {
            lineColor = '#FB923C' // Orange for good lighting
          } else if (lightingPercent >= 45) {
            lineColor = '#F97316' // Dark orange for moderate lighting
          } else if (lightingPercent >= 30) {
            lineColor = '#EA580C' // Deep orange for poor lighting
          } else if (lightingPercent >= 15) {
            lineColor = '#DC2626' // Red for very poor lighting
          } else {
            lineColor = '#991B1B' // Dark red for minimal/no lighting
          }
        } else if (isSelected) {
          // Only use purple for selected route without lighting data
          lineColor = '#635CFF' // Default purple when no lighting data
        }

        map.current!.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          },
        })

        map.current!.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': lineColor,
            'line-width': isSelected ? 6 : 3,
            'line-opacity': isSelected ? 0.9 : 0.5,
            // Add a slight glow effect for selected routes
            'line-blur': isSelected ? 1 : 0,
          },
        })

        // Add a border layer for better visibility when selected
        if (isSelected) {
          const borderLayerId = `${routeId}-border`
          routeLayers.current.push(borderLayerId)

          map.current!.addLayer(
            {
              id: borderLayerId,
              type: 'line',
              source: routeId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': 8,
                'line-opacity': 0.3,
                'line-blur': 2,
              },
            },
            routeId
          ) // Place border below the main route
        }
      })

      // Fit map to show all routes
      const bounds = getBoundsForRoutes(routesToDisplay)
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 300, left: 50, right: 50 },
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
    // Clear routes from map
    if (map.current) {
      routeLayers.current.forEach((layerId) => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId)
        }
        if (map.current?.getSource(layerId)) {
          map.current.removeSource(layerId)
        }
      })
      routeLayers.current = []
    }

    setNavigationState('idle')
    setRoutes([])

    // Re-center on destination if available
    if (destinationCoords && map.current) {
      map.current.flyTo({
        center: destinationCoords,
        zoom: 14,
        duration: 800,
      })
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
    setIsFollowingUser(true)
    setShowRecenter(false)
    setNavigationState('navigating')

    // Reset bearing tracking
    previousLocation.current = null
    currentBearing.current = 0

    // Focus on user location with 3D view
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 18,
        pitch: 45,
        bearing: 0,
        essential: true,
      })
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

    // Clear all route layers
    routeLayers.current.forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId)
      }
      if (map.current?.getSource(layerId)) {
        map.current.removeSource(layerId)
      }
    })
    routeLayers.current = []

    // Remove destination marker
    if (destinationMarker.current) {
      destinationMarker.current.remove()
      destinationMarker.current = null
    }

    // Reset map view
    if (map.current) {
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        zoom: 14,
      })
    }
  }, [map])

  // Recenter map
  const handleRecenter = useCallback(() => {
    if (userLocation && map.current) {
      setIsFollowingUser(true)
      setShowRecenter(false)

      // Reset to navigation view with proper bearing
      map.current.flyTo({
        center: userLocation,
        zoom: 18,
        pitch: 45,
        bearing: currentBearing.current,
        essential: true,
      })
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

          if (userMarker.current) {
            userMarker.current.setLngLat(newCoords)
          }

          // Step progression logic
          if (navigationSteps.length > 0 && currentStepIndex < navigationSteps.length) {
            const currentStep = navigationSteps[currentStepIndex]

            // Get the end point of current step
            // Steps have a maneuver.location property which is the coordinate of the turn
            const stepEndPoint = currentStep.maneuver?.location

            if (stepEndPoint) {
              // Calculate distance to current step's end point
              const distanceToStepEnd = calculateDistance(
                newCoords,
                stepEndPoint as [number, number]
              )

              // If we're within 15 meters of the step endpoint, advance to next step
              if (distanceToStepEnd < 15) {
                const nextIndex = currentStepIndex + 1

                if (nextIndex < navigationSteps.length) {
                  setCurrentStepIndex(nextIndex)

                  // Update remaining distance and duration
                  let newRemainingDistance = 0
                  let newRemainingDuration = 0

                  for (let i = nextIndex; i < navigationSteps.length; i++) {
                    newRemainingDistance += navigationSteps[i].distance || 0
                    newRemainingDuration += navigationSteps[i].duration || 0
                  }

                  setRemainingDistance(newRemainingDistance)
                  setRemainingDuration(newRemainingDuration)

                  // Announce the new instruction (optional)
                  console.log('Next instruction:', navigationSteps[nextIndex].maneuver?.instruction)
                } else {
                  // We've reached the destination
                  console.log('Arrived at destination!')
                  // You might want to trigger an arrival state here
                }
              } else {
                // Update the current step's remaining distance
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

          // Calculate bearing based on movement (only if we have a previous location)
          if (previousLocation.current) {
            const distance = Math.sqrt(
              Math.pow(newCoords[0] - previousLocation.current[0], 2) +
                Math.pow(newCoords[1] - previousLocation.current[1], 2)
            )

            // Only update bearing if we've moved a significant distance (to filter out GPS jitter)
            if (distance > 0.00001) {
              // Approximately 1 meter
              const newBearing = calculateBearing(previousLocation.current, newCoords)
              currentBearing.current = newBearing
            }
          }

          // Update previous location for next calculation
          previousLocation.current = newCoords

          if (isFollowingUser && map.current) {
            map.current.easeTo({
              center: newCoords,
              bearing: currentBearing.current,
              zoom: 18,
              pitch: 45,
              duration: 1000,
            })
          }
        },
        (error) => console.error('Error tracking position:', error),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
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
