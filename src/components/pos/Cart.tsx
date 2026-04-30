'use client'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/types'

interface Props {
  items: CartItem[]
  onQtyChange: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
}

export function Cart({ items, onQtyChange, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Keranjang kosong. Cari barang di atas.
      </div>
    )
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-border">
      {items.map(({ item, qty }) => (
        <li key={item.id} className="flex items-center gap-3 py-3 px-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              Rp{item.selling_price.toLocaleString('id-ID')} &times; {qty} ={' '}
              <span className="font-medium text-foreground">
                Rp{(item.selling_price * qty).toLocaleString('id-ID')}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => qty > 1 ? onQtyChange(item.id, qty - 1) : onRemove(item.id)}
              className="size-7 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <button
              onClick={() => qty < item.stock ? onQtyChange(item.id, qty + 1) : undefined}
              disabled={qty >= item.stock}
              className="size-7 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="size-3" />
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="size-7 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors ml-1"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
