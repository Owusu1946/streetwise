import { supabaseAdmin } from './supabase-admin'

export interface PoliceStation {
  id: string
  name: string
  latitude: number
  longitude: number
  address?: string
  phone?: string
}

/**
 * Get police stations near a route
 * @param routeGeometry GeoJSON LineString geometry from Mapbox route
 * @param bufferMeters Buffer distance in meters (default 300m)
 */
export async function getPoliceStationsNearRoute(
  routeGeometry: any,
  bufferMeters = 300
): Promise<{ data: PoliceStation[]; error: Error | null }> {
  try {
    // Extract coordinates from GeoJSON LineString
    const coordinates = routeGeometry.coordinates as [number, number][]

    // Create a GeoJSON LineString
    const lineString = {
      type: 'LineString',
      coordinates,
    }

    // Query police stations within buffer distance of the route
    const { data, error } = await supabaseAdmin.rpc('get_police_stations_near_route', {
      route_geojson: lineString,
      buffer_meters: bufferMeters,
    })

    if (error) {
      console.error('Error fetching police stations near route:', error)
      return { data: [], error: new Error(error.message) }
    }

    // Remove duplicates (in case a station is near multiple segments)
    const uniqueStations = data
      ? Array.from(new Map(data.map((station: PoliceStation) => [station.id, station])).values())
      : []

    return { data: uniqueStations as PoliceStation[], error: null }
  } catch (err) {
    console.error('Unexpected error fetching police stations:', err)
    return { data: [], error: err as Error }
  }
}

/**
 * Get all police stations within bounds (for map display)
 */
export async function getPoliceStationsInBounds(bounds: {
  north: number
  south: number
  east: number
  west: number
}): Promise<{ data: PoliceStation[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('police_stations')
      .select('*')
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)

    if (error) {
      console.error('Error fetching police stations in bounds:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching police stations:', err)
    return { data: [], error: err as Error }
  }
}
