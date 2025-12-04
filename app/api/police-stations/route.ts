import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const bounds = await request.json()
    const { north, south, east, west } = bounds

    // Validate bounds
    if (
      typeof north !== 'number' ||
      typeof south !== 'number' ||
      typeof east !== 'number' ||
      typeof west !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 })
    }

    // Fetch police stations within bounds
    const { data: stations, error } = await supabase
      .from('police_stations')
      .select('*')
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)

    if (error) {
      console.error('Error fetching police stations:', error)
      return NextResponse.json({ error: 'Failed to fetch police stations' }, { status: 500 })
    }

    return NextResponse.json({ stations: stations || [] })
  } catch (error) {
    console.error('Error in police-stations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
