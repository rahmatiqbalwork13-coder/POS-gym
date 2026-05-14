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
  Package,
  Printer,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { printThermalUSB, formatReceiptHTML, printWindow, isWebSerialSupported } from '@/lib/printer/thermal-usb'
import type { CartItem } from '@/types'

interface CartPanelProps {
  items: CartItem[]
  onQtyChange: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
  onClear: () => void
  onCheckout: (paymentMethod: 'cash' | 'transfer', amountPaid?: number) => Promise<void>
  loading: boolean
  storeName?: string
  cashierName?: string
}

export function CartPanel({ 
  items, 
  onQtyChange, 
  onRemove, 
  onClear, 
  onCheckout,
  loading,
  storeName = 'Koperasi Gym',
  cashierName = 'Kasir'
}: CartPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle')
  const [printMessage, setPrintMessage] = useState('')

  const total = items.reduce((sum, item) => sum + item.item.selling_price * item.qty, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const change = paymentMethod === 'cash' && amountPaid 
    ? parseInt(amountPaid.replace(/\D/g, '')) - total 
    : 0

  const handleCheckout = async () => {
    if (items.length === 0) return
    
    const paid = paymentMethod === 'cash' ? parseInt(amountPaid.replace(/\D/g, '')) : undefined
    if (paymentMethod === 'cash' && (!paid || paid < total)) {
      setPrintMessage('Uang bayar tidak mencukupi')
      setPrintStatus('error')
      return
    }

    try {
      await onCheckout(paymentMethod, paid)
      
      setPrintStatus('printing')
      setPrintMessage('Mencetak struk...')
      
      const result = await printThermalUSB({
        storeName,
        cashierName,
        date: new Date().toLocaleString('id-ID'),
        items: items.map(item => ({
          name: item.item.name,
          qty: item.qty,
          price: item.item.selling_price
        })),
        total,
        paymentMethod,
        amountPaid: paid,
        change: paid ? paid - total : 0
      })
      
      setPrintStatus('success')
      setPrintMessage(result.message)
      
      setTimeout(() => {
        setPrintStatus('idle')
        setPrintMessage('')
      }, 3000)
    } catch (error) {
      setPrintStatus('error')
      setPrintMessage(error instanceof Error ? error.message : 'Gagal mencetak struk')
    }
  }

  const handlePrintPreview = () => {
    if (items.length === 0) return
    
    const paid = paymentMethod === 'cash' ? parseInt(amountPaid.replace(/\D/g, '')) : undefined
    const html = formatReceiptHTML({
      storeName,
      cashierName,
      date: new Date().toLocaleString('id-ID'),
      items: items.map(item => ({
        name: item.item.name,
        qty: item.qty,
        price: item.item.selling_price
      })),
      total,
      paymentMethod,
      amountPaid: paid,
      change: paid ? paid - total : 0
    })
    
    printWindow(html)
  }

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '')
    return number ? parseInt(number).toLocaleString('id-ID') : ''
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Keranjang</h2>
          </div>
          <span className="px-1.5 py-0.5 bg-muted rounded-full text-[10px] font-medium text-muted-foreground">
            0
          </span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-0.5">
            Keranjang kosong
          </h3>
          <p className="text-xs text-muted-foreground/70">
            Klik produk untuk menambah
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Keranjang</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
            {itemCount} item
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Kosongkan keranjang"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Items List - Compact */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 -mr-0.5 custom-scrollbar min-h-0">
        {items.map(({ item, qty }) => (
          <div 
            key={item.id} 
            className="group p-2 rounded-lg bg-card/50 border border-border/50 hover:bg-card hover:border-primary/20 transition-all"
          >
            <div className="flex items-start gap-2">
              {/* Product Image/Icon - Smaller */}
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <Package className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-foreground line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Rp{item.selling_price.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Quantity & Price - Compact */}
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
              {/* Quantity Controls - Smaller */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => qty > 1 ? onQtyChange(item.id, qty - 1) : onRemove(item.id)}
                  className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center
                           hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="w-6 text-center text-xs font-semibold">{qty}</span>
                <button
                  onClick={() => qty < item.stock && onQtyChange(item.id, qty + 1)}
                  disabled={qty >= item.stock}
                  className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center
                           hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Subtotal */}
              <p className="font-bold text-xs text-primary">
                Rp{(item.selling_price * qty).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Section - Compact */}
      <div className="mt-2 pt-2 border-t border-border space-y-2 shrink-0">
        {/* Payment Method - Smaller */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Metode
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${paymentMethod === 'cash' 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'bg-card/50 border border-border/50 text-muted-foreground hover:bg-card'
                }`}
            >
              <Banknote className="w-3 h-3" />
              Tunai
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${paymentMethod === 'transfer' 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-card/50 border border-border/50 text-muted-foreground hover:bg-card'
                }`}
            >
              <CreditCard className="w-3 h-3" />
              Transfer
            </button>
          </div>
        </div>

        {/* Cash Input - Compact */}
        {paymentMethod === 'cash' && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Uang Diterima
            </p>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                Rp
              </span>
              <input
                type="text"
                value={amountPaid}
                onChange={(e) => setAmountPaid(formatCurrency(e.target.value))}
                placeholder="0"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background 
                         text-right font-semibold text-sm
                         focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary
                         placeholder:text-muted-foreground/50"
              />
            </div>
            {change > 0 && (
              <p className="mt-1 text-xs text-right">
                <span className="text-muted-foreground">Kembali: </span>
                <span className="font-bold text-emerald-600">
                  Rp{change.toLocaleString('id-ID')}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Total - Compact */}
        <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-xs text-foreground">Total</span>
            </div>
            <span className="text-base font-bold text-primary tabular-nums">
              Rp{total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Checkout Button - Compact */}
        <div className="space-y-1.5">
          {/* Print Status */}
          {printStatus !== 'idle' && (
            <div className={`p-2 rounded-lg text-xs ${
              printStatus === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
              printStatus === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
              'bg-blue-500/10 text-blue-600 border border-blue-500/20'
            }`}>
              <div className="flex items-center gap-1.5">
                {printStatus === 'printing' && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {printStatus === 'success' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {printStatus === 'error' && <X className="w-3 h-3" />}
                <span>{printMessage}</span>
              </div>
            </div>
          )}

          {/* Browser Support Warning */}
          {!isWebSerialSupported() && (
            <div className="p-2 rounded-lg text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <p className="font-medium mb-0.5">💡 Tips:</p>
              <p>Gunakan Chrome/Edge untuk print otomatis.</p>
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-9 text-xs font-bold bg-gradient-to-r from-primary to-primary/90 
                     hover:from-primary/90 hover:to-primary shadow-sm
                     transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={loading || (paymentMethod === 'cash' && (!amountPaid || change < 0))}
            onClick={handleCheckout}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Bayar & Cetak
              </span>
            )}
          </Button>

          {/* Alternative Print Options - Compact */}
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-xs h-7"
              onClick={handlePrintPreview}
              disabled={items.length === 0}
            >
              <Printer className="w-3 h-3" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-xs h-7"
              onClick={() => {
                const paid = paymentMethod === 'cash' ? parseInt(amountPaid.replace(/\D/g, '')) : undefined
                import('@/lib/printer/thermal-usb').then(({ printThermalUSB }) => {
                  printThermalUSB({
                    storeName,
                    cashierName,
                    date: new Date().toLocaleString('id-ID'),
                    items: items.map(item => ({
                      name: item.item.name,
                      qty: item.qty,
                      price: item.item.selling_price
                    })),
                    total,
                    paymentMethod,
                    amountPaid: paid,
                    change: paid ? paid - total : 0
                  })
                })
              }}
              disabled={items.length === 0}
            >
              <Download className="w-3 h-3" />
              Simpan
            </Button>
          </div>
        </div>

        {/* Clear Cart - Compact */}
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Kosongkan
        </button>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-4 max-w-xs w-full shadow-2xl">
            <h3 className="text-base font-semibold mb-1">Kosongkan Keranjang?</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Semua item akan dihapus. Lanjutkan?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowConfirm(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 text-xs"
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
