import { supabaseAdmin } from './supabase-admin'

// =====================================================
// Types
// =====================================================

export interface TroskiStop {
    id: string
    name: string
    description?: string
    latitude: number
    longitude: number
    landmark?: string
    usage_count: number
    created_at: string
    distance?: number // Added by nearby query
}

export interface TroskiRoute {
    id: string
    origin_name: string
    origin_latitude: number
    origin_longitude: number
    destination_name: string
    destination_latitude: number
    destination_longitude: number
    total_fare?: number
    estimated_duration?: number
    usage_count: number
    is_verified: boolean
    created_at: string
    origin_distance?: number // Added by search query
    destination_distance?: number // Added by search query
}

export interface TroskiRouteStop {
    id: string
    route_id: string
    stop_id?: string
    stop_name: string
    stop_latitude: number
    stop_longitude: number
    sequence_order: number
    stop_type: 'board' | 'alight' | 'transfer'
    troski_description?: string
    fare_from_previous?: number
    created_at: string
}

export interface CreateTroskiStopInput {
    name: string
    description?: string
    latitude: number
    longitude: number
    landmark?: string
}

export interface CreateTroskiRouteInput {
    origin_name: string
    origin_latitude: number
    origin_longitude: number
    destination_name: string
    destination_latitude: number
    destination_longitude: number
    total_fare?: number
    estimated_duration?: number
    stops: CreateRouteStopInput[]
}

export interface CreateRouteStopInput {
    stop_name: string
    stop_latitude: number
    stop_longitude: number
    stop_type: 'board' | 'alight' | 'transfer'
    troski_description?: string
    fare_from_previous?: number
}

export interface JourneyResult {
    route: TroskiRoute
    stops: TroskiRouteStop[]
}

// =====================================================
// Stop Functions
// =====================================================

/**
 * Save a new troski stop
 */
