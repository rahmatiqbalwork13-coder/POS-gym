import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

const ADMIN_ROLES: Role[] = ['admin', 'superadmin']

// PATCH /api/users — superadmin changes any user's password (including own)
export async function PATCH(request: NextRequest) {
  const requester = await verifyAccess()
  if (!requester || requester.role !== 'superadmin') {
    return NextResponse.json({ error: 'Hanya superadmin yang dapat mengganti password.' }, { status: 403 })
  }

  const { id, password } = await request.json()
  if (!id || !password) {
    return NextResponse.json({ error: 'ID dan password wajib diisi.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.auth.admin.updateUserById(id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

async function verifyAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role as Role | undefined
  if (!role || !ADMIN_ROLES.includes(role)) return null
  return { id: user.id, role }
}

export async function GET() {
  const requester = await verifyAccess()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serviceClient = await createServiceClient()
  const { data: profiles, error } = await serviceClient
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers()
  const withEmail = profiles?.map(p => ({
    ...p,
    email: authUsers.find(u => u.id === p.id)?.email ?? '',
    active: !authUsers.find(u => u.id === p.id)?.banned_until,
  })) ?? []

  return NextResponse.json(withEmail)
}

export async function POST(request: NextRequest) {
  const requester = await verifyAccess()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, role } = await request.json()
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 })
  }

  // Only superadmin can create other superadmins
  const allowedRoles: Role[] = requester.role === 'superadmin'
    ? ['superadmin', 'admin', 'ketua', 'staff']
    : ['admin', 'ketua', 'staff']

  if (!allowedRoles.includes(role)) {
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
  const requester = await verifyAccess()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, full_name, role } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })

  if (id === requester.id) {
    return NextResponse.json({ error: 'Tidak dapat mengubah role sendiri.' }, { status: 400 })
  }

  const allowedRoles: Role[] = requester.role === 'superadmin'
    ? ['superadmin', 'admin', 'ketua', 'staff']
    : ['admin', 'ketua', 'staff']

  if (role && !allowedRoles.includes(role)) {
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
  const requester = await verifyAccess()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const permanent = searchParams.get('permanent') === 'true'

  if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })
  if (id === requester.id) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri.' }, { status: 400 })
  }

  // Only superadmin can permanently delete
  if (permanent && requester.role !== 'superadmin') {
    return NextResponse.json({ error: 'Hanya superadmin yang dapat menghapus permanen.' }, { status: 403 })
  }

  const serviceClient = await createServiceClient()

  if (permanent) {
    const { error } = await serviceClient.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Soft ban ≈ 100 years
    const { error } = await serviceClient.auth.admin.updateUserById(id, { ban_duration: '876600h' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
