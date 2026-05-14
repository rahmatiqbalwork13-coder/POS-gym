import { requireAuth } from '@/lib/dal'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} />
      <main className="flex-1 overflow-y-auto bg-background pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
