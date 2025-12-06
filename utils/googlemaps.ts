import { SAFETY_CONFIG } from '@/config/config'
import { RouteInfo, NavigationStep } from '@/types/navigation'

// Google Maps API Libraries needed
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry']

// Types for safer route generation
interface Incident {
    id: string
    type: string
    latitude: number
    longitude: number
    severity: number
    created_at: string
}

interface DangerCluster {
    center: [number, number]
    incidents: Incident[]
    totalSeverity: number
}

type CompassDirection = 'north' | 'south' | 'east' | 'west'

// ===== Map Styles =====

// Dark mode style for Google Maps
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }],
    },
    {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }],
    },
]

// Light mode - use default Google Maps style (empty array)
export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = []

// ===== Session Token =====

// Generate UUID v4 for session token
export const generateSessionToken = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

// ===== Geocoding =====

// Reverse geocode coordinates to get address
export const reverseGeocode = async (
    lat: number,
    lng: number,
    geocoder: google.maps.Geocoder
): Promise<google.maps.GeocoderResult | null> => {
    try {
        const response = await geocoder.geocode({ location: { lat, lng } })
        if (response.results && response.results.length > 0) {
            return response.results[0]
        }
        return null
    } catch (error) {
        console.error('Reverse geocoding error:', error)
        return null
    }
}

// Forward geocode address to get coordinates
export const forwardGeocode = async (
    address: string,
    geocoder: google.maps.Geocoder
): Promise<google.maps.GeocoderResult | null> => {
    try {
        const response = await geocoder.geocode({ address, region: 'GH' })
        if (response.results && response.results.length > 0) {
            return response.results[0]
        }
        return null
    } catch (error) {
        console.error('Forward geocoding error:', error)
        return null
    }
}

// ===== Places Search =====

// Search for places using Places API
export const searchPlaces = async (
    query: string,
    placesService: google.maps.places.PlacesService,
    location?: google.maps.LatLng
): Promise<google.maps.places.PlaceResult[]> => {
    return new Promise((resolve) => {
        const request: google.maps.places.TextSearchRequest = {
            query,
            location,
            radius: 50000, // 50km radius
        }

        placesService.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results)
            } else {
                console.error('Places search error:', status)
                resolve([])
            }
        })
    })
}

// Get autocomplete suggestions
export const getAutocompleteSuggestions = async (
    input: string,
    autocompleteService: google.maps.places.AutocompleteService,
    location?: google.maps.LatLng
): Promise<google.maps.places.AutocompletePrediction[]> => {
    if (!input || input.length < 3) return []

    return new Promise((resolve) => {
        const request: google.maps.places.AutocompletionRequest = {
            input,
            componentRestrictions: { country: 'gh' },
            location,
            radius: 50000,
        }

        autocompleteService.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                resolve(predictions)
            } else {
                console.error('Autocomplete error:', status)
                resolve([])
            }
        })
    })
}

// Get place details by place ID
export const getPlaceDetails = async (
    placeId: string,
    placesService: google.maps.places.PlacesService
): Promise<google.maps.places.PlaceResult | null> => {
    return new Promise((resolve) => {
        const request: google.maps.places.PlaceDetailsRequest = {
            placeId,
            fields: ['name', 'geometry', 'formatted_address', 'place_id'],
        }

        placesService.getDetails(request, (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                resolve(result)
            } else {
                console.error('Place details error:', status)
                resolve(null)
            }
        })
    })
}

// ===== Directions & Routing =====

// Convert Google Directions steps to our NavigationStep format
export const convertToNavigationSteps = (
    legs: google.maps.DirectionsLeg[]
): NavigationStep[] => {
    const steps: NavigationStep[] = []

    legs.forEach((leg) => {
        leg.steps.forEach((step) => {
            steps.push({
                instruction: step.instructions || '',
                distance: step.distance?.value || 0,
                duration: step.duration?.value || 0,
                maneuver: {
                    type: step.maneuver || 'straight',
                    instruction: step.instructions || '',
                    location: step.start_location
                        ? [step.start_location.lng(), step.start_location.lat()]
                        : undefined,
                },
                name: step.instructions?.replace(/<[^>]*>/g, '') || '',
            })
        })
    })

    return steps
}

