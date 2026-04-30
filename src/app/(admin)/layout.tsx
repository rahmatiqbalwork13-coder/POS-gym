import { requireAuth } from '@/lib/dal'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} fullName={user.full_name} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
