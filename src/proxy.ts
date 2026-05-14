import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/login']

// Route → which roles are allowed (all others get redirected)
const ROUTE_ROLES: { prefix: string; allowed: string[] }[] = [
  { prefix: '/users',        allowed: ['superadmin', 'admin'] },
  { prefix: '/items',        allowed: ['superadmin', 'admin', 'staff'] },
  { prefix: '/stock',        allowed: ['superadmin', 'admin', 'staff'] },
  { prefix: '/transactions', allowed: ['superadmin', 'admin', 'ketua', 'staff'] },
  { prefix: '/reports',      allowed: ['superadmin', 'admin', 'ketua'] },
  { prefix: '/dashboard',    allowed: ['superadmin', 'admin', 'ketua'] },
  { prefix: '/cashier',      allowed: ['superadmin', 'admin', 'ketua', 'staff'] },
]

function redirectFor(role: string): string {
  if (role === 'staff') return '/cashier'
  return '/dashboard'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile?.role ?? 'staff') as string

    const matchedRoute = ROUTE_ROLES.find(r => pathname.startsWith(r.prefix))
    if (matchedRoute && !matchedRoute.allowed.includes(role)) {
      return NextResponse.redirect(new URL(redirectFor(role), request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
