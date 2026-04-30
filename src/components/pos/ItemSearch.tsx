'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ItemPublic, CartItem } from '@/types'

interface Props {
  onAdd: (item: CartItem) => void
}

export function ItemSearch({ onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemPublic[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

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
  }, [query])

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
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari barang..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>

      {(results.length > 0 || (loading && query)) && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
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
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
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
    </div>
  )
}
