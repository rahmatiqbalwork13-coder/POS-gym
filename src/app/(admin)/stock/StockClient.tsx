'use client'
import { useState, useEffect } from 'react'
import { ClipboardList, Plus, Minus, Search, AlertTriangle, Package, History, RotateCcw, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Item } from '@/types'

const LOW_STOCK_THRESHOLD = 5

interface StockHistory {
  id: string
  item_id: string
  item_name: string
  type: 'in' | 'out'
  quantity: number
  reason: string
  created_at: string
  created_by?: string
}

interface StockForm {
  itemId: string
  itemName: string
  currentStock: number
  quantity: string
  type: 'in' | 'out'
  reason: string
}

const EMPTY_FORM: StockForm = {
  itemId: '',
  itemName: '',
  currentStock: 0,
  quantity: '',
  type: 'in',
  reason: ''
}

export function StockClient() {
  const [items, setItems] = useState<Item[]>([])
  const [history, setHistory] = useState<StockHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState<StockForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/stock/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  useEffect(() => { 
    loadItems()
    loadHistory()
  }, [])

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const lowStockItems = items.filter(item => item.stock <= LOW_STOCK_THRESHOLD)
  const displayedItems = showLowStockOnly ? lowStockItems : filteredItems

  const openAdjustStock = (item: Item, type: 'in' | 'out') => {
    setError(null)
    setSuccess(null)
    setForm({
      itemId: item.id,
      itemName: item.name,
      currentStock: item.stock,
      quantity: '',
      type,
      reason: ''
    })
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const quantity = Number(form.quantity)
    if (!quantity || quantity <= 0) {
      setError('Jumlah harus lebih dari 0')
      setSaving(false)
      return
    }

    if (form.type === 'out' && quantity > form.currentStock) {
      setError(`Stok tidak mencukupi. Tersedia: ${form.currentStock}`)
      setSaving(false)
      return
    }

    const res = await fetch('/api/stock/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: form.itemId,
        quantity,
        type: form.type,
        reason: form.reason || (form.type === 'in' ? 'Penambahan stok' : 'Pengurangan stok')
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Gagal mengupdate stok')
      setSaving(false)
      return
    }

    setSaving(false)
    setForm(null)
    setSuccess(`Stok ${form.itemName} berhasil di${form.type === 'in' ? 'tambah' : 'kurangi'}`)
    loadItems()
    loadHistory()

    setTimeout(() => setSuccess(null), 3000)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" />
          <h1 className="text-lg lg:text-xl font-semibold">Manajemen Stok</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'inventory' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('inventory')}
            className="gap-1.5 flex-1 sm:flex-none"
          >
            <Package className="size-4" />
            <span className="hidden sm:inline">Inventori</span>
            <span className="sm:hidden">Stok</span>
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="gap-1.5 flex-1 sm:flex-none"
          >
            <History className="size-4" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="sm:hidden">History</span>
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 lg:p-4 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Low Stock Alert */}
      {activeTab === 'inventory' && lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 lg:p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {lowStockItems.length} barang memiliki stok rendah
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 truncate">
              {lowStockItems.slice(0, 2).map(i => `${i.name} (${i.stock})`).join(', ')}
              {lowStockItems.length > 2 && ` dan ${lowStockItems.length - 2} lainnya`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 whitespace-nowrap"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            {showLowStockOnly ? 'Semua' : 'Lihat'}
          </Button>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            {showLowStockOnly && (
              <Button variant="outline" size="sm" onClick={() => setShowLowStockOnly(false)} className="shrink-0">
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm text-muted-foreground">Memuat data...</span>
            </div>
          ) : (
            <>
              {/* Mobile: Card View */}
              <div className="lg:hidden space-y-3">
                {displayedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="size-12 mx-auto mb-3 opacity-20" />
                    <p>{showLowStockOnly ? 'Tidak ada barang dengan stok rendah.' : 'Tidak ada barang yang cocok.'}</p>
                  </div>
                ) : (
                  displayedItems.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm flex-1 pr-2">{item.name}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-xl font-bold ${item.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : ''}`}>
                            {item.stock}
                          </span>
                          {item.stock <= LOW_STOCK_THRESHOLD && (
                            <AlertTriangle className="size-4 text-amber-600" />
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {item.stock <= LOW_STOCK_THRESHOLD ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <AlertTriangle className="size-3" />
                            Stok Rendah
                          </span>
                        ) : item.stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                            Habis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <CheckCircle2 className="size-3" />
                            Tersedia
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openAdjustStock(item, 'in')}
                        >
                          <Plus className="size-4" />
                          Masuk
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => openAdjustStock(item, 'out')}
                          disabled={item.stock === 0}
                        >
                          <Minus className="size-4" />
                          Keluar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden lg:block border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nama Barang</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Stok Saat Ini</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {showLowStockOnly ? 'Tidak ada barang dengan stok rendah.' : 'Tidak ada barang yang cocok.'}
                        </td>
                      </tr>
                    ) : (
                      displayedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-lg font-semibold ${item.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.stock <= LOW_STOCK_THRESHOLD ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                <AlertTriangle className="size-3" />
                                Stok Rendah
                              </span>
                            ) : item.stock === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                Habis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                <CheckCircle2 className="size-3" />
                                Tersedia
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openAdjustStock(item, 'in')}
                              >
                                <Plus className="size-3.5" />
                                Stok Masuk
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => openAdjustStock(item, 'out')}
                                disabled={item.stock === 0}
                              >
                                <Minus className="size-3.5" />
                                Stok Keluar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {/* Mobile: Card View */}
          <div className="lg:hidden space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="size-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada riwayat perubahan stok.</p>
              </div>
            ) : (
              history.map((record) => (
                <div key={record.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{record.item_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(record.created_at)}</p>
                    </div>
                    {record.type === 'in' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        <Plus className="size-3" />
                        Masuk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                        <Minus className="size-3" />
                        Keluar
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Jumlah</span>
                    <span className="font-bold text-lg">{record.quantity}</span>
                  </div>
                  {record.reason && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      {record.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden lg:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tanggal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Barang</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipe</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Jumlah</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada riwayat perubahan stok.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(record.created_at)}</td>
                      <td className="px-4 py-3 font-medium">{record.item_name}</td>
                      <td className="px-4 py-3 text-center">
                        {record.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <Plus className="size-3" />
                            Masuk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                            <Minus className="size-3" />
                            Keluar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{record.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{record.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Adjust Stock Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-4 lg:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  {form.type === 'in' ? 'Stok Masuk' : 'Stok Keluar'}
                </h2>
                <p className="text-sm text-muted-foreground">{form.itemName}</p>
              </div>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Stok Saat Ini</p>
              <p className="text-2xl font-bold">{form.currentStock}</p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Jumlah {form.type === 'in' ? 'Masuk' : 'Keluar'}
              </label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => (f ? { ...f, quantity: e.target.value } : f))}
                placeholder="0"
                min={1}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keterangan</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => (f ? { ...f, reason: e.target.value } : f))}
                placeholder={form.type === 'in' ? 'Contoh: Pembelian dari supplier' : 'Contoh: Rusak / Kadaluarsa'}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setForm(null)} className="flex-1 sm:flex-none">
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 sm:flex-none ${form.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {saving ? 'Menyimpan...' : form.type === 'in' ? 'Tambah Stok' : 'Kurangi Stok'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
