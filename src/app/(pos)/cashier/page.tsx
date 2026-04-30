'use client'
import { useState, useCallback } from 'react'
import { Printer, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemSearch } from '@/components/pos/ItemSearch'
import { Cart } from '@/components/pos/Cart'
import { printThermalUSB } from '@/lib/printer/thermal-usb'
import type { CartItem } from '@/types'

export default function CashierPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleAdd = useCallback((incoming: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === incoming.item.id)
      if (existing) {
        const newQty = existing.qty + 1
        if (newQty > existing.item.stock) return prev
        return prev.map(c => c.item.id === incoming.item.id ? { ...c, qty: newQty } : c)
      }
      return [...prev, incoming]
    })
  }, [])

  const handleQtyChange = useCallback((itemId: string, qty: number) => {
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, qty } : c))
  }, [])

  const handleRemove = useCallback((itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId))
  }, [])

  const total = cart.reduce((sum, c) => sum + c.item.selling_price * c.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error ?? 'Transaksi gagal.', 'error')
        return
      }

      // Attempt USB print (non-blocking — transaction already saved)
      try {
        await printThermalUSB({
          storeName: 'Koperasi Gym',
          cashierName: 'Kasir',
          date: new Date().toLocaleString('id-ID'),
          items: cart.map(c => ({
            name: c.item.name,
            qty: c.qty,
            price: c.item.selling_price,
          })),
          total: data.totalAmount,
        })
      } catch (printerErr) {
        showToast(
          `Transaksi berhasil! Printer error: ${printerErr instanceof Error ? printerErr.message : 'Printer tidak terkoneksi.'}`,
          'success'
        )
        setCart([])
        return
      }

      showToast('Transaksi berhasil dan struk dicetak!', 'success')
      setCart([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-2">
        <ShoppingBag className="size-5 text-primary" />
        <h1 className="font-semibold text-lg">Kasir</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: search */}
        <div className="flex-1 p-6 overflow-auto border-r border-border">
          <div className="max-w-lg">
            <p className="text-sm text-muted-foreground mb-3">Cari barang dan tambahkan ke keranjang</p>
            <ItemSearch onAdd={handleAdd} />
          </div>
        </div>

        {/* Right: cart + checkout */}
        <div className="w-80 flex flex-col p-4 gap-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Keranjang</p>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 className="size-3" /> Kosongkan
              </button>
            )}
          </div>

          <Cart items={cart} onQtyChange={handleQtyChange} onRemove={handleRemove} />

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>Rp{total.toLocaleString('id-ID')}</span>
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={cart.length === 0 || loading}
              onClick={handleCheckout}
            >
              <Printer className="size-4" />
              {loading ? 'Memproses...' : 'Bayar & Cetak Struk'}
            </Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg text-white z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-destructive'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
