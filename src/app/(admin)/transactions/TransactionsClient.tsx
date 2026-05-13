'use client'
import { useState, useEffect, useRef } from 'react'
import { Wallet, Eye, Calendar, User, CreditCard, Banknote, ChevronLeft, ChevronRight, X, Package, Pencil, Trash2, Printer, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction, TransactionItem, Role } from '@/types'

const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TransactionWithProfile extends Transaction {
  profiles?: { full_name: string | null } | null
}

interface TransactionDetail extends Transaction {
  profiles?: { full_name: string | null } | null
  transaction_items: (TransactionItem & { items: { name: string } })[]
}

interface UserSession {
  id: string
  role: Role
  full_name: string | null
}

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserSession | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [editForm, setEditForm] = useState<{
    id: string
    payment_method: 'cash' | 'transfer'
    amount_paid: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const limit = 20

  const isSuperadmin = user?.role === 'superadmin'

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?limit=${limit}&offset=${offset}`)
      const data = await res.json()
      if (res.ok) {
        setTransactions(data)
      } else {
        console.error('Error loading transactions:', data.error)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }

  useEffect(() => { 
    loadUser()
    loadTransactions() 
  }, [offset])

  const viewDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedTransaction(data)
      } else {
        console.error('Error loading transaction detail:', data.error)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setDetailLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?\n\nTindakan ini akan:\n- Menghapus data transaksi\n- Mengembalikan stok barang\n- Tidak dapat dibatalkan')) {
      return
    }

    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Transaksi berhasil dihapus')
        loadTransactions()
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal menghapus transaksi')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Gagal menghapus transaksi')
    }
  }

  const openEdit = (tx: TransactionWithProfile) => {
    setEditForm({
      id: tx.id,
      payment_method: tx.payment_method,
      amount_paid: tx.amount_paid?.toString() || tx.total_amount.toString(),
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm) return
    setIsSaving(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          payment_method: editForm.payment_method,
          amount_paid: Number(editForm.amount_paid),
        }),
      })

      if (res.ok) {
        setEditForm(null)
        loadTransactions()
        if (selectedTransaction?.id === editForm.id) {
          viewDetail(editForm.id)
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal mengupdate transaksi')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Gagal mengupdate transaksi')
    }
    setIsSaving(false)
  }

  const handlePrintReprint = async (tx: TransactionWithProfile) => {
    // Fetch full transaction details first
    try {
      const res = await fetch(`/api/transactions/${tx.id}`)
      if (res.ok) {
        const detail = await res.json()
        handlePrint(detail)
      } else {
        alert('Gagal mengambil detail transaksi untuk cetak ulang')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Gagal mencetak ulang')
    }
  }

  const handlePrint = (tx: TransactionDetail) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const itemsHtml = tx.transaction_items?.map(item => `
      <tr>
        <td>${item.items?.name || '-'}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">${currency(item.selling_price_at_time)}</td>
        <td style="text-align:right">${currency(item.selling_price_at_time * item.qty)}</td>
      </tr>
    `).join('') || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Transaksi - ${tx.id.slice(0, 8)}</title>
        <style>
          @media print {
            body { font-family: 'Courier New', monospace; font-size: 12px; }
            .no-print { display: none; }
          }
          body { max-width: 300px; margin: 0 auto; padding: 10px; }
          .center { text-align: center; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .footer { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 3px 0; }
          .totals { margin-top: 10px; }
          .totals div { display: flex; justify-content: space-between; }
          .btn { 
            display: block; 
            width: 100%; 
            padding: 10px; 
            margin-top: 20px; 
            background: #000; 
            color: #fff; 
            border: none; 
            cursor: pointer;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <h2 style="margin:0">GYMPOS</h2>
          <p style="margin:5px 0">Koperasi Gym</p>
          <p style="margin:5px 0;font-size:10px">${formatDate(tx.created_at)}</p>
        </div>
        
        <div style="margin-bottom:10px">
          <div>ID: ${tx.id.slice(0, 8).toUpperCase()}</div>
          <div>Kasir: ${tx.profiles?.full_name || '-'}</div>
          <div>Metode: ${tx.payment_method === 'cash' ? 'Tunai' : 'Transfer'}</div>
        </div>

        <table>
          <thead>
            <tr style="border-bottom:1px solid #000">
              <th style="text-align:left">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Harga</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div style="border-top:1px solid #000;margin-top:10px;padding-top:10px">
            <span><strong>TOTAL</strong></span>
            <span><strong>${currency(tx.total_amount)}</strong></span>
          </div>
          ${tx.amount_paid ? `
          <div>
            <span>Dibayar</span>
            <span>${currency(tx.amount_paid)}</span>
          </div>
          <div>
            <span>Kembalian</span>
            <span>${currency(tx.change_amount || 0)}</span>
          </div>
          ` : ''}
        </div>

        <div class="footer center">
          <p>Terima Kasih</p>
          <p style="font-size:10px">Barang yang sudah dibeli tidak dapat dikembalikan</p>
        </div>

        <button class="btn no-print" onclick="window.print()">Cetak Struk</button>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-primary" />
          <h1 className="text-lg lg:text-xl font-semibold">Daftar Transaksi</h1>
        </div>
        {isSuperadmin && (
          <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-1.5 rounded-full w-fit">
            Mode Superadmin - Edit, Hapus & Cetak Ulang Aktif
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Edit Transaksi</h2>
              <button 
                onClick={() => setEditForm(null)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Metode Pembayaran</label>
                <select
                  value={editForm.payment_method}
                  onChange={e => setEditForm(f => f ? { ...f, payment_method: e.target.value as 'cash' | 'transfer' } : f)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="cash">Tunai</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Jumlah Dibayar (Rp)</label>
                <input
                  type="number"
                  value={editForm.amount_paid}
                  onChange={e => setEditForm(f => f ? { ...f, amount_paid: e.target.value } : f)}
                  min={0}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditForm(null)}>Batal</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base lg:text-lg">Detail Transaksi</h2>
              <div className="flex items-center gap-2">
                {isSuperadmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(selectedTransaction)}
                    className="gap-1.5 hidden sm:flex"
                  >
                    <Printer className="size-4" /> Cetak
                  </Button>
                )}
                <button 
                  onClick={() => setSelectedTransaction(null)} 
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Memuat detail...</p>
            ) : (
              <div className="space-y-4">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-3 lg:gap-4 p-3 lg:p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">ID Transaksi</p>
                    <p className="font-medium text-sm">{selectedTransaction.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="font-medium text-sm">{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kasir</p>
                    <p className="font-medium text-sm">{selectedTransaction.profiles?.full_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Metode Pembayaran</p>
                    <div className="flex items-center gap-1.5">
                      {selectedTransaction.payment_method === 'cash' ? (
                        <Banknote className="size-4 text-green-600" />
                      ) : (
                        <CreditCard className="size-4 text-blue-600" />
                      )}
                      <span className="font-medium text-sm capitalize">
                        {selectedTransaction.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-sm lg:text-base">
                    <Package className="size-4" />
                    Item yang Dibeli
                  </h3>
                  
                  {/* Mobile: Card View */}
                  <div className="lg:hidden space-y-2">
                    {selectedTransaction.transaction_items?.map((item) => (
                      <div key={item.id} className="bg-muted/30 rounded-lg p-3 space-y-1">
                        <p className="font-medium text-sm">{item.items?.name || '-'}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.qty} x {currency(item.selling_price_at_time)}</span>
                          <span className="font-medium text-foreground">{currency(item.selling_price_at_time * item.qty)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Barang</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Harga</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedTransaction.transaction_items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2">{item.items?.name || '-'}</td>
                            <td className="px-4 py-2 text-right">{item.qty}</td>
                            <td className="px-4 py-2 text-right">{currency(item.selling_price_at_time)}</td>
                            <td className="px-4 py-2 text-right font-medium">
                              {currency(item.selling_price_at_time * item.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold text-lg">{currency(selectedTransaction.total_amount)}</span>
                  </div>
                  {selectedTransaction.amount_paid && selectedTransaction.amount_paid > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dibayar</span>
                        <span>{currency(selectedTransaction.amount_paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kembalian</span>
                        <span className="text-green-600">{currency(selectedTransaction.change_amount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile Print Button */}
                {isSuperadmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(selectedTransaction)}
                    className="gap-1.5 w-full sm:hidden"
                  >
                    <Printer className="size-4" /> Cetak Ulang Struk
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-sm text-muted-foreground">Memuat data...</span>
        </div>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="lg:hidden space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="size-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada transaksi.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">#{tx.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm font-medium">{formatDateShort(tx.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                      {tx.payment_method === 'cash' ? (
                        <Banknote className="size-3.5 text-green-600" />
                      ) : (
                        <CreditCard className="size-3.5 text-blue-600" />
                      )}
                      <span className="text-xs capitalize">
                        {tx.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="size-4" />
                    <span>{tx.profiles?.full_name || '-'}</span>
                  </div>

                  {/* Total & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{currency(tx.total_amount)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewDetail(tx.id)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Lihat detail"
                      >
                        <Eye className="size-5" />
                      </button>
                      <button
                        onClick={() => handlePrintReprint(tx)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        title="Cetak ulang struk"
                      >
                        <Receipt className="size-5" />
                      </button>
                      {isSuperadmin && (
                        <>
                          <button
                            onClick={() => openEdit(tx)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            title="Edit"
                          >
                            <Pencil className="size-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Hapus"
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden lg:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Kasir
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Metode
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{tx.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {formatDate(tx.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground" />
                          {tx.profiles?.full_name || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {tx.payment_method === 'cash' ? (
                            <Banknote className="size-3.5 text-green-600" />
                          ) : (
                            <CreditCard className="size-3.5 text-blue-600" />
                          )}
                          <span className="capitalize">
                            {tx.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {currency(tx.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => viewDetail(tx.id)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Lihat detail"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => handlePrintReprint(tx)}
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            title="Cetak ulang struk"
                          >
                            <Receipt className="size-4" />
                          </button>
                          {isSuperadmin && (
                            <>
                              <button
                                onClick={() => openEdit(tx)}
                                className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                title="Edit"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Hapus"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Menampilkan {transactions.length} transaksi
            </p>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="size-4 mr-1" /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={transactions.length < limit}
                className="flex-1 sm:flex-none"
              >
                Selanjutnya <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
