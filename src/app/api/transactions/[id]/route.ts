import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const serviceClient = await createServiceClient()

  // Get user's role
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Build query - staff can only see their own transactions
  const filters: { id: string; cashier_id?: string } = { id }
  if (profile?.role === 'staff') {
    filters.cashier_id = user.id
  }

  const { data: transaction, error } = await serviceClient
    .from('transactions')
    .select(`
      *,
      profiles:profiles!transactions_cashier_id_fkey(full_name),
      transaction_items(
        *,
        items(name)
      )
    `)
    .match(filters)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json(transaction)
}
