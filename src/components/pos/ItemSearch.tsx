'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, AlertTriangle, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ItemPublic, CartItem } from '@/types'

interface Props {
  onAdd: (item: CartItem) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function ItemSearch({ onAdd, inputRef }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // Load all items on initial mount
  useEffect(() => {
    const loadAllItems = async () => {
      setLoading(true)
      console.log('[ItemSearch] Loading items...')
      
      const { data, error } = await supabase
        .from('items')
        .select('id, name, selling_price, stock')
        .gt('stock', 0)
        .order('name')
        .limit(50)
      
      if (error) {
        console.error('[ItemSearch] Error loading items:', error)
      } else {
        console.log('[ItemSearch] Loaded items:', data?.length ?? 0, data)
      }
      
      setResults((data as ItemPublic[]) ?? [])
      setLoading(false)
      if ((data?.length ?? 0) > 0) setShowAll(true)
    }
    loadAllItems()
  }, [supabase])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { 
      // When query is empty, show all items again
      const loadAllItems = async () => {
        setLoading(true)
        const { data } = await supabase
          .from('items')
          .select('id, name, selling_price, stock')
          .gt('stock', 0)
          .order('name')
          .limit(50)
        setResults((data as ItemPublic[]) ?? [])
        setShowAll(true)
        setLoading(false)
      }
      loadAllItems()
      return
    }

    setShowAll(false)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('items')
        .select('id, name, selling_price, stock')
        .ilike('name', `%${query}%`)
        .gt('stock', 0)
        .limit(8)
      setResults((data as ItemPublic[]) ?? [])
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, supabase])

  const handleAdd = (item: ItemPublic) => {
    onAdd({ item, qty: 1 })
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari barang..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>

      {/* Browse All Header */}
      {showAll && !query && results.length > 0 && (
        <div className="mt-3 mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="size-4" />
          <span>Semua Barang ({results.length} items)</span>
          <span className="text-xs text-muted-foreground/70">- Ketik untuk mencari</span>
        </div>
      )}

      {(results.length > 0 || (loading && query)) && (
        <div className={`z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden ${showAll && !query ? 'max-h-[400px] overflow-y-auto' : 'absolute'}`}>
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Mencari...</p>
          ) : (
            <ul>
              {results.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleAdd(item)}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.stock <= 5 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            Stok rendah:
                          </span>
                        )}
                        Stok: {item.stock} &middot; Rp{item.selling_price.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg px-4 py-3">
          <p className="text-sm text-muted-foreground">Barang tidak ditemukan.</p>
        </div>
      )}

      {/* Empty State - No items in database */}
      {!loading && !query && results.length === 0 && (
        <div className="mt-4 p-6 border border-dashed border-border rounded-lg text-center">
          <Package className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Belum ada barang</p>
          <p className="text-xs text-muted-foreground/70">
            Tambah barang di menu Admin → Stok Barang
          </p>
        </div>
      )}
    </div>
  )
}
