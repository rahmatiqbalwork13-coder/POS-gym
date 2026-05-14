import { requireRole } from '@/lib/dal'
import { StockClient } from './StockClient'

export default async function StockPage() {
  await requireRole('superadmin', 'admin', 'staff')
  return <StockClient />
}
