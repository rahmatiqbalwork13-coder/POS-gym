'use client'
import { useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface ReportRow {
  created_at: string
  laba_kotor_total: number
  shu_50: number
  dana_30: number
  opr_20: number
}

const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

type FilterType = 'month' | 'year'

export function ReportsClient() {
  const now = new Date()
  const [filterType, setFilterType] = useState<FilterType>('month')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const supabase = createClient()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const totals = rows.reduce(
    (acc, r) => ({
      laba_kotor_total: acc.laba_kotor_total + r.laba_kotor_total,
      shu_50: acc.shu_50 + r.shu_50,
      dana_30: acc.dana_30 + r.dana_30,
      opr_20: acc.opr_20 + r.opr_20,
    }),
    { laba_kotor_total: 0, shu_50: 0, dana_30: 0, opr_20: 0 }
  )

  const fetchReport = async () => {
    setLoading(true); setFetched(false)

    let from: string, to: string
    if (filterType === 'month') {
      from = `${year}-${String(month).padStart(2,'0')}-01`
      to   = `${year}-${String(month).padStart(2,'0')}-31`
    } else {
      from = `${year}-01-01`
      to   = `${year}-12-31`
    }

    const { data } = await supabase
      .from('profit_distributions')
      .select('created_at, laba_kotor_total, shu_50, dana_30, opr_20')
      .gte('created_at', from)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })

    setRows((data as ReportRow[]) ?? [])
    setLoading(false); setFetched(true)
  }

  const exportCSV = () => {
    const header = 'Tanggal,Laba Kotor,SHU 50%,Dana 30%,Operasional 20%'
    const csvRows = rows.map(r =>
      `${new Date(r.created_at).toLocaleDateString('id-ID')},${r.laba_kotor_total},${r.shu_50},${r.dana_30},${r.opr_20}`
    )
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-laba-${year}${filterType === 'month' ? `-${String(month).padStart(2,'0')}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">Laporan Distribusi Laba</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="month">Per Bulan</option>
            <option value="year">Per Tahun</option>
          </select>
        </div>

        {filterType === 'month' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bulan</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tahun</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <Button onClick={fetchReport} disabled={loading} size="sm">
          {loading ? 'Memuat...' : 'Tampilkan'}
        </Button>

        {fetched && rows.length > 0 && (
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Summary cards */}
      {fetched && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Laba Kotor', value: totals.laba_kotor_total, accent: true },
            { label: 'SHU (50%)', value: totals.shu_50 },
            { label: 'Dana (30%)', value: totals.dana_30 },
            { label: 'Operasional (20%)', value: totals.opr_20 },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.accent ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className={`text-lg font-bold mt-1 ${c.accent ? 'text-primary' : ''}`}>{currency(c.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {fetched && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Tanggal', 'Laba Kotor', 'SHU (50%)', 'Dana (30%)', 'Operasional (20%)'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Tidak ada transaksi di periode ini.
                </td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 font-medium">{currency(r.laba_kotor_total)}</td>
                  <td className="px-4 py-3">{currency(r.shu_50)}</td>
                  <td className="px-4 py-3">{currency(r.dana_30)}</td>
                  <td className="px-4 py-3">{currency(r.opr_20)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
