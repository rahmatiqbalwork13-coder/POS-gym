'use client'
import { Package, AlertTriangle } from 'lucide-react'
import type { ItemPublic, CartItem } from '@/types'

interface ProductCardProps {
  item: ItemPublic
  onAdd: (item: CartItem) => void
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Minuman': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Makanan': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'Snack': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  'Suplemen': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  'Protein': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Perlengkapan': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Lainnya': { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
}

export function ProductCard({ item, onAdd }: ProductCardProps) {
  const colors = categoryColors[item.category] || categoryColors['Lainnya']
  const isLowStock = item.stock <= 5

  return (
    <button
      onClick={() => onAdd({ item, qty: 1 })}
      className="group relative w-full text-left rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm 
                 hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                 transition-all duration-300 ease-out
                 hover:-translate-y-0.5 active:translate-y-0"
    >
      {/* Image Container */}
      <div className={`relative aspect-square rounded-t-xl overflow-hidden ${colors.bg} ${colors.border} border-b`}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`w-16 h-16 ${colors.text} opacity-50 group-hover:opacity-70 transition-opacity`} />
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide
                           ${colors.bg} ${colors.text} border ${colors.border}`}>
            {item.category}
          </span>
        </div>

        {/* Low Stock Badge */}
        {isLowStock && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-medium border border-red-500/30">
              <AlertTriangle className="w-3 h-3" />
              {item.stock}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
          {item.name}
        </h3>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Harga</p>
            <p className="text-lg font-bold text-primary tabular-nums">
              Rp{item.selling_price.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Stok</p>
            <p className={`text-sm font-medium ${isLowStock ? 'text-red-400' : 'text-muted-foreground'}`}>
              {item.stock} pcs
            </p>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}