// Convert Google DirectionsResult to GeoJSON geometry for compatibility
export const directionsToGeoJSON = (
    result: google.maps.DirectionsResult
): { type: 'LineString'; coordinates: [number, number][] } => {
    const coordinates: [number, number][] = []

    result.routes[0]?.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
            // Decode the polyline path
            const path = step.path || []
            path.forEach((point) => {
                coordinates.push([point.lng(), point.lat()])
            })
        })
    })

    // If no path from steps, use overview_path
    if (coordinates.length === 0 && result.routes[0]?.overview_path) {
        result.routes[0].overview_path.forEach((point) => {
            coordinates.push([point.lng(), point.lat()])
        })
    }

    return {
        type: 'LineString',
        coordinates,
    }
}

// Calculate routes between two points
export const calculateRoutes = async (
    start: [number, number],
    end: [number, number],
    directionsService: google.maps.DirectionsService,
    onProgress?: (message: string) => void
): Promise<RouteInfo[]> => {
    try {
        // Validate coordinates
        if (!start || !end || start.length !== 2 || end.length !== 2) {
            console.error('Invalid coordinates provided')
            return []
        }

        onProgress?.('Finding fastest route...')

        // Request walking directions
        const request: google.maps.DirectionsRequest = {
            origin: { lat: start[1], lng: start[0] },
            destination: { lat: end[1], lng: end[0] },
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: true,
        }

        const response = await directionsService.route(request)

        if (!response.routes || response.routes.length === 0) {
            console.error('No routes found')
            return []
        }

        // Get the primary route
        const primaryRoute = response.routes[0]
        const primaryLeg = primaryRoute.legs[0]

        // Convert to GeoJSON geometry for safety calculation
        const geometry = directionsToGeoJSON(response)

        // Calculate safety score for primary route
        const primarySafetyData = await calculateSafetyScore(geometry)

        let routes: RouteInfo[] = [
            {
                duration: primaryLeg.duration?.value || 0,
                distance: primaryLeg.distance?.value || 0,
                geometry,
                legs: response.routes[0].legs,
                steps: convertToNavigationSteps([primaryLeg]),
                safetyScore: primarySafetyData?.safetyScore ?? 8,
                incidentCount: primarySafetyData?.incidentCount ?? 0,
                totalPenalty: primarySafetyData?.totalPenalty ?? 0,
                lightingPercentage: primarySafetyData?.lightingData?.coveragePercentage ?? 0,
                lightingCount: primarySafetyData?.lightingData?.totalLights ?? 0,
            },
        ]

        console.log(
            `Primary route (fastest): ${routes[0].safetyScore}/10 safety, ${routes[0].incidentCount} incidents, ${routes[0].lightingPercentage}% lit`
        )

        onProgress?.('Analyzing safety and finding safer alternatives...')

        // Check for alternative routes from Google
        if (response.routes.length > 1) {
            for (let i = 1; i < Math.min(response.routes.length, 3); i++) {
                const altRoute = response.routes[i]
                const altLeg = altRoute.legs[0]
                const altGeometry = directionsToGeoJSON({ routes: [altRoute] } as google.maps.DirectionsResult)
                const altSafetyData = await calculateSafetyScore(altGeometry)

                if (altSafetyData) {
                    routes.push({
                        duration: altLeg.duration?.value || 0,
                        distance: altLeg.distance?.value || 0,
                        geometry: altGeometry,
                        legs: altRoute.legs,
                        steps: convertToNavigationSteps([altLeg]),
                        safetyScore: altSafetyData.safetyScore,
                        incidentCount: altSafetyData.incidentCount,
                        totalPenalty: altSafetyData.totalPenalty,
                        lightingPercentage: altSafetyData.lightingData?.coveragePercentage ?? 0,
                        lightingCount: altSafetyData.lightingData?.totalLights ?? 0,
                    })
                }
            }
        }

        // Try to generate safer alternative if needed
        if (routes.length === 1) {
            const saferAlternative = await generateSaferAlternative(
                start,
                end,
                routes[0],
                primarySafetyData,
                directionsService,
                onProgress
            )

            if (saferAlternative) {
                routes.push(saferAlternative)
            }
        }

        console.log(`\n=== Final Routes ===`)
        routes.forEach((route, idx) => {
            const label = routes.length === 1 ? 'Route (Fastest & Safest)' : idx === 0 ? 'Route 1 (Fastest)' : 'Route 2 (Safest)'
            console.log(
                `${label}: ${route.safetyScore}/10 safety, ${(route.distance / 1000).toFixed(2)}km, ${Math.ceil(route.duration / 60)}min`
            )
        })
        console.log(`Returning ${routes.length} route(s)`)
        return routes
    } catch (error) {
        console.error('Routing error:', error)
        return []
    }
}

