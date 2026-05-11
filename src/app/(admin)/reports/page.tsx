import { requireRole } from '@/lib/dal'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  await requireRole('superadmin', 'admin', 'ketua')
  return <ReportsClient />
}
