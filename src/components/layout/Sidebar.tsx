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
  Dumbbell,
  ClipboardList,
  Wallet
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
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'ketua'] },
  { label: 'Kasir', href: '/cashier', icon: ShoppingCart, roles: ['superadmin', 'admin', 'ketua', 'staff'] },
  { label: 'Produk', href: '/items', icon: Package, roles: ['superadmin', 'admin'] },
  { label: 'Stoking', href: '/stock', icon: ClipboardList, roles: ['superadmin', 'admin'] },
  { label: 'Transaksi', href: '/transactions', icon: Wallet, roles: ['superadmin', 'admin', 'ketua'] },
  { label: 'Laporan', href: '/reports', icon: BarChart3, roles: ['superadmin', 'admin', 'ketua'] },
  { label: 'Pengguna', href: '/users', icon: Users, roles: ['superadmin', 'admin'] },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r border-border/50 bg-card/80 backdrop-blur-xl h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">GYMPOS</h1>
          <p className="text-[10px] text-muted-foreground -mt-0.5">Koperasi Gym</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">Administrator</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">ADMINISTRATOR</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 group relative overflow-hidden',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
              )}
              
              <Icon className={cn(
                "w-5 h-5 shrink-0 transition-transform duration-200",
                active ? "scale-110" : "group-hover:scale-105"
              )} />
              <span>{item.label}</span>
              
              {/* Hover glow effect */}
              {!active && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 
                              opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-border/50">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm 
                     text-muted-foreground hover:text-destructive hover:bg-destructive/10 
                     transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
            <span>Keluar</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
