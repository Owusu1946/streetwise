import { NextRequest, NextResponse } from 'next/server'
import { saveIncident } from '@/utils/incidents'

interface CreateIncidentBody {
  type: string
  latitude: number
  longitude: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, latitude, longitude } = body as CreateIncidentBody

    // Validate input
    if (!type || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, latitude, longitude' },
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

    // Save the incident
    const { data, error } = await saveIncident({
      type,
      latitude,
      longitude,
    })

    if (error) {
      console.error('Error saving incident:', error)
      return NextResponse.json({ error: 'Failed to save incident' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        incident: data,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in incident creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
