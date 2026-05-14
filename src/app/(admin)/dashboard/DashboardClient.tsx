'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Receipt, 
  Calendar,
  Download,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProfitSummary } from '@/types'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

const formatCompactNumber = (n: number) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'M'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'rb'
  return n.toString()
}

interface DashboardData {
  totalPendapatan: number
  labaKotor: number
  jumlahTransaksi: number
  rataRataTicket: number
  pendapatanBulanan: { month: string; pendapatan: number; laba: number }[]
  distribusiLaba: ProfitSummary
  produkTerlaris: { name: string; qty: number; total: number }[]
  aktivitasTerbaru: { id: string; type: string; description: string; amount: number; time: string }[]
  comparisons: {
    pendapatan: number
    laba: number
    transaksi: number
    prevPendapatan: number
    prevLaba: number
    prevTransaksi: number
  }
}

interface StatCardProps { 
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  variant?: 'default' | 'primary' | 'secondary'
}

function StatCard({ label, value, sub, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    primary: 'border-[hsl(224_68%_40%)]/30 bg-[hsl(224_68%_40%)]/5',
    secondary: 'border-[hsl(44_96%_52%)]/30 bg-[hsl(44_96%_52%)]/10',
  }

  const iconBgStyles = {
    default: 'bg-muted',
    primary: 'bg-[hsl(224_68%_40%)]/10',
    secondary: 'bg-[hsl(44_96%_52%)]/20',
  }

  const textStyles = {
    default: 'text-foreground',
    primary: 'text-[hsl(224_68%_40%)]',
    secondary: 'text-[hsl(44_96%_38%)]',
  }

  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${textStyles[variant]}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-xl ${iconBgStyles[variant]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

// Simple Bar Chart Component
function BarChart({ data }: { data: { label: string; value1: number; value2: number }[] }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.value1, d.value2)), 1)
  
  return (
    <div className="h-48 flex items-end justify-between gap-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center gap-1 h-36">
            <div 
              className="w-3 bg-[hsl(224_68%_40%)] rounded-t"
              style={{ height: `${(item.value1 / maxValue) * 100}%` }}
            />
            <div 
              className="w-3 bg-[hsl(44_96%_52%)] rounded-t"
              style={{ height: `${(item.value2 / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Progress Bar Component
function ProgressBar({ value, max, colorClass = 'bg-[hsl(44_96%_52%)]' }: { value: number; max: number; colorClass?: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

interface Props {
  initialData: DashboardData
  initialYear: number
  initialMonth: number
}

export function DashboardClient({ initialData, initialYear, initialMonth }: Props) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchData = async (y: number, m: number) => {
    setLoading(true)
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const to = `${y}-${String(m).padStart(2, '0')}-31`
    
    // Previous month for comparison
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    const prevFrom = `${prevY}-${String(prevM).padStart(2, '0')}-01`
    const prevTo = `${prevY}-${String(prevM).padStart(2, '0')}-31`

    try {
      // Get current month transactions
      const { data: currentTransactions } = await supabase
        .from('transactions')
        .select('id, total_amount, total_laba_kotor, created_at')
        .gte('created_at', from)
        .lte('created_at', `${to}T23:59:59`)

      // Get previous month transactions
      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('id, total_amount, total_laba_kotor, created_at')
        .gte('created_at', prevFrom)
        .lte('created_at', `${prevTo}T23:59:59`)

      // Get profit distributions
      const { data: profitData } = await supabase
        .from('profit_distributions')
        .select('laba_kotor_total, shu_50, dana_30, opr_20')
        .gte('created_at', from)
        .lte('created_at', `${to}T23:59:59`)

      // Get top products
      const { data: topProducts } = await supabase
        .from('transaction_items')
        .select('qty, selling_price_at_time, items(name)')
        .gte('created_at', from)
        .lte('created_at', `${to}T23:59:59`)
        .order('qty', { ascending: false })
        .limit(5)

      // Get recent transactions
      const { data: recentTrans } = await supabase
        .from('transactions')
        .select('id, total_amount, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Calculate current month metrics
      const totalPendapatan = currentTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
      const labaKotor = currentTransactions?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0
      const jumlahTransaksi = currentTransactions?.length || 0
      const rataRataTicket = jumlahTransaksi > 0 ? totalPendapatan / jumlahTransaksi : 0

      // Calculate previous month metrics
      const prevTotalPendapatan = prevTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
      const prevLabaKotor = prevTransactions?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0
      const prevJumlahTransaksi = prevTransactions?.length || 0

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
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
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1)
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = MONTHS[d.getMonth()].slice(0, 3)
        
        const { data: monthTrans } = await supabase
          .from('transactions')
          .select('total_amount, total_laba_kotor')
          .gte('created_at', `${monthStr}-01`)
          .lte('created_at', `${monthStr}-31T23:59:59`)
        
        monthlyData.push({
          month: monthLabel,
          pendapatan: monthTrans?.reduce((sum, t) => sum + t.total_amount, 0) || 0,
          laba: monthTrans?.reduce((sum, t) => sum + (t.total_laba_kotor || 0), 0) || 0,
        })
      }

      setData({
        totalPendapatan,
        labaKotor,
        jumlahTransaksi,
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
        comparisons: {
          pendapatan: calculateChange(totalPendapatan, prevTotalPendapatan),
          laba: calculateChange(labaKotor, prevLabaKotor),
          transaksi: calculateChange(jumlahTransaksi, prevJumlahTransaksi),
          prevPendapatan: prevTotalPendapatan,
          prevLaba: prevLabaKotor,
          prevTransaksi: prevJumlahTransaksi,
        }
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
    setLoading(false)
  }

  const handleFilter = (y: number, m: number) => {
    setYear(y); setMonth(m)
    fetchData(y, m)
  }

  const years = Array.from({ length: 5 }, (_, i) => initialYear - i)

  const chartData = data.pendapatanBulanan.map(d => ({
    label: d.month,
    value1: d.pendapatan,
    value2: d.laba
  }))

  // Calculate margin laba
  const marginLaba = data.totalPendapatan > 0 ? (data.labaKotor / data.totalPendapatan) * 100 : 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-[hsl(224_68%_40%)]" />
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Ringkasan data & performa koperasi</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
            <select
              value={month}
              onChange={e => handleFilter(year, Number(e.target.value))}
              className="h-8 px-3 text-sm bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-border" />
            <select
              value={year}
              onChange={e => handleFilter(Number(e.target.value), month)}
              className="h-8 px-3 text-sm bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 border-[hsl(224_68%_40%)]/30 hover:bg-[hsl(224_68%_40%)]/5 hover:border-[hsl(224_68%_40%)]"
          >
            <Download className="w-4 h-4 text-[hsl(224_68%_40%)]" />
            Ekspor
          </Button>
        </div>
      </div>

      {/* Period Info */}
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-[hsl(224_68%_40%)]" />
        <span className="text-muted-foreground uppercase text-xs font-medium">Periode</span>
        <span className="font-medium">{MONTHS[month - 1]} {year}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(224_68%_40%)]"></div>
          <span className="ml-3 text-sm text-muted-foreground">Memuat data...</span>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Pendapatan"
              value={currency(data.totalPendapatan)}
              sub={`vs ${MONTHS[month === 1 ? 11 : month - 2]?.slice(0, 3) || 'Bln'}: ${formatCompactNumber(data.comparisons.prevPendapatan)}`}
              icon={<TrendingUp className="w-5 h-5 text-[hsl(224_68%_40%)]" />}
              trend={{ value: data.comparisons.pendapatan, isPositive: data.comparisons.pendapatan >= 0 }}
              variant="primary"
            />
            <StatCard
              label="Laba Kotor"
              value={currency(data.labaKotor)}
              sub={`margin: ${marginLaba.toFixed(1)}%`}
              icon={<Wallet className="w-5 h-5 text-[hsl(44_96%_38%)]" />}
              trend={{ value: data.comparisons.laba, isPositive: data.comparisons.laba >= 0 }}
              variant="secondary"
            />
            <StatCard
              label="Transaksi"
              value={`${data.jumlahTransaksi}x`}
              sub={`${data.comparisons.prevTransaksi} transaksi bulan lalu`}
              icon={<Receipt className="w-5 h-5 text-[hsl(224_68%_40%)]" />}
              trend={{ value: data.comparisons.transaksi, isPositive: data.comparisons.transaksi >= 0 }}
              variant="primary"
            />
            <StatCard
              label="Rata-rata Ticket"
              value={currency(data.rataRataTicket)}
              sub="per transaksi"
              icon={<ShoppingCart className="w-5 h-5 text-muted-foreground" />}
            />
          </div>

          {/* Charts & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pendapatan & Laba Chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-medium">Pendapatan & Laba — 6 Bulan</h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[hsl(224_68%_40%)] rounded" />
                    <span className="text-muted-foreground">Pendapatan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[hsl(44_96%_52%)] rounded" />
                    <span className="text-muted-foreground">Laba</span>
                  </div>
                </div>
              </div>
              <BarChart data={chartData} />
            </div>

            {/* Distribusi Laba */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Distribusi Laba</h3>
                <span className="text-xs text-[hsl(224_68%_40%)] font-medium">SHU 50 / 30 / 20</span>
              </div>
              <div className="space-y-4">
                {/* SHU Anggota */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SHU Anggota</span>
                    <span className="text-xs text-muted-foreground">50%</span>
                  </div>
                  <ProgressBar value={data.distribusiLaba.shu_50} max={data.distribusiLaba.laba_kotor_total} colorClass="bg-[hsl(44_96%_52%)]" />
                  <p className="text-sm font-semibold text-[hsl(44_96%_38%)]">{currency(data.distribusiLaba.shu_50)}</p>
                </div>

                {/* Dana Cadangan */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dana Cadangan</span>
                    <span className="text-xs text-muted-foreground">30%</span>
                  </div>
                  <ProgressBar value={data.distribusiLaba.dana_30} max={data.distribusiLaba.laba_kotor_total} colorClass="bg-[hsl(224_68%_40%)]" />
                  <p className="text-sm font-semibold text-[hsl(224_68%_40%)]">{currency(data.distribusiLaba.dana_30)}</p>
                </div>

                {/* Operasional */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Operasional</span>
                    <span className="text-xs text-muted-foreground">20%</span>
                  </div>
                  <ProgressBar value={data.distribusiLaba.opr_20} max={data.distribusiLaba.laba_kotor_total} colorClass="bg-muted-foreground" />
                  <p className="text-sm font-semibold">{currency(data.distribusiLaba.opr_20)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Produk Terlaris & Aktivitas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produk Terlaris */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Produk Terlaris Bulan Ini</h3>
                <button className="text-xs text-[hsl(224_68%_40%)] hover:text-[hsl(224_68%_25%)] font-medium">Lihat semua</button>
              </div>
              <div className="space-y-3">
                {data.produkTerlaris.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada data penjualan</p>
                ) : (
                  data.produkTerlaris.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[hsl(224_68%_40%)] font-semibold w-5">{String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.qty}x terjual</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[hsl(224_68%_40%)]">{currency(product.total)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Aktivitas Terbaru */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Aktivitas Terbaru</h3>
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Semua <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-3">
                {data.aktivitasTerbaru.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas</p>
                ) : (
                  data.aktivitasTerbaru.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(224_68%_40%)]/10 flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-[hsl(224_68%_40%)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{activity.type} {activity.id}</p>
                          <p className="text-xs text-muted-foreground">{activity.description} • {activity.time}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[hsl(224_68%_40%)]">{currency(activity.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
