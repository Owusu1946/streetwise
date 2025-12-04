import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/utils/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  try {
    const supabase = await createSupabaseServer()

    // Find nearest police station using PostGIS
    // The location column is a geography type, so we can use ST_Distance
    const { data, error } = await supabase.rpc('get_nearest_police_station', {
      user_lat: parseFloat(lat),
      user_lng: parseFloat(lng),
    })

    if (error) {
      console.error('Error fetching nearest police station:', error)
      // Fallback: just get any police station ordered by distance
      const { data: stations, error: fallbackError } = await supabase
        .from('police_stations')
        .select('*')
        .limit(1)

      if (fallbackError || !stations || stations.length === 0) {
        return NextResponse.json({ error: 'No police stations found' }, { status: 404 })
      }

      return NextResponse.json(stations[0])
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: 'No police stations found' }, { status: 404 })
    }

    return NextResponse.json(Array.isArray(data) ? data[0] : data)
  } catch (error) {
    console.error('Error in nearest-police API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
