import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SessionUser, Role } from '@/types'

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email!,
    role: profile.role as Role,
    full_name: profile.full_name,
  }
})

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect('/dashboard')
  return user
}
