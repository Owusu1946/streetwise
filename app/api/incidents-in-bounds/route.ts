import { SAFETY_CONFIG } from '@/config/config'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

interface BoundsInput {
  north: number
  south: number
  east: number
  west: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { north, south, east, west } = body as BoundsInput

    // Validate bounds
    if (
      typeof north !== 'number' ||
      typeof south !== 'number' ||
      typeof east !== 'number' ||
      typeof west !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid bounds parameters' }, { status: 400 })
    }

    // Calculate the cutoff date for recent incidents
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - SAFETY_CONFIG.MAX_INCIDENT_AGE_DAYS)

    // Query incidents within bounds
    const { data, error } = await supabaseAdmin
      .from('incidents')
      .select('*')
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching incidents in bounds:', error)
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    return NextResponse.json({
      incidents: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('Error in incidents-in-bounds:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
