'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { 
  ShoppingCart, 
  Keyboard, 
  Store,
  Clock,
  User,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductCard } from '@/components/pos/ProductCard'
import { CategoryFilter } from '@/components/pos/CategoryFilter'
import { CartPanel } from '@/components/pos/CartPanel'
import { SearchBar } from '@/components/pos/SearchBar'
import type { ItemPublic, CartItem, Category } from '@/types'

export default function CashierPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCart, setShowCart] = useState(false)
  
  // Products state
  const [products, setProducts] = useState<ItemPublic[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ItemPublic[]>([])
  const [categories, setCategories] = useState<{ category: Category; count: number }[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [productsLoading, setProductsLoading] = useState(true)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true)
        console.log('[Cashier] Loading products...')
        
        // Get all items with stock > 0
        const { data: items, error } = await supabase
          .from('items')
          .select('id, name, selling_price, stock, category, image_url')
          .gt('stock', 0)
          .order('name')

        if (error) {
          console.error('[Cashier] Error loading products:', error)
          showToast('Gagal memuat produk: ' + error.message, 'error')
        } else {
          console.log('[Cashier] Loaded items:', items)
          const productsData = (items as ItemPublic[]) || []
          setProducts(productsData)
          setFilteredProducts(productsData)
          
          // Calculate categories
          const categoryCounts = productsData.reduce((acc, item) => {
            const cat = item.category || 'Lainnya'
            acc[cat] = (acc[cat] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const cats = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category: category as Category, count }))
            .sort((a, b) => b.count - a.count)
          
          setCategories(cats)
        }
      } catch (err) {
        console.error('[Cashier] Unexpected error:', err)
        showToast('Terjadi kesalahan saat memuat produk', 'error')
      } finally {
        setProductsLoading(false)
      }
    }
    
    loadProducts()
  }, [supabase])

  // Filter products by category and search
  useEffect(() => {
    let filtered = products
    
    // Filter by category
    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredProducts(filtered)
  }, [selectedCategory, searchQuery, products])

  // Cart handlers
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

  const handleClear = useCallback(() => {
    setCart([])
    showToast('Keranjang dikosongkan', 'success')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== 'F5' && e.key !== 'Escape' && e.key !== 'F6') return
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'F2':
          e.preventDefault()
          if (cart.length > 0) {
            const lastItem = cart[cart.length - 1]
            if (lastItem.qty < lastItem.item.stock) {
              handleQtyChange(lastItem.item.id, lastItem.qty + 1)
            }
          }
          break
        case 'F3':
          e.preventDefault()
          if (cart.length > 0) {
            const lastItem = cart[cart.length - 1]
            handleRemove(lastItem.item.id)
          }
          break
        case 'F6':
          e.preventDefault()
          setShowShortcuts(prev => !prev)
          break
        case 'Delete':
          if (e.ctrlKey && cart.length > 0) {
            e.preventDefault()
            handleClear()
          }
          break
        case 'Escape':
          if (showShortcuts) setShowShortcuts(false)
          if (showCart) setShowCart(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, handleQtyChange, handleRemove, handleClear, showShortcuts, showCart])

  // Checkout handler
  const handleCheckout = async (paymentMethod: 'cash' | 'transfer', amountPaid?: number) => {
    if (cart.length === 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart,
          payment_method: paymentMethod,
          amount_paid: amountPaid
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error ?? 'Transaksi gagal.', 'error')
        throw new Error(data.error)
      }

      // Clear cart after successful transaction
      setCart([])
      setShowCart(false)
      
      // Reload products to update stock after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      return data
    } finally {
      setLoading(false)
    }
  }

  // Current time - client only to avoid hydration mismatch
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cartTotal = cart.reduce((sum, item) => sum + item.item.selling_price * item.qty, 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-14 sm:h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-foreground">KASIR</h1>
              <p className="text-xs text-muted-foreground">Proses transaksi penjualan</p>
            </div>
            <h1 className="font-bold text-base sm:hidden text-foreground">KASIR</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          {/* Time - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
          </div>

          {/* Keyboard shortcut hint - hidden on mobile */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground 
                     hover:text-foreground hover:bg-muted transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shortcuts</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F6</kbd>
          </button>

          {/* User */}
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-6 sm:border-l border-border/50">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-muted-foreground">Kasir</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Cart Toggle Button */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {cartItemCount} item{cartItemCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          <span>{showCart ? 'Tutup' : 'Lihat Keranjang'}</span>
          {showCart ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Products Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${showCart ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search and Filter */}
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 shrink-0">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari produk..."
              inputRef={searchInputRef}
            />
            
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pt-0" style={{ minHeight: '300px' }}>
            {productsLoading ? (
              <div className="h-full flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Memuat produk...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8 min-h-[300px]">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-4 sm:mb-6">
                  <ShoppingCart className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {searchQuery 
                    ? 'Coba kata kunci lain atau pilih kategori berbeda untuk mencari produk'
                    : 'Silakan tambah produk terlebih dahulu di menu Admin → Stok Barang'
                  }
                </p>
                {!searchQuery && (
                  <button 
                    onClick={() => window.location.href = '/items'}
                    className="mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
                  >
                    Tambah Produk
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="stagger-item"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard item={product} onAdd={handleAdd} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel - Desktop: Always visible, Mobile: Toggleable */}
        <div className={`${showCart ? 'fixed inset-0 z-40 bg-background lg:static lg:inset-auto' : 'hidden lg:flex'} w-full lg:w-[400px] border-l border-border/50 bg-card/30 backdrop-blur-sm flex-col shrink-0`}>
          {/* Mobile Cart Header */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-border/50 bg-card">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="font-medium">Keranjang ({cartItemCount})</span>
            </div>
            <button
              onClick={() => setShowCart(false)}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 sm:p-4 h-full overflow-hidden flex flex-col">
            <CartPanel
              items={cart}
              onQtyChange={handleQtyChange}
              onRemove={handleRemove}
              onClear={handleClear}
              onCheckout={handleCheckout}
              loading={loading}
              storeName="Koperasi Gym"
              cashierName="Administrator"
            />
          </div>
        </div>
      </div>

      {/* Mobile Cart Summary Bar */}
      {cart.length > 0 && !showCart && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 p-3 z-30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total ({cartItemCount} item)</p>
              <p className="text-lg font-bold">
                Rp{cartTotal.toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div 
          className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 max-w-sm rounded-xl px-4 py-3 text-sm shadow-2xl z-50 
                     animate-slide-in backdrop-blur-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-500/95 text-white border-emerald-400/50' 
              : 'bg-destructive/95 text-white border-destructive-foreground/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.msg}
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <Keyboard className="w-6 h-6 text-primary" />
                Shortcut Keyboard
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { key: 'F1', desc: 'Fokus ke pencarian barang' },
                { key: 'F2', desc: 'Tambah qty item terakhir' },
                { key: 'F3', desc: 'Hapus item terakhir' },
                { key: 'F6', desc: 'Tampilkan shortcut ini' },
                { key: 'Ctrl + Del', desc: 'Kosongkan keranjang' },
                { key: 'Esc', desc: 'Tutup dialog ini' },
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <kbd className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-mono font-bold">
                    {shortcut.key}
                  </kbd>
                  <span className="text-sm text-muted-foreground">{shortcut.desc}</span>
                </div>
              ))}
            </div>
            
            <p className="mt-6 text-xs text-muted-foreground text-center">
              Shortcut aktif saat tidak sedang mengetik di input
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
