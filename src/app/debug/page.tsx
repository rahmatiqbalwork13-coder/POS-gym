'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [items, setItems] = useState<unknown[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const addLog = (msg: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    }

    const testConnection = async () => {
      addLog('🔄 Memulai test koneksi...')
      
      // Test 1: Check auth
      addLog('📝 Mengecek autentikasi...')
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        addLog(`✅ User terautentikasi: ${user.email}`)
      } else {
        addLog('⚠️ User belum login')
      }

      // Test 2: Try to fetch items
      addLog('📦 Mencoba mengambil data items...')
      const { data, error } = await supabase
        .from('items')
        .select('id, name, selling_price, stock')
        .gt('stock', 0)
        .order('name')
        .limit(50)

      if (error) {
        addLog(`❌ Error: ${error.message}`)
        addLog(`🔍 Error code: ${error.code}`)
        setError(error.message)
      } else {
        addLog(`✅ Berhasil! Ditemukan ${data?.length ?? 0} items`)
        setItems(data || [])
      }

      // Test 3: Check all items (including stock = 0)
      addLog('📊 Mengecek total items di database...')
      const { data: allData, error: allError } = await supabase
        .from('items')
        .select('id, name, stock')

      if (!allError) {
        const total = allData?.length ?? 0
        const zeroStock = allData?.filter(i => (i as {stock: number}).stock === 0).length ?? 0
        addLog(`📈 Total items: ${total}, dengan stok 0: ${zeroStock}`)
      }
    }

    testConnection()
  }, [supabase])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Koneksi Database</h1>
      
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h2 className="font-semibold mb-2">Console Log:</h2>
        <pre className="text-sm whitespace-pre-wrap font-mono">
          {logs.join('\n') || 'Loading...'}
        </pre>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="font-semibold text-destructive mb-2">Error:</h2>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            Kemungkinan penyebab: RLS policy, auth issue, atau koneksi bermasalah
          </p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Items yang ditemukan ({items.length}):</h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tidak ada items</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Nama</th>
                  <th className="px-4 py-2 text-left">Harga</th>
                  <th className="px-4 py-2 text-left">Stok</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: unknown, idx) => {
                  const i = item as { id: string; name: string; selling_price: number; stock: number }
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{i.name}</td>
                      <td className="px-4 py-2">Rp{i.selling_price?.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2">{i.stock}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="font-semibold mb-1">Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Buka Console Browser (F12 → Console) untuk melihat log detail</li>
          <li>Pastikan migration 001 sudah dijalankan</li>
          <li>Periksa RLS policies di Supabase Dashboard</li>
          <li>Cek apakah items memiliki stock &gt; 0</li>
        </ul>
      </div>
    </div>
  )
}