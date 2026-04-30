import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'

  const query = isAdmin
    ? supabase.from('items').select('*').order('name')
    : supabase.from('items').select('id, name, selling_price, stock').order('name')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, purchase_price, selling_price, stock } = body

  if (!name || purchase_price == null || selling_price == null || stock == null) {
    return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 })
  }
  if (Number(selling_price) <= Number(purchase_price)) {
    return NextResponse.json({ error: 'Harga jual harus lebih besar dari harga beli.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('items')
    .insert({ name, purchase_price, selling_price, stock })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, name, purchase_price, selling_price, stock } = body

  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })
  if (Number(selling_price) <= Number(purchase_price)) {
    return NextResponse.json({ error: 'Harga jual harus lebih besar dari harga beli.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('items')
    .update({ name, purchase_price, selling_price, stock })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
