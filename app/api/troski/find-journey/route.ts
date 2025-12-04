import { NextRequest, NextResponse } from 'next/server'
import { findJourney } from '@/utils/troski'

interface FindJourneyBody {
    origin_lat: number
    origin_lng: number
    dest_lat: number
    dest_lng: number
    search_radius?: number
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { origin_lat, origin_lng, dest_lat, dest_lng, search_radius } = body as FindJourneyBody

        // Validate required fields
        if (
            origin_lat === undefined ||
            origin_lng === undefined ||
            dest_lat === undefined ||
            dest_lng === undefined
        ) {
            return NextResponse.json(
                { error: 'Missing required fields: origin_lat, origin_lng, dest_lat, dest_lng' },
                { status: 400 }
            )
        }

        // Validate coordinates
        if (origin_lat < -90 || origin_lat > 90 || dest_lat < -90 || dest_lat > 90) {
            return NextResponse.json({ error: 'Invalid latitude values' }, { status: 400 })
        }

        if (origin_lng < -180 || origin_lng > 180 || dest_lng < -180 || dest_lng > 180) {
            return NextResponse.json({ error: 'Invalid longitude values' }, { status: 400 })
        }

        // Use larger search radius (10km) for city-level searches
        const { data, error } = await findJourney(
            origin_lat,
            origin_lng,
            dest_lat,
            dest_lng,
            search_radius || 10000
        )

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            journeys: data,
            count: data.length,
        })
    } catch (error) {
        console.error('Error in POST /api/troski/find-journey:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
