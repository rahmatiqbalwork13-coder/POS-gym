import { requireAuth } from '@/lib/dal'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-background pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
