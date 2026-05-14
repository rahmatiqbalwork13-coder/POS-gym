import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['superadmin', 'admin', 'staff']

async function verifyAdminOrSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role && ALLOWED_ROLES.includes(profile.role) ? user : null
}

// GET /api/stock/history - Get stock adjustment history
export async function GET(request: NextRequest) {
  const user = await verifyAdminOrSuperadmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serviceClient = await createServiceClient()

  try {
    const { data, error } = await serviceClient
      .from('stock_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Error fetching stock history:', err)
    return NextResponse.json([])
  }
}