// ===== Safer Route Generation Helper Functions =====

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371000 // Earth's radius in meters
    const lat1 = (coord1[1] * Math.PI) / 180
    const lat2 = (coord2[1] * Math.PI) / 180
    const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Find danger clusters from incidents
 */
function findDangerClusters(incidents: Incident[]): DangerCluster[] {
    if (incidents.length === 0) return []

    const clusters: DangerCluster[] = []
    const used = new Set<string>()

    const sortedIncidents = [...incidents].sort((a, b) => b.severity - a.severity)

    for (const incident of sortedIncidents) {
        if (used.has(incident.id)) continue

        const cluster: DangerCluster = {
            center: [incident.longitude, incident.latitude],
            incidents: [incident],
            totalSeverity: incident.severity,
        }
        used.add(incident.id)

        for (const other of sortedIncidents) {
            if (used.has(other.id)) continue

            const distance = calculateDistance(
                [incident.longitude, incident.latitude],
                [other.longitude, other.latitude]
            )

            if (distance <= SAFETY_CONFIG.DANGER_CLUSTER_RADIUS_METERS) {
                cluster.incidents.push(other)
                cluster.totalSeverity += other.severity
                used.add(other.id)
            }
        }

        clusters.push(cluster)
    }

    return clusters
        .sort((a, b) => b.totalSeverity - a.totalSeverity)
        .slice(0, SAFETY_CONFIG.MAX_DANGER_CLUSTERS_TO_AVOID)
}

/**
 * Count incidents in a direction
 */
function countIncidentsInDirection(
    center: [number, number],
    direction: CompassDirection,
    incidents: Incident[]
): number {
    const width = SAFETY_CONFIG.DIRECTION_CHECK_BOX_WIDTH_METERS
    const length = SAFETY_CONFIG.DIRECTION_CHECK_BOX_LENGTH_METERS

    const metersPerDegreeLat = 111000
    const metersPerDegreeLng = 111000 * Math.cos((center[1] * Math.PI) / 180)

    const widthDeg = width / metersPerDegreeLng
    const lengthDeg = length / metersPerDegreeLat

    let minLng = center[0], maxLng = center[0]
    let minLat = center[1], maxLat = center[1]

    switch (direction) {
        case 'north':
            minLng = center[0] - widthDeg / 2
            maxLng = center[0] + widthDeg / 2
            minLat = center[1]
            maxLat = center[1] + lengthDeg
            break
        case 'south':
            minLng = center[0] - widthDeg / 2
            maxLng = center[0] + widthDeg / 2
            minLat = center[1] - lengthDeg
            maxLat = center[1]
            break
        case 'east':
            minLng = center[0]
            maxLng = center[0] + widthDeg
            minLat = center[1] - lengthDeg / 2
            maxLat = center[1] + lengthDeg / 2
            break
        case 'west':
            minLng = center[0] - widthDeg
            maxLng = center[0]
            minLat = center[1] - lengthDeg / 2
            maxLat = center[1] + lengthDeg / 2
            break
    }

    return incidents.filter((incident) =>
        incident.longitude >= minLng &&
        incident.longitude <= maxLng &&
        incident.latitude >= minLat &&
        incident.latitude <= maxLat
    ).length
}

