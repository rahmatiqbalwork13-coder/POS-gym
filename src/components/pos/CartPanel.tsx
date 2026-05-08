'use client'
import { useState } from 'react'
import { 
  ShoppingCart, 
  Trash2, 
  Minus, 
  Plus, 
  CreditCard, 
  Banknote,
  Receipt,
  X,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/types'

interface CartPanelProps {
  items: CartItem[]
  onQtyChange: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
  onClear: () => void
  onCheckout: (paymentMethod: 'cash' | 'transfer', amountPaid?: number) => void
  loading: boolean
}

export function CartPanel({ 
  items, 
  onQtyChange, 
  onRemove, 
  onClear, 
  onCheckout,
  loading 
}: CartPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const total = items.reduce((sum, item) => sum + item.item.selling_price * item.qty, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const change = paymentMethod === 'cash' && amountPaid 
    ? parseInt(amountPaid.replace(/\D/g, '')) - total 
    : 0

  const handleCheckout = () => {
    if (items.length === 0) return
    
    if (paymentMethod === 'cash') {
      const paid = parseInt(amountPaid.replace(/\D/g, ''))
      if (!paid || paid < total) {
        return // Show error
      }
      onCheckout('cash', paid)
    } else {
      onCheckout('transfer')
    }
  }

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '')
    return number ? parseInt(number).toLocaleString('id-ID') : ''
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Keranjang</h2>
          </div>
          <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
            0
          </span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            Keranjang kosong
          </h3>
          <p className="text-sm text-muted-foreground/70">
            Klik produk untuk menambah
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Keranjang</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
            {itemCount} item
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Kosongkan keranjang"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 custom-scrollbar">
        {items.map(({ item, qty }) => (
          <div 
            key={item.id} 
            className="group p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-primary/20 transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Product Image/Icon */}
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-0.5">
                  {item.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Rp{item.selling_price.toLocaleString('id-ID')}/pcs
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quantity & Price */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
              {/* Quantity Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => qty > 1 ? onQtyChange(item.id, qty - 1) : onRemove(item.id)}
                  className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center
                           hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => qty < item.stock && onQtyChange(item.id, qty + 1)}
                  disabled={qty >= item.stock}
                  className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center
                           hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Subtotal */}
              <p className="font-bold text-primary">
                Rp{(item.selling_price * qty).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Section */}
      <div className="mt-4 pt-4 border-t border-border space-y-4">
        {/* Payment Method */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Metode Pembayaran
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${paymentMethod === 'cash' 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                  : 'bg-card/50 border border-border/50 text-muted-foreground hover:bg-card hover:border-primary/30'
                }`}
            >
              <Banknote className="w-4 h-4" />
              Tunai
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${paymentMethod === 'transfer' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                  : 'bg-card/50 border border-border/50 text-muted-foreground hover:bg-card hover:border-primary/30'
                }`}
            >
              <CreditCard className="w-4 h-4" />
              Transfer
            </button>
          </div>
        </div>

        {/* Cash Input */}
        {paymentMethod === 'cash' && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Uang Diterima
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                Rp
              </span>
              <input
                type="text"
                value={amountPaid}
                onChange={(e) => setAmountPaid(formatCurrency(e.target.value))}
                placeholder="0"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background 
                         text-right font-semibold text-lg
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                         placeholder:text-muted-foreground/50"
              />
            </div>
            {change > 0 && (
              <p className="mt-1.5 text-sm text-right">
                <span className="text-muted-foreground">Kembalian: </span>
                <span className="font-bold text-emerald-400">
                  Rp{change.toLocaleString('id-ID')}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Total */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Total Bayar</span>
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums">
              Rp{total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/90 
                   hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25
                   transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={loading || (paymentMethod === 'cash' && (!amountPaid || change < 0))}
          onClick={handleCheckout}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Proses Transaksi
            </span>
          )}
        </Button>

        {/* Clear Cart */}
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Kosongkan Keranjang
        </button>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Kosongkan Keranjang?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Semua item di keranjang akan dihapus. Lanjutkan?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onClear()
                  setShowConfirm(false)
                }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}