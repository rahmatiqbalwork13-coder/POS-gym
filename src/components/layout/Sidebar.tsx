'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import type { Role } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'ketua'] },
  { label: 'Kasir', href: '/cashier', icon: ShoppingCart, roles: ['admin', 'ketua', 'staff'] },
  { label: 'Stok Barang', href: '/items', icon: Package, roles: ['admin'] },
  { label: 'Laporan', href: '/reports', icon: BarChart3, roles: ['admin', 'ketua'] },
  { label: 'Pengguna', href: '/users', icon: Users, roles: ['admin'] },
]

interface SidebarProps {
  role: Role
  fullName: string | null
}

export function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname()

  const visible = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-border">
        <p className="font-semibold text-sm text-sidebar-foreground">Koperasi Gym</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{fullName ?? 'Pengguna'}</p>
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mt-1 capitalize">
          {role}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 pb-4">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Keluar
          </button>
        </form>
      </div>
    </aside>
  )
}