/**
 * Find safest direction from danger cluster
 */
function getSafestDirection(
    clusterCenter: [number, number],
    allIncidents: Incident[]
): CompassDirection {
    const directions = SAFETY_CONFIG.COMPASS_DIRECTIONS as readonly CompassDirection[]
    const directionCounts = directions.map((dir) => ({
        direction: dir,
        incidentCount: countIncidentsInDirection(clusterCenter, dir, allIncidents),
    }))

    directionCounts.sort((a, b) => a.incidentCount - b.incidentCount)
    return directionCounts[0].direction
}

/**
 * Generate waypoint offset from center
 */
function generateWaypoint(
    center: [number, number],
    direction: CompassDirection,
    distanceMeters: number
): [number, number] {
    const metersPerDegreeLat = 111000
    const metersPerDegreeLng = 111000 * Math.cos((center[1] * Math.PI) / 180)

    const offsetLat = distanceMeters / metersPerDegreeLat
    const offsetLng = distanceMeters / metersPerDegreeLng

    switch (direction) {
        case 'north': return [center[0], center[1] + offsetLat]
        case 'south': return [center[0], center[1] - offsetLat]
        case 'east': return [center[0] + offsetLng, center[1]]
        case 'west': return [center[0] - offsetLng, center[1]]
        default: return center
    }
}

/**
 * Request route with waypoints
 */
async function getRouteWithWaypoints(
    start: [number, number],
    end: [number, number],
    waypoints: [number, number][],
    directionsService: google.maps.DirectionsService
): Promise<google.maps.DirectionsResult | null> {
    try {
        const waypointRequests = waypoints.map((wp) => ({
            location: { lat: wp[1], lng: wp[0] },
            stopover: false,
        }))

        const request: google.maps.DirectionsRequest = {
            origin: { lat: start[1], lng: start[0] },
            destination: { lat: end[1], lng: end[0] },
            waypoints: waypointRequests,
            travelMode: google.maps.TravelMode.WALKING,
        }

        const response = await directionsService.route(request)
        return response.routes && response.routes.length > 0 ? response : null
    } catch (error) {
        console.error('Error fetching waypoint route:', error)
        return null
    }
}

/**
 * Calculate safety score for a route
 */
async function calculateSafetyScore(geometry: any): Promise<{
    safetyScore: number
    incidentCount: number
    policeStationCount?: number
    lightingCount?: number
    lightingPercentage?: number
    totalPenalty: number
    policeBonus?: number
    lightingBonus?: number
    incidents: any[]
    policeStations?: any[]
    lightingData?: {
        totalLights: number
        lights24h: number
        lightsNightOnly: number
        coveragePercentage: number
    }
} | null> {
    try {
        const safetyResponse = await fetch('/api/calculate-safety', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geometry }),
        })

        if (!safetyResponse.ok) return null
        return await safetyResponse.json()
    } catch (error) {
        console.error('Error calculating safety score:', error)
        return null
    }
}

/**
 * Generate safer alternative route
 */
