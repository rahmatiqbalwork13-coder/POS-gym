'use client'
import { useState, useEffect, useRef } from 'react'
import { Package, Pencil, Trash2, Plus, X, AlertTriangle, Filter, Camera, Upload, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types'

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const LOW_STOCK_THRESHOLD = 5

interface FormState {
  id?: string
  name: string
  purchase_price: string
  selling_price: string
  stock: string
  image_url?: string
}

const EMPTY_FORM: FormState = { name: '', purchase_price: '', selling_price: '', stock: '' }

export function ItemsClient() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const loadItems = async () => {
    setLoading(true)
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  // Cleanup preview URL when component unmounts or form closes
  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const lowStockItems = items.filter(item => item.stock <= LOW_STOCK_THRESHOLD)
  const displayedItems = showLowStockOnly ? lowStockItems : items

  const openCreate = () => { 
    setError(null)
    setForm(EMPTY_FORM)
    setSelectedFile(null)
    setPreviewUrl(null)
  }
  
  const openEdit = (item: Item) => {
    setError(null)
    setForm({
      id: item.id,
      name: item.name,
      purchase_price: String(item.purchase_price),
      selling_price: String(item.selling_price),
      stock: String(item.stock),
      image_url: item.image_url || undefined,
    })
    setSelectedFile(null)
    setPreviewUrl(item.image_url || null)
  }

  const closeForm = () => {
    setForm(null)
    setSelectedFile(null)
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const uploadImage = async (file: File, itemId: string): Promise<string | null> => {
    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${itemId}-${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Error uploading image:', err)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError(null)

    try {
      let imageUrl = form.image_url

      // Upload new image if selected
      if (selectedFile) {
        // Generate temp ID for new items
        const tempId = form.id || crypto.randomUUID()
        const uploadedUrl = await uploadImage(selectedFile, tempId)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          setError('Gagal mengupload gambar. Silakan coba lagi.')
          setSaving(false)
          return
        }
      }

      const body = {
        id: form.id,
        name: form.name,
        purchase_price: Number(form.purchase_price),
        selling_price: Number(form.selling_price),
        stock: Number(form.stock),
        image_url: imageUrl,
      }

      const res = await fetch('/api/items', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()

      if (!res.ok) { 
        setError(data.error || 'Gagal menyimpan barang')
        setSaving(false)
        return 
      }

      closeForm()
      loadItems()
    } catch (err) {
      setError('Terjadi kesalahan saat menyimpan')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus barang "${name}"?`)) return
    const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Gagal menghapus barang.')
      return
    }
    loadItems()
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-primary" />
          <h1 className="text-lg lg:text-xl font-semibold">Stok Barang</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            size="sm"
            variant={showLowStockOnly ? "default" : "outline"}
            className="gap-1.5 flex-1 sm:flex-none"
          >
            <Filter className="size-4" />
            <span className="hidden sm:inline">{showLowStockOnly ? 'Tampilkan Semua' : `Stok Rendah (${lowStockItems.length})`}</span>
            <span className="sm:hidden">{showLowStockOnly ? 'Semua' : `Rendah (${lowStockItems.length})`}</span>
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-1.5 flex-1 sm:flex-none">
            <Plus className="size-4" /> <span className="hidden sm:inline">Tambah Barang</span><span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && !showLowStockOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 lg:p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {lowStockItems.length} barang memiliki stok rendah
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 truncate">
              {lowStockItems.slice(0, 2).map(i => i.name).join(', ')}
              {lowStockItems.length > 2 && ` dan ${lowStockItems.length - 2} lainnya`}
            </p>
          </div>
          <button
            onClick={() => setShowLowStockOnly(true)}
            className="text-xs text-amber-700 dark:text-amber-300 hover:underline font-medium whitespace-nowrap"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-4 lg:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{form.id ? 'Edit Barang' : 'Tambah Barang'}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Foto Produk</label>
              <div className="flex items-center gap-3">
                {/* Preview */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted transition-all overflow-hidden group"
                >
                  {previewUrl ? (
                    <>
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px]">Pilih Foto</span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full gap-2"
                    disabled={uploadingImage}
                  >
                    <Upload className="w-4 h-4" />
                    {previewUrl ? 'Ganti Foto' : 'Upload Foto'}
                  </Button>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedFile.name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Format: JPG, PNG, WebP. Maks: 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={closeForm} className="flex-1 sm:flex-none">Batal</Button>
              <Button onClick={handleSave} disabled={saving || uploadingImage} className="flex-1 sm:flex-none">
                {saving || uploadingImage ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <p>{showLowStockOnly ? 'Tidak ada barang dengan stok rendah.' : 'Belum ada barang.'}</p>
              </div>
            ) : (
              displayedItems.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  {/* Header with Image */}
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-lg font-bold ${item.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : ''}`}>
                          {item.stock}
                        </span>
                        {item.stock <= LOW_STOCK_THRESHOLD && (
                          <AlertTriangle className="size-4 text-amber-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Harga Beli</p>
                      <p className="font-medium">{currency(item.purchase_price)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Harga Jual</p>
                      <p className="font-medium">{currency(item.selling_price)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
                    <button 
                      onClick={() => openEdit(item)} 
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
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
                  {['Foto', 'Nama Barang', 'Harga Beli', 'Harga Jual', 'Stok', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {showLowStockOnly ? 'Tidak ada barang dengan stok rendah.' : 'Belum ada barang.'}
                  </td></tr>
                ) : displayedItems.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
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
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
