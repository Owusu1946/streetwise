'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Bus, MessageCircleHeart, Navigation, Search, Building2, Layers } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AutoPopupModal } from './AutoPopupModal'
import { FeedbackModal } from './FeedbackModal'
import { InstallPWAButton } from './InstallPWAWrapper'
import SOSButton from './SOSButton'
import SOSDrawer from './SOSDrawer'
import { useIncidentMarkers } from './Map/IncidentMarkers'
import { usePoliceMarkers } from './Map/PoliceMarkers'
import { useMapNavigation } from './Map/useMapNavigation'
import NavigationMode from './NavigationMode'
import ReportDrawer from './ReportDrawer'
import RouteSelection from './RouteSelection'
import SearchDrawer from './SearchDrawer'
import { WeatherWidget } from './WeatherWidget'

interface MapProps {
  className?: string
  onEnterTroskiMode?: () => void
}

function MapComponent({ className = '', onEnterTroskiMode }: MapProps) {
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng, setLng] = useState<number>(-0.1870) // Default to Accra, Ghana
  const [lat, setLat] = useState<number>(5.6037)
  const [zoom, setZoom] = useState<number>(12)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  // Drawer states
  const [searchOpen, setSearchOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [autoPopupOpen, setAutoPopupOpen] = useState(false)
  const [sosOpen, setSOSOpen] = useState(false)

  // Community data toggle state
  const [showCommunityData, setShowCommunityData] = useState(true)

  // Track if user is dragging the map (to prevent click-to-navigate during drag)
  const isDragging = useRef(false)

  // 3D Mode state
  const [is3DMode, setIs3DMode] = useState(false)

  // Map View Mode state
  const [mapViewMode, setMapViewMode] = useState<'standard' | 'satellite'>('standard')

  // Auto-popup timer
  useEffect(() => {
    // Check if popup has been shown before
    const popupShown = localStorage.getItem('streetwise_popup_shown')

    if (!popupShown) {
      // Set a 20-second timer to show the popup
      const timer = setTimeout(() => {
        setAutoPopupOpen(true)
      }, 20000) // 20 seconds

      // Cleanup timer if component unmounts
      return () => clearTimeout(timer)
    }
  }, [])

  // Use navigation hook
  const {
    userLocation,
    navigationState,
    destinationPlace,
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
    getUserLocation,
    handleSelectDestination,
    handleSelectRoute,
    handleBackToDestination,
    handleStartNavigation,
    handleExitNavigation,
    handleRecenter,
  } = useMapNavigation(map)

  // Use incident markers hook
  useIncidentMarkers({ map: map.current, mapLoaded, showCommunityData })

  // Use police markers hook
  usePoliceMarkers({ map: map.current, mapLoaded })

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
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        antialias: true,
        fadeDuration: 0,
      })
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError(error instanceof Error ? error.message : 'Failed to initialize map')
      return
    }

    // Track map movement
    map.current.on('move', () => {
      if (!map.current) return
      setLng(parseFloat(map.current.getCenter().lng.toFixed(4)))
      setLat(parseFloat(map.current.getCenter().lat.toFixed(4)))
      setZoom(parseFloat(map.current.getZoom().toFixed(2)))
    })

    // Track user interaction will be handled in useEffect

    // Map loaded
    map.current.on('load', async () => {
      if (!map.current) return
      setMapLoaded(true)
      console.log('Map loaded successfully!')

      // Try to get user location when map loads
      try {
        await getUserLocation()
        console.log('User location successfully obtained on map load')
      } catch (error) {
        console.log('Could not get user location on initial load:', error)
        // Don't show an error on initial load, user can still use the app
        // Location will be requested when needed for navigation
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [getUserLocation])

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

  // Handle 3D Mode toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const mapInstance = map.current

    if (is3DMode) {
      // Enable 3D Mode
      mapInstance.easeTo({
        pitch: 60,
        bearing: -17.6,
        duration: 1000,
        easing: (t) => t,
      })

      if (!mapInstance.getLayer('3d-buildings')) {
        mapInstance.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': resolvedTheme === 'dark' ? '#333' : '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height'],
              ],
              'fill-extrusion-opacity': 0.6,
            },
          },
          // Insert behind labels if possible, otherwise just add it
          mapInstance.getStyle().layers?.find(
            (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
          )?.id
        )
      }
    } else {
      // Disable 3D Mode (return to 2D)
      mapInstance.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
        easing: (t) => t,
      })

      if (mapInstance.getLayer('3d-buildings')) {
        mapInstance.removeLayer('3d-buildings')
      }
    }
  }, [is3DMode, mapLoaded, resolvedTheme])

  // Handle click-to-navigate
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const onDragStart = () => {
      isDragging.current = true
    }

    const onDragEnd = () => {
      // Small delay to ensure click event doesn't fire immediately after drag
      setTimeout(() => {
        isDragging.current = false
      }, 200)
    }

    const onMapClick = async (e: mapboxgl.MapMouseEvent) => {
      // Only allow clicking when idle (not already navigating or selecting route)
      if (navigationState !== 'idle') return

      // Don't trigger if user was just dragging the map
      if (isDragging.current) return

      const { lng, lat } = e.lngLat

      // Show loading toast
      const { toast } = await import('sonner')
      const loadingToast = toast.loading('Getting location details...')

      try {
        // Use Mapbox reverse geocoding to get place name
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
        )

        if (!response.ok) {
          throw new Error('Failed to get location')
        }

        const data = await response.json()
        const feature = data.features?.[0]

        if (feature) {
          // Dismiss loading toast
          toast.dismiss(loadingToast)

          // Set this location as destination
          await handleSelectDestination({
            text: feature.text || 'Selected location',
            place_name: feature.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            center: [lng, lat],
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
          })

          toast.success('Destination set!', {
            description: feature.place_name || 'Tap-to-navigate location',
          })
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        console.error('Error getting location details:', error)
        toast.error('Could not get location details')
      }
    }

    // Add event listeners
    map.current.on('dragstart', onDragStart)
    map.current.on('dragend', onDragEnd)
    map.current.on('click', onMapClick)

    return () => {
      if (map.current) {
        map.current.off('dragstart', onDragStart)
        map.current.off('dragend', onDragEnd)
        map.current.off('click', onMapClick)
      }
    }
  }, [mapLoaded, navigationState, handleSelectDestination])

  // Handle map drag events during navigation
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const handleMapInteraction = () => {
      if (navigationState === 'navigating') {
        setIsFollowingUser(false)
        setShowRecenter(true)
      }
    }

    // Listen to multiple events that indicate user interaction
    map.current.on('dragstart', handleMapInteraction)
    map.current.on('rotatestart', handleMapInteraction)
    map.current.on('pitchstart', handleMapInteraction)
    map.current.on('zoomstart', handleMapInteraction)
    map.current.on('touchstart', handleMapInteraction)

    return () => {
      if (map.current) {
        map.current.off('dragstart', handleMapInteraction)
        map.current.off('rotatestart', handleMapInteraction)
        map.current.off('pitchstart', handleMapInteraction)
        map.current.off('zoomstart', handleMapInteraction)
        map.current.off('touchstart', handleMapInteraction)
      }
    }
  }, [navigationState, mapLoaded, setIsFollowingUser, setShowRecenter])

  // Handle SOS actions
  const handleNavigateToPolice = async () => {
    try {
      // Get user location if not available
      let locationToUse = userLocation
      if (!locationToUse) {
        locationToUse = await getUserLocation()
      }

      // Find nearest police station
      const response = await fetch(
        `/api/nearest-police?lat=${locationToUse[1]}&lng=${locationToUse[0]}`
      )

      if (!response.ok) {
        throw new Error('Failed to find police station')
      }

      const policeStation = await response.json()

      // If currently navigating, show confirmation
      if (navigationState === 'navigating') {
        const { toast } = await import('sonner')
        const confirmed = window.confirm(
          'This will end your current navigation and start new directions to the police station. Continue?'
        )
        if (!confirmed) return
      }

      // Start navigation to police station
      await handleSelectDestination({
        text: policeStation.name,
        place_name: policeStation.address,
        center: [policeStation.longitude, policeStation.latitude],
        geometry: {
          type: 'Point',
          coordinates: [policeStation.longitude, policeStation.latitude],
        },
      })

      const { toast } = await import('sonner')
      toast.success('Navigating to nearest police station', {
        description: policeStation.name,
      })
    } catch (error) {
      console.error('Error navigating to police:', error)
      const { toast } = await import('sonner')
      toast.error('Failed to find police station', {
        description: 'Please try again or call emergency services',
      })
    }
  }

  const handleFakeCall = () => {
    router.push('/fake-call')
  }

  // Handle report incident
  const handleReportIncident = async (type: string) => {
    let locationToUse = userLocation

    if (!locationToUse) {
      const { toast } = await import('sonner')

      // Try to get user location first
      try {
        locationToUse = await getUserLocation()
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message)
        } else {
          toast.error('Please enable location access to report an incident')
        }
        return
      }
    }

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          latitude: locationToUse[1],
          longitude: locationToUse[0],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save incident')
      }

      const { toast } = await import('sonner')
      toast.success('Incident reported successfully', {
        description: 'Thank you for keeping the community safe!',
      })

      setReportOpen(false)
    } catch (error) {
      console.error('Error reporting incident:', error)
      const { toast } = await import('sonner')
      toast.error('Failed to report incident', {
        description: 'Please try again later',
      })
    }
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
          <div className="text-foreground text-sm">Loading map...</div>
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

      {/* Navigation mode UI */}
      {navigationState === 'navigating' && (
        <>
          <NavigationMode
            currentStep={navigationSteps[currentStepIndex] || null}
            nextStep={navigationSteps[currentStepIndex + 1] || null}
            routeDuration={remainingDuration}
            routeDistance={remainingDistance}
            onExit={handleExitNavigation}
            onRecenter={handleRecenter}
            onReport={() => setReportOpen(true)}
            onSOS={() => setSOSOpen(true)}
            showRecenter={showRecenter}
          />
          {/*Community data toggle in navigation mode
          <div className="absolute top-40 right-4 z-10">
            <CommunityDataToggle
              showCommunityData={showCommunityData}
              onToggle={setShowCommunityData}
            />
          </div>*/}
        </>
      )}

      {/* Route selection UI */}
      {navigationState === 'route-selection' && routes.length > 0 && (
        <RouteSelection
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={handleSelectRoute}
          onStartNavigation={handleStartNavigation}
          onBack={handleBackToDestination}
        />
      )}

      {/* Default UI (when idle) */}
      {navigationState === 'idle' && (
        <>
          {/* Early Access and Install Buttons */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
            <ShimmerButton
              onClick={() => setFeedbackOpen(true)}
              //shimmerColor="#a855f7"
              //background="linear-gradient(135deg, #6366f1, #8b5cf6)"
              className="text-sm font-semibold"
            >
              <MessageCircleHeart className="mr-2 h-4 w-4" />
              Feedbacks
            </ShimmerButton>
            <InstallPWAButton />
          </div>

          {/* Weather Widget */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 hidden md:block">
            <WeatherWidget lat={lat} lng={lng} />
          </div>

          {/* Mobile Weather Widget (smaller/different position if needed) */}
          <div className="absolute top-20 left-6 z-10 md:hidden">
            <WeatherWidget lat={lat} lng={lng} />
          </div>

          {/* Community data toggle */}
          {/*<div className="absolute top-6 right-4 z-10">
            <CommunityDataToggle
              showCommunityData={showCommunityData}
              onToggle={setShowCommunityData}
            />
          </div>*/}

          {/* Floating location button */}
          <button
            onClick={getUserLocation}
            className="absolute top-6 right-4 z-10 bg-card rounded-full p-3 shadow-md hover:shadow-lg transition-shadow border border-border"
            aria-label="My location"
          >
            <Navigation className="h-5 w-5 text-foreground" />
          </button>

          {/* 3D Mode Toggle Button */}
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`absolute top-20 right-4 z-10 rounded-full p-3 shadow-md hover:shadow-lg transition-all border border-border ${is3DMode ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
              }`}
            aria-label="Toggle 3D Mode"
          >
            <Building2 className="h-5 w-5" />
          </button>

          {/* Map Style Toggle Button */}
          <button
            onClick={() => setMapViewMode(prev => prev === 'standard' ? 'satellite' : 'standard')}
            className={`absolute top-36 right-4 z-10 rounded-full p-3 shadow-md hover:shadow-lg transition-all border border-border ${mapViewMode === 'satellite' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
              }`}
            aria-label="Toggle Satellite View"
          >
            <Layers className="h-5 w-5" />
          </button>

          {/* Troski Mode Button */}
          {onEnterTroskiMode && (
            <button
              onClick={onEnterTroskiMode}
              className="absolute top-52 right-4 z-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-3 shadow-md hover:shadow-lg transition-all"
              aria-label="Troski Mode"
            >
              <Bus className="h-5 w-5" />
            </button>
          )}

          {/* Bottom controls */}
          <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
            <div className="px-4 pb-8 bg-gradient-to-t from-background via-background/50 to-transparent">
              <div className="space-y-3 max-w-lg mx-auto pointer-events-auto">
                {/* Action buttons - SOS and Report */}
                <div className="flex gap-3">
                  <SOSButton onClick={() => setSOSOpen(true)} />

                  <Button
                    onClick={() => setReportOpen(true)}
                    className="flex-1 h-14 font-semibold text-base rounded-xl shadow-2xl flex items-center justify-center gap-2"
                  >
                    {/*<AlertTriangle className="h-5 w-5" />*/}
                    Report a danger
                  </Button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Where are you going?"
                    value={destinationPlace?.text || ''}
                    onClick={() => setSearchOpen(true)}
                    readOnly
                    className="w-full h-14 text-base pl-12 pr-4 bg-card backdrop-blur-sm text-foreground placeholder-muted-foreground shadow-2xl border border-border rounded-xl cursor-pointer"
                  />
                  <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search Drawer */}
      <SearchDrawer
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectDestination={handleSelectDestination}
        currentMapCenter={{ lng, lat }}
        onRequestLocation={getUserLocation}
      />

      {/* Report Drawer */}
      <ReportDrawer
        open={reportOpen}
        onOpenChange={setReportOpen}
        onReportIncident={handleReportIncident}
      />

      {/* Feedback Modal - Manual button click */}
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        userLocation={userLocation}
      />

      {/* Auto Popup Modal - Shows after 20 seconds */}
      <AutoPopupModal
        open={autoPopupOpen}
        onOpenChange={setAutoPopupOpen}
        userLocation={userLocation}
      />

      {/* SOS Drawer */}
      <SOSDrawer
        open={sosOpen}
        onOpenChange={setSOSOpen}
        userLocation={userLocation}
        onNavigateToPolice={handleNavigateToPolice}
        onFakeCall={handleFakeCall}
      />
    </div>
  )
}

export default MapComponent
