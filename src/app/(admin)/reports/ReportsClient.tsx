'use client'
import { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, Filter, ChevronLeft, ChevronRight, FileText, Package, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
interface ItemOption {
  id: string
  name: string
}

interface TransactionDetail {
  id: string
  created_at: string
  total_amount: number
  total_laba_kotor: number
  payment_method: 'cash' | 'transfer'
  amount_paid?: number
  change_amount?: number
  profiles?: { full_name: string | null }
  transaction_items?: {
    qty: number
    selling_price_at_time: number
    purchase_price_at_time: number
    items: { name: string }
  }[]
}

interface DailyReport {
  date: string
  totalTransactions: number
  totalAmount: number
  totalLaba: number
  cashAmount: number
  transferAmount: number
  transactions: TransactionDetail[]
}

interface ItemSalesReport {
  itemId: string
  itemName: string
  totalQty: number
  totalRevenue: number
  totalProfit: number
  transactions: {
    date: string
    qty: number
    sellingPrice: number
    purchasePrice: number
    revenue: number
    profit: number
  }[]
}

const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

type ViewType = 'daily' | 'range' | 'month' | 'year' | 'item'

export function ReportsClient() {
  const now = new Date()
  const [viewType, setViewType] = useState<ViewType>('daily')
  
  // Date states
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState(now.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  
  // Item filter states
  const [items, setItems] = useState<ItemOption[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [itemSearch, setItemSearch] = useState('')
  
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [itemSalesReport, setItemSalesReport] = useState<ItemSalesReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  
  const supabase = createClient()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // Load items for dropdown
  useEffect(() => {
    const loadItems = async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name')
        .order('name')
      if (data) setItems(data)
    }
    loadItems()
  }, [])

  // Filtered items for search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  )

  // Calculate totals for daily view
  const dailyTotals = dailyReports.reduce(
    (acc, day) => ({
      totalTransactions: acc.totalTransactions + day.totalTransactions,
      totalAmount: acc.totalAmount + day.totalAmount,
      totalLaba: acc.totalLaba + day.totalLaba,
      cashAmount: acc.cashAmount + day.cashAmount,
      transferAmount: acc.transferAmount + day.transferAmount,
    }),
    { totalTransactions: 0, totalAmount: 0, totalLaba: 0, cashAmount: 0, transferAmount: 0 }
  )

  const fetchReport = async () => {
    setLoading(true)
    setFetched(false)

    let from: string, to: string

    switch (viewType) {
      case 'daily':
        from = `${selectedDate}T00:00:00`
        to = `${selectedDate}T23:59:59`
        break
      case 'range':
        from = `${dateFrom}T00:00:00`
        to = `${dateTo}T23:59:59`
        break
      case 'month':
        from = `${year}-${String(month).padStart(2,'0')}-01T00:00:00`
        to = `${year}-${String(month).padStart(2,'0')}-31T23:59:59`
        break
      case 'year':
        from = `${year}-01-01T00:00:00`
        to = `${year}-12-31T23:59:59`
        break
      case 'item':
        from = `${dateFrom}T00:00:00`
        to = `${dateTo}T23:59:59`
        break
      default:
        from = `${selectedDate}T00:00:00`
        to = `${selectedDate}T23:59:59`
    }

    try {
      if (viewType === 'item' && selectedItemId) {
        // Fetch item sales report
        const { data: transItems, error } = await supabase
          .from('transaction_items')
          .select(`
            qty,
            selling_price_at_time,
            purchase_price_at_time,
            created_at,
            items(name),
            transactions(id, total_amount, profiles(full_name))
          `)
          .eq('item_id', selectedItemId)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: false })

        if (error) throw error

        const selectedItem = items.find(i => i.id === selectedItemId)
        
        const grouped = (transItems || []).reduce((acc: any, ti: any) => {
          const dateKey = new Date(ti.created_at).toISOString().split('T')[0]
          
          if (!acc.transactions[dateKey]) {
            acc.transactions[dateKey] = {
              date: dateKey,
              qty: 0,
              sellingPrice: ti.selling_price_at_time,
              purchasePrice: ti.purchase_price_at_time,
              revenue: 0,
              profit: 0
            }
          }
          
          acc.transactions[dateKey].qty += ti.qty
          acc.transactions[dateKey].revenue += ti.qty * ti.selling_price_at_time
          acc.transactions[dateKey].profit += ti.qty * (ti.selling_price_at_time - ti.purchase_price_at_time)
          
          acc.totalQty += ti.qty
          acc.totalRevenue += ti.qty * ti.selling_price_at_time
          acc.totalProfit += ti.qty * (ti.selling_price_at_time - ti.purchase_price_at_time)
          
          return acc
        }, { 
          itemId: selectedItemId,
          itemName: selectedItem?.name || '-',
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
          transactions: {}
        })

        setItemSalesReport({
          ...grouped,
          transactions: Object.values(grouped.transactions).sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        })
        setDailyReports([])
      } else {
        // Fetch daily transactions report
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select(`
            id,
            created_at,
            total_amount,
            total_laba_kotor,
            payment_method,
            amount_paid,
            change_amount,
            profiles(full_name),
            transaction_items(
              qty,
              selling_price_at_time,
              items(name)
            )
          `)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Group by date
        const grouped = (transactions || []).reduce((acc: Record<string, DailyReport>, trans: any) => {
          const dateKey = new Date(trans.created_at).toISOString().split('T')[0]
          
          if (!acc[dateKey]) {
            acc[dateKey] = {
              date: dateKey,
              totalTransactions: 0,
              totalAmount: 0,
              totalLaba: 0,
              cashAmount: 0,
              transferAmount: 0,
              transactions: []
            }
          }
          
          acc[dateKey].totalTransactions++
          acc[dateKey].totalAmount += trans.total_amount
          acc[dateKey].totalLaba += trans.total_laba_kotor || 0
          
          if (trans.payment_method === 'cash') {
            acc[dateKey].cashAmount += trans.total_amount
          } else {
            acc[dateKey].transferAmount += trans.total_amount
          }
          
          acc[dateKey].transactions.push(trans)
          
          return acc
        }, {})

        const reportsArray = Object.values(grouped).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )

        setDailyReports(reportsArray)
        setItemSalesReport(null)
      }

      setFetched(true)
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto fetch on mount for today's data
  useEffect(() => {
    if (viewType !== 'item') {
      fetchReport()
    }
  }, [])

  const exportCSV = () => {
    if (viewType === 'item' && itemSalesReport) {
      const headers = 'Tanggal,Qty,Revenue,Profit\n'
      const rows = itemSalesReport.transactions.map((t: any) => 
        `${t.date},${t.qty},${t.revenue},${t.profit}`
      ).join('\n')
      
      const blob = new Blob([headers + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-penjualan-${itemSalesReport.itemName}-${dateFrom}-${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = 'Tanggal,Jumlah Transaksi,Total Pendapatan,Total Laba,Tunai,Transfer\n'
      const rows = dailyReports.map(day => 
        `${day.date},${day.totalTransactions},${day.totalAmount},${day.totalLaba},${day.cashAmount},${day.transferAmount}`
      ).join('\n')
      
      const blob = new Blob([headers + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-penjualan-${viewType}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const navigateDate = (days: number) => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[hsl(224_68%_40%)]" />
          <h1 className="text-xl font-semibold">Laporan Penjualan</h1>
        </div>
        {fetched && (dailyReports.length > 0 || itemSalesReport) && (
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5 w-fit">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: 'daily', label: 'Per Hari' },
          { key: 'range', label: 'Rentang Tanggal' },
          { key: 'month', label: 'Per Bulan' },
          { key: 'year', label: 'Per Tahun' },
          { key: 'item', label: 'Per Item' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewType(tab.key as ViewType)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewType === tab.key
                ? 'bg-card text-[hsl(224_68%_40%)] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Item Selection */}
        {viewType === 'item' && (
          <>
            <div className="space-y-1.5 w-full sm:w-80">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pilih Item</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full h-10 pl-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
                >
                  <option value="">-- Pilih Barang --</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sampai Tanggal</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              />
            </div>
          </>
        )}

        {/* Daily View */}
        {viewType === 'daily' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 rounded-lg border border-border hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              />
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 rounded-lg border border-border hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Range View */}
        {viewType === 'range' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sampai Tanggal</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              />
            </div>
          </>
        )}

        {/* Month View */}
        {viewType === 'month' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              >
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tahun</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Year View */}
        {viewType === 'year' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(224_68%_40%)]/20"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        <Button 
          onClick={fetchReport} 
          disabled={loading || (viewType === 'item' && !selectedItemId)} 
          size="sm"
          className="bg-[hsl(224_68%_40%)] hover:bg-[hsl(224_68%_35%)]"
        >
          {loading ? 'Memuat...' : 'Tampilkan'}
        </Button>
      </div>

      {/* Summary Cards - Daily View */}
      {fetched && viewType !== 'item' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-[hsl(224_68%_40%)]/30 bg-[hsl(224_68%_40%)]/5 p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Transaksi</p>
            <p className="text-xl font-bold text-[hsl(224_68%_40%)] mt-1">{dailyTotals.totalTransactions}</p>
          </div>
          <div className="rounded-xl border border-[hsl(44_96%_52%)]/30 bg-[hsl(44_96%_52%)]/10 p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Pendapatan</p>
            <p className="text-xl font-bold text-[hsl(44_96%_38%)] mt-1">{currency(dailyTotals.totalAmount)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Laba</p>
            <p className="text-xl font-bold mt-1">{currency(dailyTotals.totalLaba)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Tunai</p>
            <p className="text-xl font-bold mt-1">{currency(dailyTotals.cashAmount)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Transfer</p>
            <p className="text-xl font-bold mt-1">{currency(dailyTotals.transferAmount)}</p>
          </div>
        </div>
      )}

      {/* Summary Cards - Item View */}
      {fetched && viewType === 'item' && itemSalesReport && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[hsl(224_68%_40%)]/30 bg-[hsl(224_68%_40%)]/5 p-4 lg:col-span-2">
            <p className="text-xs text-muted-foreground font-medium uppercase">Nama Barang</p>
            <p className="text-lg font-bold text-[hsl(224_68%_40%)] mt-1">{itemSalesReport.itemName}</p>
          </div>
          <div className="rounded-xl border border-[hsl(44_96%_52%)]/30 bg-[hsl(44_96%_52%)]/10 p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Terjual</p>
            <p className="text-xl font-bold text-[hsl(44_96%_38%)] mt-1">{itemSalesReport.totalQty} pcs</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Pendapatan</p>
            <p className="text-xl font-bold mt-1">{currency(itemSalesReport.totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Daily Reports */}
      {fetched && viewType !== 'item' && (
        <div className="space-y-4">
          {dailyReports.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Tidak ada transaksi di periode ini.</p>
            </div>
          ) : (
            dailyReports.map((day) => (
              <div key={day.date} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Date Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[hsl(224_68%_40%)]" />
                    <div>
                      <p className="font-semibold">{formatDate(day.date)}</p>
                      <p className="text-xs text-muted-foreground">{day.totalTransactions} transaksi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[hsl(44_96%_38%)]">{currency(day.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">Laba: {currency(day.totalLaba)}</p>
                    </div>
                    <ChevronLeft className={`w-5 h-5 text-muted-foreground transition-transform ${expandedDate === day.date ? '-rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Transactions Detail */}
                {expandedDate === day.date && (
                  <div className="border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Waktu</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Kasir</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metode</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Laba</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {day.transactions.map((trans) => (
                          <tr key={trans.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(trans.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">{trans.profiles?.full_name || 'Administrator'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                trans.payment_method === 'cash' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {trans.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{currency(trans.total_amount)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{currency(trans.total_laba_kotor || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t border-border">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-xs font-medium text-muted-foreground">Subtotal</td>
                          <td className="px-4 py-2 text-right font-bold text-[hsl(44_96%_38%)]">{currency(day.totalAmount)}</td>
                          <td className="px-4 py-2 text-right font-bold">{currency(day.totalLaba)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Item Sales Report */}
      {fetched && viewType === 'item' && itemSalesReport && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tanggal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Qty Terjual</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Harga Jual</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Pendapatan</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Laba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itemSalesReport.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada penjualan untuk barang ini di periode yang dipilih.
                  </td>
                </tr>
              ) : (
                (itemSalesReport.transactions as any[]).map((t, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-4 py-3">{formatDateShort(t.date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{t.qty} pcs</td>
                    <td className="px-4 py-3 text-right">{currency(t.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium text-[hsl(44_96%_38%)]">{currency(t.revenue)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{currency(t.profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/30 border-t border-border">
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Total</td>
                <td className="px-4 py-3 text-right font-bold">{itemSalesReport.totalQty} pcs</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right font-bold text-[hsl(44_96%_38%)]">{currency(itemSalesReport.totalRevenue)}</td>
                <td className="px-4 py-3 text-right font-bold">{currency(itemSalesReport.totalProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
