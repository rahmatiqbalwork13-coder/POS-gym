'use client'
import { useState, useEffect } from 'react'
import { Package, Pencil, Trash2, Plus, X, AlertTriangle, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Item } from '@/types'

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const LOW_STOCK_THRESHOLD = 5

interface FormState {
  id?: string
  name: string
  purchase_price: string
  selling_price: string
  stock: string
}

const EMPTY_FORM: FormState = { name: '', purchase_price: '', selling_price: '', stock: '' }

export function ItemsClient() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const lowStockItems = items.filter(item => item.stock <= LOW_STOCK_THRESHOLD)
  const displayedItems = showLowStockOnly ? lowStockItems : items

  const openCreate = () => { setError(null); setForm(EMPTY_FORM) }
  const openEdit = (item: Item) => {
    setError(null)
    setForm({
      id: item.id,
      name: item.name,
      purchase_price: String(item.purchase_price),
      selling_price: String(item.selling_price),
      stock: String(item.stock),
    })
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true); setError(null)

    const body = {
      id: form.id,
      name: form.name,
      purchase_price: Number(form.purchase_price),
      selling_price: Number(form.selling_price),
      stock: Number(form.stock),
    }

    const res = await fetch('/api/items', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error); setSaving(false); return }

    setSaving(false); setForm(null); loadItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus barang ini?')) return
    await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
    loadItems()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Stok Barang</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            size="sm"
            variant={showLowStockOnly ? "default" : "outline"}
            className="gap-1.5"
          >
            <Filter className="size-4" />
            {showLowStockOnly ? 'Tampilkan Semua' : `Stok Rendah (${lowStockItems.length})`}
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="size-4" /> Tambah Barang
          </Button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && !showLowStockOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {lowStockItems.length} barang memiliki stok rendah (≤{LOW_STOCK_THRESHOLD})
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}
              {lowStockItems.length > 3 && ` dan ${lowStockItems.length - 3} lainnya`}
            </p>
          </div>
          <button
            onClick={() => setShowLowStockOnly(true)}
            className="text-xs text-amber-700 dark:text-amber-300 hover:underline font-medium"
          >
            Lihat semua
          </button>
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{form.id ? 'Edit Barang' : 'Tambah Barang'}</h2>
              <button onClick={() => setForm(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {([
              ['Nama Barang', 'name', 'text', 'Contoh: Air Mineral 600ml'],
              ['Harga Beli (Rp)', 'purchase_price', 'number', '5000'],
              ['Harga Jual (Rp)', 'selling_price', 'number', '8000'],
              ['Stok Awal', 'stock', 'number', '100'],
            ] as const).map(([label, key, type, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                  placeholder={placeholder}
                  min={type === 'number' ? 0 : undefined}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            ))}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat data...</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Nama Barang', 'Harga Beli', 'Harga Jual', 'Stok', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedItems.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {showLowStockOnly ? 'Tidak ada barang dengan stok rendah.' : 'Belum ada barang.'}
                </td></tr>
              ) : displayedItems.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{currency(item.purchase_price)}</td>
                  <td className="px-4 py-3">{currency(item.selling_price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${item.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                        {item.stock}
                      </span>
                      {item.stock <= LOW_STOCK_THRESHOLD && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          <AlertTriangle className="size-3" />
                          Rendah
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
