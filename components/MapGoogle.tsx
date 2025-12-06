'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Bus, MessageCircleHeart, Navigation, Search, Building2, Layers } from 'lucide-react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { AutoPopupModal } from './AutoPopupModal'
import { FeedbackModal } from './FeedbackModal'
import { InstallPWAButton } from './InstallPWAWrapper'
import SOSButton from './SOSButton'
import SOSDrawer from './SOSDrawer'
import { useIncidentMarkersGoogle } from './Map/IncidentMarkersGoogle'
import { usePoliceMarkersGoogle } from './Map/PoliceMarkersGoogle'
import { useMapNavigationGoogle } from './Map/useMapNavigationGoogle'
import NavigationMode from './NavigationMode'
import ReportDrawer from './ReportDrawer'
import RouteSelection from './RouteSelection'
import SearchDrawerGoogle from './SearchDrawerGoogle'
import { WeatherWidget } from './WeatherWidget'
import {
    DARK_MAP_STYLE,
    LIGHT_MAP_STYLE,
    GOOGLE_MAPS_LIBRARIES,
    getMapTypeId,
    reverseGeocode,
    type MapViewMode,
} from '@/utils/googlemaps'

interface MapProps {
    className?: string
    onEnterTroskiMode?: () => void
}

const containerStyle = {
    width: '100%',
    height: '100%',
}

const defaultCenter = {
    lat: 5.6037, // Accra, Ghana
    lng: -0.1870,
}

