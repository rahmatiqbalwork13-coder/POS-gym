import { requireRole } from '@/lib/dal'
import { TransactionsClient } from './TransactionsClient'

export default async function TransactionsPage() {
  await requireRole('superadmin', 'admin', 'ketua', 'staff')
  return <TransactionsClient />
}
