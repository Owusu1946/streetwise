import { NextRequest, NextResponse } from 'next/server'
import { findTroskiRoutes, getRouteStops, saveTroskiRoute } from '@/utils/troski'

interface CreateRouteBody {
    origin_name: string
    origin_latitude: number
    origin_longitude: number
    destination_name: string
    destination_latitude: number
    destination_longitude: number
    total_fare?: number
    estimated_duration?: number
    stops: {
        stop_name: string
        stop_latitude: number
        stop_longitude: number
        stop_type: 'board' | 'alight' | 'transfer'
        troski_description?: string
        fare_from_previous?: number
    }[]
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const originLat = searchParams.get('origin_lat')
        const originLng = searchParams.get('origin_lng')
        const destLat = searchParams.get('dest_lat')
        const destLng = searchParams.get('dest_lng')
        const radius = searchParams.get('radius')
        const routeId = searchParams.get('route_id')

        // If route_id provided, get stops for that route
        if (routeId) {
            const { data, error } = await getRouteStops(routeId)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ stops: data })
        }

        // Otherwise, search for routes
        if (!originLat || !originLng || !destLat || !destLng) {
            return NextResponse.json(
                { error: 'Missing required parameters: origin_lat, origin_lng, dest_lat, dest_lng' },
                { status: 400 }
            )
        }

        const { data, error } = await findTroskiRoutes(
            parseFloat(originLat),
            parseFloat(originLng),
            parseFloat(destLat),
            parseFloat(destLng),
            radius ? parseInt(radius) : 1000
        )

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ routes: data })
    } catch (error) {
        console.error('Error in GET /api/troski/routes:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            origin_name,
            origin_latitude,
            origin_longitude,
            destination_name,
            destination_latitude,
            destination_longitude,
            total_fare,
            estimated_duration,
            stops,
        } = body as CreateRouteBody

        // Validate required fields
        if (
            !origin_name ||
            origin_latitude === undefined ||
            origin_longitude === undefined ||
            !destination_name ||
            destination_latitude === undefined ||
            destination_longitude === undefined
        ) {
            return NextResponse.json(
                {
                    error:
                        'Missing required fields: origin_name, origin_latitude, origin_longitude, destination_name, destination_latitude, destination_longitude',
                },
                { status: 400 }
            )
        }

        // Validate coordinates
        if (origin_latitude < -90 || origin_latitude > 90 || destination_latitude < -90 || destination_latitude > 90) {
            return NextResponse.json({ error: 'Invalid latitude values' }, { status: 400 })
        }

        if (origin_longitude < -180 || origin_longitude > 180 || destination_longitude < -180 || destination_longitude > 180) {
            return NextResponse.json({ error: 'Invalid longitude values' }, { status: 400 })
        }

        // Validate stops
        if (!stops || !Array.isArray(stops) || stops.length === 0) {
            return NextResponse.json(
                { error: 'At least one stop is required' },
                { status: 400 }
            )
        }

        const { data, error } = await saveTroskiRoute({
            origin_name,
            origin_latitude,
            origin_longitude,
            destination_name,
            destination_latitude,
            destination_longitude,
            total_fare,
            estimated_duration,
            stops,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, route: data }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/troski/routes:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
