import { requireRole } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  await requireRole('superadmin', 'admin', 'ketua')
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = String(month).padStart(2, '0')
  
  // Current month range
  const currentFrom = `${year}-${monthStr}-01`
  const currentTo = `${year}-${monthStr}-31`
  
  // Previous month range
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevMonthStr = String(prevMonth).padStart(2, '0')
  const prevFrom = `${prevYear}-${prevMonthStr}-01`
  const prevTo = `${prevYear}-${prevMonthStr}-31`

  // Get current month transactions
  const { data: currentTransactions } = await supabase
    .from('transactions')
    .select('id, total_amount, total_laba_kotor, created_at')
    .gte('created_at', currentFrom)
    .lte('created_at', `${currentTo}T23:59:59`)

  // Get previous month transactions for comparison
  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('id, total_amount, total_laba_kotor, created_at')
    .gte('created_at', prevFrom)
    .lte('created_at', `${prevTo}T23:59:59`)

  // Get profit distributions
  const { data: profitData } = await supabase
    .from('profit_distributions')
    .select('laba_kotor_total, shu_50, dana_30, opr_20')
    .gte('created_at', currentFrom)
    .lte('created_at', `${currentTo}T23:59:59`)

  // Get top products
  const { data: topProducts } = await supabase
    .from('transaction_items')
    .select('qty, selling_price_at_time, items(name)')
    .gte('created_at', currentFrom)
    .lte('created_at', `${currentTo}T23:59:59`)
    .order('qty', { ascending: false })
    .limit(5)

  // Get recent transactions
  const { data: recentTrans } = await supabase
    .from('transactions')
    .select('id, total_amount, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate current month metrics
  const currentTotalPendapatan = currentTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
  const currentLabaKotor = currentTransactions?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0
  const currentJumlahTransaksi = currentTransactions?.length || 0
  const rataRataTicket = currentJumlahTransaksi > 0 ? currentTotalPendapatan / currentJumlahTransaksi : 0

  // Calculate previous month metrics for comparison
  const prevTotalPendapatan = prevTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
  const prevLabaKotor = prevTransactions?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0
  const prevJumlahTransaksi = prevTransactions?.length || 0

  // Calculate percentage changes (handle division by zero)
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const comparisons = {
    pendapatan: calculateChange(currentTotalPendapatan, prevTotalPendapatan),
    laba: calculateChange(currentLabaKotor, prevLabaKotor),
    transaksi: calculateChange(currentJumlahTransaksi, prevJumlahTransaksi),
    prevPendapatan: prevTotalPendapatan,
    prevLaba: prevLabaKotor,
    prevTransaksi: prevJumlahTransaksi,
  }

  const profitSummary = (profitData ?? []).reduce(
    (acc, row) => ({
      laba_kotor_total: acc.laba_kotor_total + row.laba_kotor_total,
      shu_50: acc.shu_50 + row.shu_50,
      dana_30: acc.dana_30 + row.dana_30,
      opr_20: acc.opr_20 + row.opr_20,
    }),
    { laba_kotor_total: 0, shu_50: 0, dana_30: 0, opr_20: 0 }
  )

  // Get last 6 months data for chart
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = MONTHS[d.getMonth()]
    
    const { data: monthTrans } = await supabase
      .from('transactions')
      .select('total_amount, total_laba_kotor')
      .gte('created_at', `${mStr}-01`)
      .lte('created_at', `${mStr}-31T23:59:59`)
    
    monthlyData.push({
      month: monthLabel,
      pendapatan: monthTrans?.reduce((sum, t) => sum + t.total_amount, 0) || 0,
      laba: monthTrans?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0,
    })
  }

  const initialData = {
    totalPendapatan: currentTotalPendapatan,
    labaKotor: currentLabaKotor,
    jumlahTransaksi: currentJumlahTransaksi,
    rataRataTicket,
    pendapatanBulanan: monthlyData,
    distribusiLaba: profitSummary,
    produkTerlaris: (topProducts || []).map((p: any) => ({
      name: p.items?.name || '-',
      qty: p.qty,
      total: p.qty * p.selling_price_at_time
    })),
    aktivitasTerbaru: (recentTrans || []).map((t: any) => ({
      id: t.id.slice(0, 8).toUpperCase(),
      type: 'TRX',
      description: t.profiles?.full_name || 'Administrator',
      amount: t.total_amount,
      time: new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    })),
    comparisons
  }

  return <DashboardClient initialData={initialData} initialYear={year} initialMonth={month} />
}
