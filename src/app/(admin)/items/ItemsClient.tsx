'use client'
import { useState, useEffect } from 'react'
import { Package, Pencil, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Item } from '@/types'

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

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

  const loadItems = async () => {
    setLoading(true)
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Stok Barang</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="size-4" /> Tambah Barang
        </Button>
      </div>

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
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada barang.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{currency(item.purchase_price)}</td>
                  <td className="px-4 py-3">{currency(item.selling_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${item.stock <= 5 ? 'text-destructive' : ''}`}>
                      {item.stock}
                    </span>
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
