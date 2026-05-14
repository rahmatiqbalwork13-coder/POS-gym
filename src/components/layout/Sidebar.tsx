'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  LogOut,
  Dumbbell,
  ClipboardList,
  Wallet,
  Menu,
  X,
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
  { label: 'Dashboard',  href: '/dashboard',    icon: LayoutDashboard, roles: ['superadmin', 'admin', 'ketua'] },
  { label: 'Kasir',      href: '/cashier',      icon: ShoppingCart,    roles: ['superadmin', 'admin', 'ketua', 'staff'] },
  { label: 'Produk',     href: '/items',        icon: Package,         roles: ['superadmin', 'admin', 'staff'] },
  { label: 'Stoking',    href: '/stock',        icon: ClipboardList,   roles: ['superadmin', 'admin', 'staff'] },
  { label: 'Transaksi',  href: '/transactions', icon: Wallet,          roles: ['superadmin', 'admin', 'ketua', 'staff'] },
  { label: 'Laporan',    href: '/reports',      icon: BarChart3,       roles: ['superadmin', 'admin', 'ketua'] },
  { label: 'Pengguna',   href: '/users',        icon: Users,           roles: ['superadmin', 'admin'] },
]

interface SidebarProps {
  role: Role
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) setIsCollapsed(saved === 'true')
  }, [])

  const toggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const closeSidebar = () => setIsOpen(false)

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <>
      {/* ── Mobile top-bar ─────────────────────────────────────────────
          z-[60]: must stay above the sliding sidebar (z-[55]) and
          overlay (z-[50]) so the hamburger is always pressable.     */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-[60] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-sidebar-foreground">GYMPOS</h1>
            <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5">Koperasi Gym</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {isOpen
            ? <X className="w-6 h-6 text-sidebar-foreground" />
            : <Menu className="w-6 h-6 text-sidebar-foreground" />}
        </button>
      </header>

      {/* ── Mobile backdrop ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[50]"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────
          Mobile : fixed overlay (z-[55]), slides in from the left.
                   Explicit w-72 so -translate-x-full is predictable.
          Desktop: relative flex item (z-auto), no translate needed.
          No `sticky` class — that was conflicting with `fixed` on
          mobile and causing the header button to be unreachable.    */}
      <aside
        className={cn(
          'flex flex-col h-screen border-r bg-sidebar border-sidebar-border',
          'transition-all duration-300 ease-in-out shrink-0',
          // Mobile
          'fixed left-0 top-0 z-[55] w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop overrides
          'lg:relative lg:top-auto lg:translate-x-0 lg:z-auto',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
        )}
      >
        {/* Logo row + desktop collapse toggle */}
        <div className={cn(
          'flex items-center h-16 border-b border-sidebar-border shrink-0 transition-all duration-300',
          isCollapsed ? 'lg:justify-center lg:px-2' : 'lg:gap-3 lg:px-4',
          'gap-3 px-4',
        )}>
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
            title={isCollapsed ? 'Perluas menu' : 'Ciutkan menu'}
          >
            {isCollapsed
              ? <Menu className="w-5 h-5 text-sidebar-foreground/70" />
              : <X className="w-5 h-5 text-sidebar-foreground/70" />}
          </button>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shadow-lg shrink-0">
            <Dumbbell className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>

          <div className={cn('overflow-hidden flex-1 transition-all duration-300', isCollapsed && 'lg:hidden')}>
            <h1 className="font-bold text-lg tracking-tight whitespace-nowrap text-sidebar-foreground">GYMPOS</h1>
            <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5 whitespace-nowrap">Koperasi Gym</p>
          </div>
        </div>

        {/* Mobile close row */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-sidebar-border shrink-0">
          <span className="text-xs text-sidebar-foreground/50 uppercase tracking-wider">Menu</span>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-4 h-4 text-sidebar-foreground/70" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleItems.map(item => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl',
                  'transition-all duration-200 group relative overflow-hidden',
                  isCollapsed && 'lg:justify-center lg:px-2',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                    : 'text-sidebar-foreground/75 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent',
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-ring rounded-full" />
                )}
                <Icon className={cn(
                  'w-5 h-5 shrink-0 transition-transform duration-200',
                  active ? 'scale-110' : 'group-hover:scale-105',
                )} />
                <span className={cn('whitespace-nowrap', isCollapsed && 'lg:hidden')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-sidebar-border shrink-0">
          <form action={logout}>
            <button
              type="submit"
              title={isCollapsed ? 'Keluar' : undefined}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-sm rounded-xl',
                'transition-all duration-200 group',
                'text-sidebar-foreground/60 hover:text-red-300 hover:bg-red-500/15',
                isCollapsed && 'lg:justify-center',
              )}
            >
              <LogOut className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
              <span className={cn('whitespace-nowrap', isCollapsed && 'lg:hidden')}>Keluar</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
