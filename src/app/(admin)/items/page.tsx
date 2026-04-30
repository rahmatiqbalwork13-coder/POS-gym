import { requireRole } from '@/lib/dal'
import { ItemsClient } from './ItemsClient'

export default async function ItemsPage() {
  await requireRole('admin')
  return <ItemsClient />
}
