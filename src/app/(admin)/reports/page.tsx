import { requireRole } from '@/lib/dal'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  await requireRole('admin', 'ketua')
  return <ReportsClient />
}
