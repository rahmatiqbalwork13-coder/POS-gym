import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdminOrSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' || profile?.role === 'superadmin' ? user : null
}

// POST /api/stock/adjust - Adjust stock (in/out)
export async function POST(request: NextRequest) {
  const user = await verifyAdminOrSuperadmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { item_id, quantity, type, reason } = body

  if (!item_id || !quantity || !type) {
    return NextResponse.json({ error: 'Item ID, quantity, dan type wajib diisi.' }, { status: 400 })
  }

  if (type !== 'in' && type !== 'out') {
    return NextResponse.json({ error: 'Type harus "in" atau "out".' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Get current stock
  const { data: item, error: itemError } = await serviceClient
    .from('items')
    .select('id, name, stock')
    .eq('id', item_id)
    .single()

  if (itemError || !item) {
    return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 })
  }

  // Validate stock for 'out' type
  if (type === 'out' && item.stock < quantity) {
    return NextResponse.json({ error: 'Stok tidak mencukupi.' }, { status: 400 })
  }

  // Calculate new stock
  const newStock = type === 'in' ? item.stock + quantity : item.stock - quantity

  // Update item stock
  const { error: updateError } = await serviceClient
    .from('items')
    .update({ stock: newStock })
    .eq('id', item_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Record history - check if table exists first
  try {
    const { error: historyError } = await serviceClient
      .from('stock_history')
      .insert({
        item_id,
        item_name: item.name,
        type,
        quantity,
        reason: reason || (type === 'in' ? 'Penambahan stok' : 'Pengurangan stok'),
        created_by: user.id
      })
    
    if (historyError) {
      console.log('Stock history not recorded:', historyError.message)
      // Don't fail the request if history fails
    }
  } catch (err) {
    console.log('Stock history table may not exist')
  }

  return NextResponse.json({ 
    success: true, 
    item_id, 
    previous_stock: item.stock,
    new_stock: newStock,
    type,
    quantity 
  })
}
