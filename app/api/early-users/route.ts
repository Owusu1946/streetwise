import { supabaseAdmin } from '@/utils/supabase-admin'
import { createSupabaseServer } from '@/utils/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, feedback, location, timestamp } = body

    // Validate required fields
    if (!email || !feedback) {
      return NextResponse.json({ error: 'Email and feedback are required' }, { status: 400 })
    }

    // Use admin client to bypass RLS for public submissions
    const supabase = supabaseAdmin

    // Insert the data into the early_users table
    const { data, error } = await supabase
      .from('early_users')
      .insert({
        email,
        feedback,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        timestamp: timestamp || new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Error inserting early user:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully',
      data,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    // Fetch all early users (you might want to add pagination later)
    const { data, error } = await supabase
      .from('early_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching early users:', error)
      return NextResponse.json({ error: 'Failed to fetch early users' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
