import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { CartItem } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { items: CartItem[] }
  const { items } = body

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
