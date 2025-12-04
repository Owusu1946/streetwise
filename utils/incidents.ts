import { getIncidentSeverity } from '@/config/config'
import { supabaseAdmin } from './supabase-admin'

export interface Incident {
  id: string
  type: string
  latitude: number
  longitude: number
  severity: number
  created_at: string
}

export interface CreateIncidentInput {
  type: string
  latitude: number
  longitude: number
}

/**
 * Save a new incident to the database
 */
export async function saveIncident(
  input: CreateIncidentInput
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    const severity = getIncidentSeverity(input.type)

    const { data, error } = await supabaseAdmin
      .from('incidents')
      .insert({
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        severity,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving incident:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Unexpected error saving incident:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get incidents near a route within the last N days
 * @param routeGeometry GeoJSON LineString geometry from Mapbox route
 * @param bufferMeters Buffer distance in meters (default 100m)
 * @param maxAgeDays Maximum age of incidents in days (default 30)
 */
export async function getIncidentsNearRoute(
  routeGeometry: any,
  bufferMeters = 100,
  maxAgeDays = 30
): Promise<{ data: Incident[]; error: Error | null }> {
  try {
    // Extract coordinates from GeoJSON LineString
    const coordinates = routeGeometry.coordinates as [number, number][]

    // Create a GeoJSON LineString
    const lineString = {
      type: 'LineString',
      coordinates,
    }

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    // Query incidents within buffer distance of the route
    const { data, error } = await supabaseAdmin.rpc('get_incidents_near_route', {
      route_geojson: lineString,
      buffer_meters: bufferMeters,
      cutoff_date: cutoffDate.toISOString(),
    })

    if (error) {
      console.error('Error fetching incidents near route:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching incidents:', err)
    return { data: [], error: err as Error }
  }
}

/**
 * Get all recent incidents (for map display)
 * @param maxAgeDays Maximum age of incidents in days (default 30)
 */
export async function getRecentIncidents(
  maxAgeDays = 30
): Promise<{ data: Incident[]; error: Error | null }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    const { data, error } = await supabaseAdmin
      .from('incidents')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recent incidents:', error)
      return { data: [], error: new Error(error.message) }
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching recent incidents:', err)
    return { data: [], error: err as Error }
  }
}
