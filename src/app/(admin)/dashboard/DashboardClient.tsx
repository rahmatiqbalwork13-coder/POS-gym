'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProfitSummary } from '@/types'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

interface StatCardProps { label: string; value: string; sub: string; accent?: boolean }
function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 space-y-1 ${accent ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

interface Props {
  initialSummary: ProfitSummary
  initialYear: number
  initialMonth: number
}

export function DashboardClient({ initialSummary, initialYear, initialMonth }: Props) {
  const [summary, setSummary] = useState<ProfitSummary>(initialSummary)
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetch = async (y: number, m: number) => {
    setLoading(true)
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const to = `${y}-${String(m).padStart(2, '0')}-31`

    const { data } = await supabase
      .from('profit_distributions')
      .select('laba_kotor_total, shu_50, dana_30, opr_20')
      .gte('created_at', from)
      .lte('created_at', `${to}T23:59:59`)

    const result = (data ?? []).reduce(
      (acc: ProfitSummary, row: ProfitSummary) => ({
        laba_kotor_total: acc.laba_kotor_total + row.laba_kotor_total,
        shu_50: acc.shu_50 + row.shu_50,
        dana_30: acc.dana_30 + row.dana_30,
        opr_20: acc.opr_20 + row.opr_20,
      }),
      { laba_kotor_total: 0, shu_50: 0, dana_30: 0, opr_20: 0 }
    )
    setSummary(result)
    setLoading(false)
  }

  const handleFilter = (y: number, m: number) => {
    setYear(y); setMonth(m)
    fetch(y, m)
  }

  const years = Array.from({ length: 5 }, (_, i) => initialYear - i)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Laba</h1>
          <p className="text-sm text-muted-foreground">{MONTHS[month - 1]} {year}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={month}
            onChange={e => handleFilter(year, Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => handleFilter(Number(e.target.value), month)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Laba Kotor"
            value={currency(summary.laba_kotor_total)}
            sub="Laba sebelum distribusi"
            accent
          />
          <StatCard
            label="SHU (50%)"
            value={currency(summary.shu_50)}
            sub="Untuk anggota koperasi"
          />
          <StatCard
            label="Dana Cadangan (30%)"
            value={currency(summary.dana_30)}
            sub="Dana cadangan koperasi"
          />
          <StatCard
            label="Operasional (20%)"
            value={currency(summary.opr_20)}
            sub="Biaya operasional harian"
          />
        </div>
      )}

      {!loading && summary.laba_kotor_total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada transaksi di periode ini.
        </p>
      )}
    </div>
  )
}
