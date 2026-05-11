import { requireRole } from '@/lib/dal'
import { UsersClient } from './UsersClient'

export default async function UsersPage() {
  await requireRole('superadmin', 'admin')
  return <UsersClient />
}
