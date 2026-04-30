import { requireRole } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  await requireRole('admin', 'ketua')
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const from = `${year}-${month}-01`
  const to = `${year}-${month}-31`

  const { data } = await supabase
    .from('profit_distributions')
    .select('laba_kotor_total, shu_50, dana_30, opr_20')
    .gte('created_at', from)
    .lte('created_at', `${to}T23:59:59`)

  const summary = (data ?? []).reduce(
    (acc, row) => ({
      laba_kotor_total: acc.laba_kotor_total + row.laba_kotor_total,
      shu_50: acc.shu_50 + row.shu_50,
      dana_30: acc.dana_30 + row.dana_30,
      opr_20: acc.opr_20 + row.opr_20,
    }),
    { laba_kotor_total: 0, shu_50: 0, dana_30: 0, opr_20: 0 }
  )

  return <DashboardClient initialSummary={summary} initialYear={year} initialMonth={now.getMonth() + 1} />
}