async function generateSaferAlternative(
    start: [number, number],
    end: [number, number],
    originalRoute: RouteInfo,
    originalSafetyData: any,
    directionsService: google.maps.DirectionsService,
    onProgress?: (message: string) => void
): Promise<RouteInfo | null> {
    console.log('Attempting to generate safer alternative routes...')
    onProgress?.('Checking for danger zones to avoid...')

    const incidents = originalSafetyData?.incidents || []
    if (incidents.length === 0) {
        console.log('No incidents found, no need for alternative')
        return null
    }

    const clusters = findDangerClusters(incidents)
    if (clusters.length === 0) {
        console.log('No danger clusters identified')
        return null
    }

    console.log(`Found ${clusters.length} danger clusters to avoid`)

    let allAlternatives: RouteInfo[] = []
    let attemptCount = 0
    const maxAttempts = SAFETY_CONFIG.MAX_ALTERNATIVE_ROUTE_ATTEMPTS
    const clustersToAvoid = Math.min(clusters.length, SAFETY_CONFIG.MAX_DANGER_CLUSTERS_TO_AVOID)

    onProgress?.('Calculating safest route...')

    for (let clusterIdx = 0; clusterIdx < clustersToAvoid && attemptCount < maxAttempts; clusterIdx++) {
        const cluster = clusters[clusterIdx]
        const safestDirection = getSafestDirection(cluster.center, incidents)

        for (const distance of SAFETY_CONFIG.WAYPOINT_OFFSET_DISTANCES) {
            if (attemptCount >= maxAttempts) break
            attemptCount++

            const waypoint = generateWaypoint(cluster.center, safestDirection, distance)
            const response = await getRouteWithWaypoints(start, end, [waypoint], directionsService)

            if (!response) continue

            const route = response.routes[0]
            const routeLeg = route.legs[0]
            const routeDistance = routeLeg.distance?.value || 0

            const detourPercentage = ((routeDistance - originalRoute.distance) / originalRoute.distance) * 100
            if (detourPercentage > SAFETY_CONFIG.MAX_DETOUR_PERCENTAGE) continue

            const geometry = directionsToGeoJSON(response)
            const safetyData = await calculateSafetyScore(geometry)
            if (!safetyData) continue

            if (safetyData.safetyScore >= (originalSafetyData?.safetyScore || 0) - 0.3) {
                allAlternatives.push({
                    duration: routeLeg.duration?.value || 0,
                    distance: routeDistance,
                    geometry,
                    legs: route.legs,
                    steps: convertToNavigationSteps([routeLeg]),
                    safetyScore: safetyData.safetyScore,
                    incidentCount: safetyData.incidentCount,
                    totalPenalty: safetyData.totalPenalty,
                    lightingPercentage: safetyData.lightingData?.coveragePercentage ?? 0,
                    lightingCount: safetyData.lightingData?.totalLights ?? 0,
                })
            }
        }
    }

    if (allAlternatives.length === 0) {
        console.log('No safer alternatives found')
        return null
    }

    onProgress?.('Selecting the safest route...')
    allAlternatives.sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0))
    return allAlternatives[0]
}

// ===== Marker Helpers =====

export const createUserLocationMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div')
    el.className = 'user-location-marker'

    const dot = document.createElement('div')
    dot.className = 'user-location-dot'
    el.appendChild(dot)

    const pulse = document.createElement('div')
    pulse.className = 'user-location-pulse'
    el.appendChild(pulse)

    return el
}

export const createDestinationMarkerElement = (): HTMLDivElement => {
    const el = document.createElement('div')
    el.className = 'destination-marker'
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#EF4444'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    el.style.cursor = 'pointer'
    return el
}

// ===== Bounds Utilities =====

export const getBoundsForCoordinates = (
    coordinates: [number, number][]
): google.maps.LatLngBounds => {
    const bounds = new google.maps.LatLngBounds()

    coordinates.forEach((coord) => {
        bounds.extend({ lat: coord[1], lng: coord[0] })
    })

    return bounds
}

export const getBoundsForRoutes = (routes: RouteInfo[]): google.maps.LatLngBounds => {
    const bounds = new google.maps.LatLngBounds()

    routes.forEach((route) => {
        if (route.geometry?.coordinates) {
            route.geometry.coordinates.forEach((coord: [number, number]) => {
                bounds.extend({ lat: coord[1], lng: coord[0] })
            })
        }
    })

    return bounds
}

// ===== Map Type Helpers =====

export type MapViewMode = 'standard' | 'satellite'

export const getMapTypeId = (
    mode: MapViewMode
): google.maps.MapTypeId => {
    return mode === 'satellite'
        ? google.maps.MapTypeId.HYBRID
        : google.maps.MapTypeId.ROADMAP
}
