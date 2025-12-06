import { supabaseAdmin } from './supabase-admin'

export interface StreetLight {
  id: number
  latitude: number
  longitude: number
  categorie_ouvrage: string
  regime_horaire: string
  type_lampe: string
  distance_meters?: number
}

export interface LightingData {
  totalLights: number
  lights24h: number
  lightsNightOnly: number
  coveragePercentage: number
}

/**
 * Get street lights near a route using individual lights counting
 * @param geometry - GeoJSON LineString from Mapbox
 * @param bufferDistance - Distance in meters to search around route
 */
export async function getStreetLightsNearRoute(
  geometry: any,
  bufferDistance: number = 30
): Promise<{ data: LightingData; error: any }> {
  try {
    // Direct query to count individual lights along route
    const { data, error } = (await supabaseAdmin
      .rpc('count_lights_along_route', {
        route_geojson: geometry,
        buffer_meters: bufferDistance,
      })
      .single()) as {
        data: {
          total_lights: number
          lights_24h: number
          lights_night_only: number
        } | null
        error: any
      }

    if (error || !data) {
      // Only log if it's not the known "function doesn't exist" error
      if (error?.code !== 'PGRST202') {
        console.error('Error fetching street lights:', error)
      }
      // Return default values - street lights feature not available
      return {
        data: {
          totalLights: 0,
          lights24h: 0,
          lightsNightOnly: 0,
          coveragePercentage: 0,
        },
        error: null, // Don't propagate error for missing function
      }
    }

    console.log('Street lights data found:', data)

    // Calculate coverage percentage based on route length
    const routeCoordinates = geometry.coordinates
    let totalDistance = 0

    for (let i = 1; i < routeCoordinates.length; i++) {
      const [lng1, lat1] = routeCoordinates[i - 1]
      const [lng2, lat2] = routeCoordinates[i]

      // Simple distance calculation (good enough for small distances)
      const dx = (lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180)
      const dy = (lat2 - lat1) * 111000
      totalDistance += Math.sqrt(dx * dx + dy * dy)
    }

    // Expected number of lights for good coverage
    // Paris has high density - expect 1 light every 25-30m for well-lit streets
    const expectedLightsForFullCoverage = Math.ceil(totalDistance / 25)

    // Calculate percentage based on actual vs expected
    // Use a more realistic formula that doesn't easily hit 100%
    const rawPercentage = (data.total_lights / expectedLightsForFullCoverage) * 100

    // Apply a curve so that:
    // - 0-20 lights = low coverage (0-30%)
    // - 20-50 lights = moderate (30-60%)
    // - 50-100 lights = good (60-85%)
    // - 100+ lights = excellent (85-100%)
    let coveragePercentage: number

    if (data.total_lights === 0) {
      coveragePercentage = 0
    } else if (rawPercentage >= 100) {
      // Even with many lights, cap at 95-100% based on density
      coveragePercentage = Math.min(100, 90 + (rawPercentage - 100) / 10)
    } else {
      // Use square root to create a more gradual curve
      coveragePercentage = Math.round(Math.sqrt(rawPercentage / 100) * 100)
    }

    console.log(
      `Route distance: ${totalDistance.toFixed(0)}m, Lights found: ${data.total_lights}, Expected for full coverage: ${expectedLightsForFullCoverage}, Coverage: ${coveragePercentage}%`
    )

    return {
      data: {
        totalLights: data.total_lights || 0,
        lights24h: data.lights_24h || 0,
        lightsNightOnly: data.lights_night_only || 0,
        coveragePercentage,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error in getStreetLightsNearRoute:', error)
    return {
      data: {
        totalLights: 0,
        lights24h: 0,
        lightsNightOnly: 0,
        coveragePercentage: 0,
      },
      error,
    }
  }
}

/**
 * Get street lights within radius of a point
 */
export async function getNearbyStreetLights(
  lat: number,
  lng: number,
  radiusMeters: number = 50
): Promise<{ data: StreetLight[]; error: any }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_nearby_lights', {
      lat,
      lng,
      radius_meters: radiusMeters,
    })

    if (error) {
      console.error('Error fetching nearby street lights:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error in getNearbyStreetLights:', error)
    return { data: [], error }
  }
}
