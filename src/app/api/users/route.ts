import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serviceClient = await createServiceClient()
  const { data: profiles, error } = await serviceClient
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get emails from auth.users via admin API
  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers()
  const withEmail = profiles?.map(p => ({
    ...p,
    email: authUsers.find(u => u.id === p.id)?.email ?? '',
    active: !authUsers.find(u => u.id === p.id)?.banned_until,
  })) ?? []

  return NextResponse.json(withEmail)
}

export async function POST(request: NextRequest) {
  const requester = await verifyAdmin()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, role } = await request.json()
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 })
  }

  const validRoles: Role[] = ['admin', 'ketua', 'staff']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { data: { user }, error: createErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr || !user) {
    return NextResponse.json({ error: createErr?.message ?? 'Gagal membuat user.' }, { status: 500 })
  }

  await serviceClient.from('profiles').upsert({ id: user.id, full_name, role })

  return NextResponse.json({ id: user.id }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const requester = await verifyAdmin()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, full_name, role } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })

  // Prevent admin from changing their own role
  if (id === requester.id) {
    return NextResponse.json({ error: 'Tidak dapat mengubah role sendiri.' }, { status: 400 })
  }

  const validRoles: Role[] = ['admin', 'ketua', 'staff']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient
    .from('profiles')
    .update({ full_name, role })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const requester = await verifyAdmin()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })
  if (id === requester.id) {
    return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.updateUserById(id, {
    ban_duration: 'none',
    // Use ban to deactivate — for permanent deactivation use 876600h
  })

  // Actually ban the user (876600h ≈ 100 years)
  await serviceClient.auth.admin.updateUserById(id, { ban_duration: '876600h' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
