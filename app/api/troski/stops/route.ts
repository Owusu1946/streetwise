import { NextRequest, NextResponse } from 'next/server'
import { getAllTroskiStops, getNearbyTroskiStops, saveTroskiStop } from '@/utils/troski'

interface CreateStopBody {
    name: string
    description?: string
    latitude: number
    longitude: number
    landmark?: string
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = searchParams.get('lat')
        const lng = searchParams.get('lng')
        const radius = searchParams.get('radius')

        // If coordinates provided, get nearby stops
        if (lat && lng) {
            const { data, error } = await getNearbyTroskiStops(
                parseFloat(lat),
                parseFloat(lng),
                radius ? parseInt(radius) : 500
            )

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ stops: data })
        }

        // Otherwise, get all stops
        const { data, error } = await getAllTroskiStops()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ stops: data })
    } catch (error) {
        console.error('Error in GET /api/troski/stops:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, latitude, longitude, landmark } = body as CreateStopBody

        // Validate input
        if (!name || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: name, latitude, longitude' },
                { status: 400 }
            )
        }

        if (latitude < -90 || latitude > 90) {
            return NextResponse.json(
                { error: 'Invalid latitude. Must be between -90 and 90' },
                { status: 400 }
            )
        }

        if (longitude < -180 || longitude > 180) {
            return NextResponse.json(
                { error: 'Invalid longitude. Must be between -180 and 180' },
                { status: 400 }
            )
        }

        const { data, error } = await saveTroskiStop({
            name,
            description,
            latitude,
            longitude,
            landmark,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, stop: data }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/troski/stops:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
