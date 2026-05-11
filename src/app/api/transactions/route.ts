import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { CartItem, Role } from '@/types'

// Helper to check if user is superadmin
async function isSuperadmin(serviceClient: Awaited<ReturnType<typeof createServiceClient>>, userId: string): Promise<boolean> {
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return profile?.role === 'superadmin'
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const serviceClient = await createServiceClient()

  // Get user's role
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Build query
  let query = serviceClient
    .from('transactions')
    .select(`
      *,
      profiles:profiles!transactions_cashier_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  // Staff can only see their own transactions
  if (profile?.role === 'staff') {
    query = query.eq('cashier_id', user.id)
  }

  const { data: transactions, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data transaksi.' }, { status: 500 })
  }

  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { items: CartItem[]; payment_method: 'cash' | 'transfer'; amount_paid?: number }
  const { items, payment_method = 'cash', amount_paid } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Keranjang kosong.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Fetch current stock for all items to validate
  const itemIds = items.map(c => c.item.id)
  const { data: dbItems, error: fetchErr } = await serviceClient
    .from('items')
    .select('id, name, purchase_price, selling_price, stock')
    .in('id', itemIds)

  if (fetchErr || !dbItems) {
    return NextResponse.json({ error: 'Gagal memvalidasi stok.' }, { status: 500 })
  }

  // Validate stock and build line items
  let totalAmount = 0
  let totalLabaKotor = 0
  const transactionItems = []

  for (const cartItem of items) {
    const db = dbItems.find(d => d.id === cartItem.item.id)
    if (!db) {
      return NextResponse.json({ error: `Barang ${cartItem.item.name} tidak ditemukan.` }, { status: 400 })
    }
    if (db.stock < cartItem.qty) {
      return NextResponse.json({ error: `Stok ${db.name} tidak mencukupi (tersedia: ${db.stock}).` }, { status: 400 })
    }

    const lineTotal = db.selling_price * cartItem.qty
    const lineLaba = (db.selling_price - db.purchase_price) * cartItem.qty
    totalAmount += lineTotal
    totalLabaKotor += lineLaba

    transactionItems.push({
      item_id: db.id,
      qty: cartItem.qty,
      purchase_price_at_time: db.purchase_price,
      selling_price_at_time: db.selling_price,
      laba_kotor_line: lineLaba,
    })
  }

  // Insert transaction header (trigger auto-inserts profit_distributions)
  const { data: txn, error: txnErr } = await serviceClient
    .from('transactions')
    .insert({
      cashier_id: user.id,
      total_amount: totalAmount,
      total_laba_kotor: totalLabaKotor,
      payment_method: payment_method,
      amount_paid: amount_paid,
    })
    .select('id')
    .single()

  if (txnErr || !txn) {
    return NextResponse.json({ error: 'Gagal menyimpan transaksi.' }, { status: 500 })
  }

  // Insert transaction items
  const { error: itemsErr } = await serviceClient
    .from('transaction_items')
    .insert(transactionItems.map(ti => ({ ...ti, transaction_id: txn.id })))

  if (itemsErr) {
    return NextResponse.json({ error: 'Gagal menyimpan detail transaksi.' }, { status: 500 })
  }

  // Decrement stock for each item
  for (const cartItem of items) {
    await serviceClient.rpc('decrement_stock', {
      p_item_id: cartItem.item.id,
      p_qty: cartItem.qty,
    })
  }

  return NextResponse.json({ transactionId: txn.id, totalAmount }, { status: 201 })
}

// DELETE - Only superadmin can delete transactions
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // Check if user is superadmin
  const superadmin = await isSuperadmin(serviceClient, user.id)
  if (!superadmin) {
    return NextResponse.json({ error: 'Hanya superadmin yang dapat menghapus transaksi.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID transaksi diperlukan.' }, { status: 400 })
  }

  // Get transaction items first to restore stock
  const { data: txItems } = await serviceClient
    .from('transaction_items')
    .select('item_id, qty')
    .eq('transaction_id', id)

  // Delete transaction (cascade will delete transaction_items and profit_distributions)
  const { error } = await serviceClient
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus transaksi.' }, { status: 500 })
  }

  // Restore stock for each item
  if (txItems && txItems.length > 0) {
    for (const item of txItems) {
      await serviceClient.rpc('increment_stock', {
        p_item_id: item.item_id,
        p_qty: item.qty,
      })
    }
  }

  return NextResponse.json({ success: true })
}

// PUT - Only superadmin can edit transactions
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // Check if user is superadmin
  const superadmin = await isSuperadmin(serviceClient, user.id)
  if (!superadmin) {
    return NextResponse.json({ error: 'Hanya superadmin yang dapat mengedit transaksi.' }, { status: 403 })
  }

  const body = await request.json() as {
    id: string
    payment_method?: 'cash' | 'transfer'
    amount_paid?: number
  }
  const { id, payment_method, amount_paid } = body

  if (!id) {
    return NextResponse.json({ error: 'ID transaksi diperlukan.' }, { status: 400 })
  }

  // Get current transaction to calculate change
  const { data: currentTx } = await serviceClient
    .from('transactions')
    .select('total_amount')
    .eq('id', id)
    .single()

  if (!currentTx) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 })
  }

  // Build update object
  const updateData: {
    payment_method?: 'cash' | 'transfer'
    amount_paid?: number
    change_amount?: number
  } = {}

  if (payment_method !== undefined) {
    updateData.payment_method = payment_method
  }

  if (amount_paid !== undefined) {
    updateData.amount_paid = amount_paid
    // Recalculate change
    updateData.change_amount = amount_paid > 0 ? amount_paid - currentTx.total_amount : 0
  }

  // Update transaction
  const { data: updated, error } = await serviceClient
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Gagal mengupdate transaksi.' }, { status: 500 })
  }

  return NextResponse.json(updated)
}