export async function saveTroskiStop(
    input: CreateTroskiStopInput
): Promise<{ data: TroskiStop | null; error: Error | null }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troski_stops')
            .insert({
                name: input.name,
                description: input.description,
                latitude: input.latitude,
                longitude: input.longitude,
                landmark: input.landmark,
            })
            .select()
            .single()

        if (error) {
            console.error('Error saving troski stop:', error)
            return { data: null, error: new Error(error.message) }
        }

        return { data, error: null }
    } catch (err) {
        console.error('Unexpected error saving troski stop:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get all troski stops
 */
export async function getAllTroskiStops(): Promise<{
    data: TroskiStop[]
    error: Error | null
}> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troski_stops')
            .select('*')
            .order('usage_count', { ascending: false })

        if (error) {
            console.error('Error fetching troski stops:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error fetching troski stops:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Get troski stops near a location
 */
export async function getNearbyTroskiStops(
    lat: number,
    lng: number,
    radiusMeters = 500,
    maxResults = 20
): Promise<{ data: TroskiStop[]; error: Error | null }> {
    try {
        const { data, error } = await supabaseAdmin.rpc('get_nearby_troski_stops', {
            lat,
            lng,
            radius_meters: radiusMeters,
            max_results: maxResults,
        })

        if (error) {
            console.error('Error fetching nearby troski stops:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error fetching nearby troski stops:', err)
        return { data: [], error: err as Error }
    }
}

// =====================================================
// Route Functions
// =====================================================

/**
 * Save a new troski route with stops
 */
export async function saveTroskiRoute(
    input: CreateTroskiRouteInput
): Promise<{ data: TroskiRoute | null; error: Error | null }> {
    try {
        // Insert the route first
        const { data: route, error: routeError } = await supabaseAdmin
            .from('troski_routes')
            .insert({
                origin_name: input.origin_name,
                origin_latitude: input.origin_latitude,
                origin_longitude: input.origin_longitude,
                destination_name: input.destination_name,
                destination_latitude: input.destination_latitude,
                destination_longitude: input.destination_longitude,
                total_fare: input.total_fare,
                estimated_duration: input.estimated_duration,
            })
            .select()
            .single()

        if (routeError) {
            console.error('Error saving troski route:', routeError)
            return { data: null, error: new Error(routeError.message) }
        }

        // Insert the stops
        if (input.stops.length > 0) {
            const stopsToInsert = input.stops.map((stop, index) => ({
                route_id: route.id,
                stop_name: stop.stop_name,
                stop_latitude: stop.stop_latitude,
                stop_longitude: stop.stop_longitude,
                sequence_order: index + 1,
                stop_type: stop.stop_type,
                troski_description: stop.troski_description,
                fare_from_previous: stop.fare_from_previous,
            }))

            const { error: stopsError } = await supabaseAdmin
                .from('troski_route_stops')
                .insert(stopsToInsert)

            if (stopsError) {
                console.error('Error saving route stops:', stopsError)
                // Don't fail the whole operation, route is still created
            }

            // Update usage count for any existing stops that match
            for (const stop of input.stops) {
                await supabaseAdmin.rpc('get_nearby_troski_stops', {
                    lat: stop.stop_latitude,
                    lng: stop.stop_longitude,
                    radius_meters: 50,
                    max_results: 1,
                })
            }
        }

        return { data: route, error: null }
    } catch (err) {
        console.error('Unexpected error saving troski route:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Find routes between origin and destination
 */
export async function findTroskiRoutes(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    searchRadiusMeters = 10000 // 10km default for city-level searches
): Promise<{ data: TroskiRoute[]; error: Error | null }> {
    try {
        const { data, error } = await supabaseAdmin.rpc('find_troski_routes', {
            origin_lat: originLat,
            origin_lng: originLng,
            dest_lat: destLat,
            dest_lng: destLng,
            search_radius_meters: searchRadiusMeters,
        })

        if (error) {
            console.error('Error finding troski routes:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error finding troski routes:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Find routes by destination only (ignores user's current location)
 * This is the main search function for when users type where they want to go
 */
export async function findRoutesByDestination(
    destLat: number,
    destLng: number,
    searchRadiusMeters = 15000 // 15km default
): Promise<{ data: TroskiRoute[]; error: Error | null }> {
    try {
        console.log('🔍 Finding routes by destination:', { destLat, destLng, searchRadiusMeters })

        const { data, error } = await supabaseAdmin.rpc('find_routes_by_destination', {
            dest_lat: destLat,
            dest_lng: destLng,
            search_radius_meters: searchRadiusMeters,
        })

        console.log('📍 Found routes by destination:', data?.length || 0)

        if (error) {
            console.error('Error finding routes by destination:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error finding routes by destination:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Search routes by destination name (text-based search)
 */
export async function searchRoutesByName(
    searchQuery: string
): Promise<{ data: TroskiRoute[]; error: Error | null }> {
    try {
        console.log('🔍 Searching routes by name:', searchQuery)

        const { data, error } = await supabaseAdmin.rpc('search_routes_by_destination_name', {
            search_query: searchQuery,
        })

        console.log('📍 Found routes by name search:', data?.length || 0)

        if (error) {
            console.error('Error searching routes by name:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error searching routes by name:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Get stops for a specific route
 */
export async function getRouteStops(
    routeId: string
): Promise<{ data: TroskiRouteStop[]; error: Error | null }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('troski_route_stops')
            .select('*')
            .eq('route_id', routeId)
            .order('sequence_order', { ascending: true })

        if (error) {
            console.error('Error fetching route stops:', error)
            return { data: [], error: new Error(error.message) }
        }

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Unexpected error fetching route stops:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Find a complete journey (route + stops) to a destination
 * Now searches by destination only - users want to go somewhere,
 * and we show them routes that go there
 */
export async function findJourney(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    searchRadiusMeters = 15000 // 15km default for city-level searches
): Promise<{ data: JourneyResult[]; error: Error | null }> {
    try {
        console.log('🔍 Finding journey to destination:', { destLat, destLng, searchRadiusMeters })

        // First try: Find routes by destination coordinates
        let { data: routes, error: routesError } = await findRoutesByDestination(
            destLat,
            destLng,
            searchRadiusMeters
        )

        console.log('📍 Found routes by destination coordinates:', routes?.length || 0)

        // If no routes found and we have an error, return it
        if (routesError) {
            console.error('Error in findRoutesByDestination:', routesError)
            // Don't fail - try the fallback
        }

        // If still no routes, the RPC might not exist yet - do a direct query
        if (!routes || routes.length === 0) {
            console.log('📍 Trying direct database query...')
            const { data: directRoutes, error: directError } = await supabaseAdmin
                .from('troski_routes')
                .select('*')
                .order('usage_count', { ascending: false })
                .limit(20)

            if (directError) {
                console.error('Error in direct query:', directError)
            } else {
                routes = directRoutes || []
                console.log('📍 Found routes via direct query:', routes.length)
            }
        }

        if (!routes || routes.length === 0) {
            return { data: [], error: null }
        }

        // Get stops for each route
        const journeys: JourneyResult[] = []

        for (const route of routes) {
            const { data: stops, error: stopsError } = await getRouteStops(route.id)

            if (stopsError) {
                console.error(`Error fetching stops for route ${route.id}:`, stopsError)
                continue
            }

            journeys.push({
                route,
                stops: stops || [],
            })
        }

        return { data: journeys, error: null }
    } catch (err) {
        console.error('Unexpected error finding journey:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Increment usage count for a route (when someone uses it)
 */
export async function incrementRouteUsage(routeId: string): Promise<void> {
    try {
        await supabaseAdmin.rpc('increment', {
            table_name: 'troski_routes',
            row_id: routeId,
            column_name: 'usage_count',
        })
    } catch (err) {
        console.error('Error incrementing route usage:', err)
    }
}
