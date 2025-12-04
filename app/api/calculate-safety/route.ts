import { SAFETY_CONFIG, calculateTimeWeight, getIncidentPenalty } from '@/config/config'
import { getIncidentsNearRoute } from '@/utils/incidents'
import { getPoliceStationsNearRoute } from '@/utils/police-stations'
import { getStreetLightsNearRoute } from '@/utils/street-lights'
import { NextRequest, NextResponse } from 'next/server'

interface RouteInput {
  geometry: any // GeoJSON LineString from Mapbox
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { geometry } = body as RouteInput

    if (!geometry || !geometry.coordinates) {
      return NextResponse.json({ error: 'Invalid route geometry' }, { status: 400 })
    }

    // Get incidents near this route
    const { data: incidents, error: incidentsError } = await getIncidentsNearRoute(
      geometry,
      SAFETY_CONFIG.BUFFER_DISTANCE_METERS,
      SAFETY_CONFIG.MAX_INCIDENT_AGE_DAYS
    )

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError)
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    // Get police stations near this route
    const { data: policeStations, error: policeError } = await getPoliceStationsNearRoute(
      geometry,
      SAFETY_CONFIG.POLICE_STATION_BUFFER_METERS
    )

    if (policeError) {
      console.error('Error fetching police stations:', policeError)
      // Don't fail the request if police stations can't be fetched
      // Just continue without the bonus
    }

    // Calculate safety score
    let safetyScore = SAFETY_CONFIG.BASE_SAFETY_SCORE
    let totalPenalty = 0

    console.log(`Found ${incidents.length} incidents near route`)
    console.log(`Found ${policeStations.length} police stations near route`)

    // Calculate penalties from incidents
    incidents.forEach((incident) => {
      const penalty = getIncidentPenalty(incident.type)
      const timeWeight = calculateTimeWeight(new Date(incident.created_at))
      const weightedPenalty = penalty * timeWeight

      totalPenalty += weightedPenalty
      safetyScore -= weightedPenalty
    })

    // Add bonus for police stations
    let policeBonus = 0
    if (policeStations && policeStations.length > 0) {
      // Calculate total bonus (limited by MAX_POLICE_STATION_BONUS)
      policeBonus = Math.min(
        policeStations.length * SAFETY_CONFIG.POLICE_STATION_BONUS,
        SAFETY_CONFIG.MAX_POLICE_STATION_BONUS
      )
      safetyScore += policeBonus
      console.log(
        `Applied police station bonus: +${policeBonus} (${policeStations.length} stations)`
      )
    }

    // Get street lighting data
    const { data: lightingData, error: lightingError } = await getStreetLightsNearRoute(
      geometry,
      SAFETY_CONFIG.LIGHTING_BUFFER_DISTANCE_METERS
    )

    if (lightingError) {
      console.error('Error fetching street lights:', lightingError)
      // Continue without lighting data
    }

    // Add bonus for street lighting
    let lightingBonus = 0
    if (lightingData && lightingData.totalLights > 0) {
      // Progressive bonus based on coverage
      // 0-30% coverage: 0-0.5 points
      // 30-60% coverage: 0.5-1.0 points
      // 60-80% coverage: 1.0-1.5 points
      // 80-100% coverage: 1.5-2.0 points

      if (lightingData.coveragePercentage <= 30) {
        lightingBonus = (lightingData.coveragePercentage / 30) * 0.5
      } else if (lightingData.coveragePercentage <= 60) {
        lightingBonus = 0.5 + ((lightingData.coveragePercentage - 30) / 30) * 0.5
      } else if (lightingData.coveragePercentage <= 80) {
        lightingBonus = 1.0 + ((lightingData.coveragePercentage - 60) / 20) * 0.5
      } else {
        lightingBonus = 1.5 + ((lightingData.coveragePercentage - 80) / 20) * 0.5
      }

      safetyScore += lightingBonus

      console.log(
        `Applied lighting bonus: +${lightingBonus.toFixed(2)} (${lightingData.totalLights} lights, ${lightingData.coveragePercentage}% coverage)`
      )
    }

    // Ensure score stays within valid range (0-10)
    safetyScore = Math.max(SAFETY_CONFIG.MIN_SAFETY_SCORE, Math.min(10, safetyScore))

    console.log(
      `Final safety score: ${safetyScore} (penalties: -${totalPenalty}, police: +${policeBonus}, lighting: +${lightingBonus})`
    )

    return NextResponse.json({
      safetyScore: Math.round(safetyScore * 10) / 10, // Round to 1 decimal
      incidentCount: incidents.length,
      policeStationCount: policeStations.length,
      totalPenalty: Math.round(totalPenalty * 10) / 10,
      policeBonus: Math.round(policeBonus * 10) / 10,
      lightingBonus: Math.round(lightingBonus * 10) / 10,
      lightingData: lightingData,
      incidents: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        latitude: i.latitude,
        longitude: i.longitude,
        created_at: i.created_at,
        location: [i.longitude, i.latitude],
      })),
      policeStations: policeStations.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        location: [p.longitude, p.latitude],
      })),
    })
  } catch (error) {
    console.error('Error calculating safety score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
