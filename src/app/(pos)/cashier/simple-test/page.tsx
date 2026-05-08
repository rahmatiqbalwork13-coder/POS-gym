'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, ShoppingCart } from 'lucide-react'
import type { ItemPublic } from '@/types'

export default function SimpleCashierTest() {
  const [items, setItems] = useState<ItemPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadItems = async () => {
      try {
        console.log('[SimpleTest] Loading items...')
        const { data, error } = await supabase
          .from('items')
          .select('id, name, selling_price, stock, category, image_url')
          .gt('stock', 0)
          .limit(10)

        if (error) {
          console.error('[SimpleTest] Error:', error)
          setError(error.message)
        } else {
          console.log('[SimpleTest] Items loaded:', data)
          setItems(data || [])
        }
      } catch (err) {
        console.error('[SimpleTest] Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-destructive mb-2">Error: {error}</div>
        <p className="text-sm text-muted-foreground">Check console for details</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Cashier Test</h1>
      <p className="text-muted-foreground mb-6">Found {items.length} items</p>
      
      {items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p>No items found in database</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center mb-3">
                <Package className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium text-sm mb-1">{item.name}</h3>
              <p className="text-primary font-bold">Rp{item.selling_price?.toLocaleString('id-ID')}</p>
              <p className="text-xs text-muted-foreground">Stock: {item.stock}</p>
              <p className="text-xs text-muted-foreground capitalize">{item.category || 'Lainnya'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}