function MapComponent({ className = '', onEnterTroskiMode }: MapProps) {
    const router = useRouter()
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [lng, setLng] = useState<number>(-0.1870)
    const [lat, setLat] = useState<number>(5.6037)
    const [zoom, setZoom] = useState<number>(12)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [mapError, setMapError] = useState<string | null>(null)
    const { resolvedTheme } = useTheme()
    const geocoderRef = useRef<google.maps.Geocoder | null>(null)

    // Drawer states
    const [searchOpen, setSearchOpen] = useState(false)
    const [reportOpen, setReportOpen] = useState(false)
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [autoPopupOpen, setAutoPopupOpen] = useState(false)
    const [sosOpen, setSOSOpen] = useState(false)

    // Community data toggle state
    const [showCommunityData, setShowCommunityData] = useState(true)

    // Track if user is dragging the map
    const isDragging = useRef(false)

    // 3D Mode state (limited in Google Maps - uses tilt)
    const [is3DMode, setIs3DMode] = useState(false)

    // Map View Mode state
    const [mapViewMode, setMapViewMode] = useState<MapViewMode>('standard')

    // Load Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
    })

    // Auto-popup timer
    useEffect(() => {
        const popupShown = localStorage.getItem('streetwise_popup_shown')

        if (!popupShown) {
            const timer = setTimeout(() => {
                setAutoPopupOpen(true)
            }, 20000)

            return () => clearTimeout(timer)
        }
    }, [])

    // Use navigation hook (will be created)
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
    } = useMapNavigationGoogle(map)

    // Use incident markers hook (will be created)
    useIncidentMarkersGoogle({ map, mapLoaded, showCommunityData })

    // Use police markers hook (will be created)
    usePoliceMarkersGoogle({ map, mapLoaded })

    // Handle map load
    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
        setMapLoaded(true)
        geocoderRef.current = new google.maps.Geocoder()
        console.log('Google Map loaded successfully!')
    }, [])

    // Handle map unmount
    const onUnmount = useCallback(() => {
        setMap(null)
        setMapLoaded(false)
    }, [])

    // Get user location on map load
    useEffect(() => {
        if (mapLoaded && map) {
            getUserLocation().catch((error) => {
                console.log('Could not get user location on initial load:', error)
            })
        }
    }, [mapLoaded, map, getUserLocation])

    // Update map style when theme or view mode changes
    useEffect(() => {
        if (!map || !mapLoaded) return

        // Set map type
        map.setMapTypeId(getMapTypeId(mapViewMode))

        // Apply custom styles for standard view
        if (mapViewMode === 'standard') {
            map.setOptions({
                styles: resolvedTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
            })
        } else {
            // No custom styles for satellite
            map.setOptions({ styles: [] })
        }
    }, [resolvedTheme, mapLoaded, mapViewMode, map])

    // Handle 3D Mode toggle
    useEffect(() => {
        if (!map || !mapLoaded) return

        if (is3DMode) {
            map.setTilt(45)
            map.setHeading(-17.6)
        } else {
            map.setTilt(0)
            map.setHeading(0)
        }
    }, [is3DMode, mapLoaded, map])

    // Handle map center/zoom changes
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
        setZoom(parseFloat(map.getZoom()?.toFixed(2) || '12'))
    }, [map])

    // Handle map drag events during navigation
    const handleDragStart = useCallback(() => {
        isDragging.current = true
        if (navigationState === 'navigating') {
            setIsFollowingUser(false)
            setShowRecenter(true)
        }
    }, [navigationState, setIsFollowingUser, setShowRecenter])

    const handleDragEnd = useCallback(() => {
        setTimeout(() => {
            isDragging.current = false
        }, 200)
    }, [])

    // Handle click-to-navigate
    const handleMapClick = useCallback(
        async (e: google.maps.MapMouseEvent) => {
            if (navigationState !== 'idle') return
            if (isDragging.current) return
            if (!e.latLng) return

            const clickLat = e.latLng.lat()
            const clickLng = e.latLng.lng()

            const { toast } = await import('sonner')
            const loadingToast = toast.loading('Getting location details...')

            try {
                if (!geocoderRef.current) {
                    geocoderRef.current = new google.maps.Geocoder()
                }

                const result = await reverseGeocode(clickLat, clickLng, geocoderRef.current)

                if (result) {
                    toast.dismiss(loadingToast)

                    await handleSelectDestination({
                        text: result.address_components?.[0]?.long_name || 'Selected location',
                        place_name: result.formatted_address || `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`,
                        center: [clickLng, clickLat],
                        geometry: {
                            type: 'Point',
                            coordinates: [clickLng, clickLat],
                        },
                    })

                    toast.success('Destination set!', {
                        description: result.formatted_address || 'Tap-to-navigate location',
                    })
                } else {
                    toast.dismiss(loadingToast)
                    toast.error('Could not get location details')
                }
            } catch (error) {
                toast.dismiss(loadingToast)
                console.error('Error getting location details:', error)
                toast.error('Could not get location details')
            }
        },
        [navigationState, handleSelectDestination]
    )

    // Handle SOS actions
    const handleNavigateToPolice = async () => {
        try {
            let locationToUse = userLocation
            if (!locationToUse) {
                locationToUse = await getUserLocation()
            }

            const response = await fetch(
                `/api/nearest-police?lat=${locationToUse[1]}&lng=${locationToUse[0]}`
            )

            if (!response.ok) {
                throw new Error('Failed to find police station')
            }

            const policeStation = await response.json()

            if (navigationState === 'navigating') {
                const { toast } = await import('sonner')
                const confirmed = window.confirm(
                    'This will end your current navigation and start new directions to the police station. Continue?'
                )
                if (!confirmed) return
            }

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
                    onClick={handleMapClick}
                    onCenterChanged={handleCenterChanged}
                    onZoomChanged={handleZoomChanged}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
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
                    <div className="text-foreground text-sm">Loading map...</div>
                </div>
            )}

            {/* Loading indicator */}
            {isLoaded && !mapLoaded && !mapError && (
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

                    {/* Mobile Weather Widget */}
                    <div className="absolute top-20 left-6 z-10 md:hidden">
                        <WeatherWidget lat={lat} lng={lng} />
                    </div>

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

            {/* Search Drawer - will be created */}
            <SearchDrawerGoogle
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

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackOpen}
                onOpenChange={setFeedbackOpen}
                userLocation={userLocation}
            />

            {/* Auto Popup Modal */}
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
