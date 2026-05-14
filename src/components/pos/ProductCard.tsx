'use client'
import { Package, AlertTriangle } from 'lucide-react'
import type { ItemPublic, CartItem } from '@/types'

interface ProductCardProps {
  item: ItemPublic
  onAdd: (item: CartItem) => void
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Minuman': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  'Makanan': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  'Snack': { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20' },
  'Suplemen': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  'Protein': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  'Perlengkapan': { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20' },
  'Lainnya': { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' },
}

export function ProductCard({ item, onAdd }: ProductCardProps) {
  const colors = categoryColors[item.category] || categoryColors['Lainnya']
  const isLowStock = item.stock <= 5

  return (
    <button
      onClick={() => onAdd({ item, qty: 1 })}
      className="group relative w-full text-left rounded-xl border border-border/50 bg-card 
                 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                 transition-all duration-200 ease-out
                 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
    >
      {/* Image Container - Portrait aspect ratio dengan background putih */}
      <div className="relative aspect-[4/5] bg-white overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Package className="w-20 h-20 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-opacity" />
          </div>
        )}
        
        {/* Category Badge - lebih subtle */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wide
                           bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200 shadow-sm`}>
            {item.category}
          </span>
        </div>

        {/* Low Stock Badge */}
        {isLowStock && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-medium shadow-sm">
              <AlertTriangle className="w-3 h-3" />
              {item.stock}
            </span>
          </div>
        )}
      </div>

      {/* Content - lebih compact */}
      <div className="p-3 border-t border-border/50">
        {/* Nama Produk */}
        <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {item.name}
        </h3>
        
        {/* Harga dan Stok dalam satu baris */}
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-primary tabular-nums">
            Rp{item.selling_price.toLocaleString('id-ID')}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Stok</span>
            <span className={`font-medium ${isLowStock ? 'text-red-500' : 'text-foreground'}`}>
              {item.stock}
            </span>
            <span>pcs</span>
          </div>
        </div>
      </div>
    </button>
  )
}