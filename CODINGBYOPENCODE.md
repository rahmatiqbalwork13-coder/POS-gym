# CODINGBYOPENCODE.md
Dokumentasi perubahan, fitur, dan fix yang dilakukan oleh OpenCode (Kimi) selama development POS Koperasi Gym.
Dibuat sebagai referensi untuk AI lain dan developer.

---

## 1. Pembuatan Halaman Stock Management

**Konteks:** Menu "Stoking" ada di sidebar tapi halaman `/stock` belum ada (404 error).

**Perubahan:**
- Buat folder `src/app/(admin)/stock/`
- Buat `page.tsx` dengan role protection (superadmin, admin)
- Buat `StockClient.tsx` dengan fitur:
  - Tab Inventori: Lihat stok, filter stok rendah, search barang
  - Tab Riwayat: Lihat history perubahan stok
  - Modal adjust stok (tambah/kurangi dengan keterangan)
- Buat API endpoints:
  - `POST /api/stock/adjust` - Update stok dan catat history
  - `GET /api/stock/history` - Ambil riwayat perubahan stok

**Lesson:** Selalu cek apakah route yang direferensikan di sidebar sudah ada implementasinya.

---

## 2. Fitur Cetak Ulang Struk di Transaksi

**Konteks:** User ingin mencetak ulang struk transaksi yang sudah selesai.

**Perubahan:**
- Tambah fungsi `handlePrintReprint()` di `TransactionsClient.tsx`
- Fungsi ini fetch detail transaksi lengkap dari API kemudian panggil `handlePrint()`
- Tambah tombol cetak (icon Receipt) di kolom aksi setiap baris transaksi
- Tombol cetak tersedia untuk semua user (bukan hanya superadmin)

**Lesson:** Reuse fungsi yang sudah ada (handlePrint) daripada duplikasi kode.

---

## 3. Tampilan Mobile Responsive

**Konteks:** Aplikasi hanya dioptimalkan untuk desktop, tampilan mobile rusak.

**Perubahan pada komponen:**

### Sidebar (`src/components/layout/Sidebar.tsx`)
- Tambah mobile header dengan hamburger menu
- Sidebar menjadi drawer slide dari kiri di mobile
- Overlay backdrop saat sidebar terbuka
- Navigation menu dengan tap target yang lebih besar

### Halaman Transaksi (`TransactionsClient.tsx`)
- Desktop: Tabel tetap seperti semula
- Mobile: Card view dengan informasi ringkas
- Modal detail responsif (padding, typography lebih kecil)
- Pagination full-width di mobile

### Halaman Items (`ItemsClient.tsx`)
- Mobile: Card view per item dengan harga dan stok
- Desktop: Tabel tetap seperti semula
- Modal form responsif dengan scroll

### Halaman Stock (`StockClient.tsx`)
- Mobile: Card view untuk inventory dan history
- Tab Inventori/Riwayat tetap berfungsi di kedua tampilan
- Tombol stok masuk/keluar full-width di mobile

### Layout Admin (`src/app/(admin)/layout.tsx`)
- Tambahkan `pt-16 lg:pt-0` untuk memberi ruang mobile header

**Lesson:** Gunakan pattern "Mobile-first" atau "Desktop-first" yang konsisten. Pisahkan tampilan dengan class `hidden lg:block` (desktop) dan `lg:hidden` (mobile).

---

## 4. Setup Progressive Web App (PWA)

**Konteks:** Aplikasi perlu bisa di-install dan berjalan offline.

**File yang dibuat:**
- `public/manifest.json` - Konfigurasi PWA (name, icons, display mode)
- `public/sw.js` - Service worker untuk caching dan offline support
- `src/components/pwa/ServiceWorkerRegistration.tsx` - Registrasi SW
- `public/icons/icon-192x192.svg` dan `icon-512x512.svg` - App icons

**Update:**
- `src/app/layout.tsx` - Tambah metadata PWA, viewport config, apple-mobile-web-app tags

**Fitur PWA:**
- Installable (Add to Home Screen)
- Standalone display mode (tanpa browser chrome)
- Theme color dan background color
- Offline capable untuk navigasi dasar

**Lesson:** Buat route API dinamis untuk manifest.json jika file statis bermasalah: `src/app/manifest.json/route.ts`.

---

## 5. Dashboard dengan Data Real-time

**Konteks:** Dashboard sebelumnya hardcoded, perlu data nyata dari database.

**Perubahan:**
- `DashboardClient.tsx`:
  - 4 stat cards: Total Pendapatan, Laba Kotor, Transaksi, Rata-rata Ticket
  - Chart Pendapatan & Laba 6 bulan terakhir
  - Distribusi Laba (SHU 50/30/20) dengan progress bars
  - Produk Terlaris Bulan Ini
  - Aktivitas Terbaru

- `page.tsx` (server component):
  - Fetch transaksi bulan ini dan bulan lalu untuk perbandingan
  - Hitung persentase perubahan (trend up/down)
  - Fetch top 5 produk terlaris
  - Fetch 5 transaksi terakhir
  - Hitung margin laba: (Laba / Pendapatan) × 100

**Lesson:** Pisahkan data fetching (server) dan presentation (client). Gunakan useEffect untuk re-fetch saat filter berubah.

---

## 6. Warna Dashboard Sesuai Brand

**Konteks:** Dashboard perlu konsisten dengan warna brand Biru Royal + Kuning Emas.

**Skema warna:**
- Primary (Biru Royal): `hsl(224 68% 40%)` - Header, stat cards pendapatan & transaksi
- Secondary (Kuning Emas): `hsl(44 96% 52%)` - Stat card laba, chart bar laba
- Progress bars:
  - SHU: Kuning Emas
  - Dana Cadangan: Biru Royal
  - Operasional: Abu-abu

**Lesson:** Gunakan HSL values langsung untuk warna yang konsisten. Hindari hardcode hex colors.

---

## 7. Laporan Penjualan Lengkap

**Konteks:** Laporan perlu bisa filter per hari, rentang tanggal, bulan, tahun, dan per item.

**Fitur yang ditambahkan:**
- Filter tabs: Per Hari, Rentang Tanggal, Per Bulan, Per Tahun, Per Item
- Laporan Per Item: Pilih barang, lihat penjualan harian untuk barang tersebut
- Summary cards: Total Transaksi, Pendapatan, Laba, Tunai, Transfer
- Expandable daily reports: Klik tanggal untuk lihat detail transaksi
- Export CSV untuk semua jenis laporan

**API Queries:**
- Fetch transaksi dengan `profiles(full_name)` untuk nama kasir
- Fetch `transaction_items` dengan `items(name)` untuk laporan per item
- Group by date di client-side untuk laporan harian

**Lesson:** Untuk Supabase queries dengan relations, gunakan sintaks:
```ts
.select(`
  id, total_amount, 
  profiles(full_name),
  transaction_items(qty, items(name))
`)
```

---

## 8. Sidebar Collapsible

**Konteks:** User ingin bisa collapse sidebar untuk ruang kerja lebih luas.

**Implementasi:**
- Toggle collapse dengan tombol burger menu (icon Menu) di sebelah kiri logo
- State `isCollapsed` disimpan di localStorage untuk persistensi
- Desktop saja: `hidden lg:flex` untuk tombol toggle

**Tampilan Collapsed:**
- Lebar: 80px (w-20)
- Hanya icon logo tanpa teks
- Section "Administrator" disembunyikan
- Menu hanya icon tanpa label
- Tooltip otomatis dari browser (title attribute)

**Tampilan Expanded:**
- Lebar: 256px (w-64)
- Logo + teks "GYMPOS" + "Koperasi Gym"
- Section user lengkap
- Menu icon + label

**Hydration Fix:**
- Gunakan `suppressHydrationWarning` pada elemen yang berbeda antara server dan client render
- Gunakan `isClient` state untuk kondisi client-side only

**Lesson:** Selalu gunakan `suppressHydrationWarning` untuk elemen dengan state yang berbeda SSR vs Client.

---

## 9. Fix Keranjang Tidak Bisa Scroll

**Konteks:** Daftar barang di keranjang terpotong di desktop.

**Root Cause:** Cart panel tidak memiliki tinggi yang cukup (`h-screen`) sehingga items list tidak bisa scroll.

**Fix:**
```tsx
// cashier/page.tsx
<div className="... lg:w-[400px] lg:h-screen ...">
```

**Lesson:** Pastikan container memiliki explicit height atau `h-screen`/`h-full` agar child dengan `overflow-y-auto` bisa bekerja.

---

## 10. Service Worker Cache Issues

**Konteks:** Error "Module factory not available" setelah update kode.

**Root Cause:** Service worker cache lama menyajikan chunk JS yang sudah tidak valid.

**Fix:**
1. Update cache name: `gympos-v1` → `gympos-v2`
2. Clear old caches di activate event
3. Always fetch fresh JS/CSS files:
```js
if (request.url.includes('.js') || request.url.includes('.css')) {
  return fetch(request).then(...).catch(() => cached)
}
```
4. Unregister old SW sebelum register baru di `ServiceWorkerRegistration.tsx`

**Lesson:** Setiap update besar, ganti cache name. JS/CSS selalu fetch fresh, jangan cache.

---

## 11. TypeScript Best Practices

### Interface untuk Partial Types
```ts
// Jangan pakai type asli untuk subset data
interface ItemOption {
  id: string
  name: string
}
// Gunakan ini untuk dropdown daripada Item (yang punya banyak field)
```

### Error Handling dengan Type
```ts
try {
  // ... fetch data
} catch (err: any) {
  setError(err.message || 'Terjadi kesalahan')
}
```

---

## 12. Layout Pattern untuk Dashboard

**Struktur Grid yang Efektif:**
```tsx
{/* 4 stat cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

{/* Chart + Distribution */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Chart */}</div>
  <div>{/* Distribution */}</div>
</div>

{/* Two column layout */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

---

## 13. CartPanel Lebih Compact

**Konteks:** CartPanel terlalu besar, daftar items terpotong dan tidak terlihat optimal.

**Perubahan:**
- **Header:** Icon w-4, font text-sm, margin mb-2
- **Items:** Padding p-2, icon w-8, font text-xs, spacing space-y-1.5
- **Qty buttons:** w-5 h-5 (dari w-7 h-7)
- **Payment:** Label dipersingkat, padding dikurangi
- **Total:** Font text-base (dari text-2xl), padding p-2
- **Buttons:** Height h-9 (dari h-14), font text-xs
- **Wrapper padding:** p-2 (dari p-3 sm:p-4)

**Lesson:** Gunakan ukuran yang lebih kecil untuk komponen yang sering digunakan dan butuh space efficiency.

---

## Pola Umum yang Ditemukan

| # | Pola | Solusi |
|---|---|---|
| 1 | Halaman belum dibuat tapi menu sudah ada | Buat page.tsx dengan role protection |
| 2 | Tampilan mobile rusak | Gunakan card view untuk mobile, table untuk desktop |
| 3 | Data hardcoded | Fetch dari Supabase dengan useEffect |
| 4 | Warna tidak konsisten | Gunakan HSL brand colors langsung |
| 5 | Hydration mismatch | Gunakan `suppressHydrationWarning` dan `isClient` state |
| 6 | Cache browser outdated | Update SW cache name, clear old caches |
| 7 | Container tidak scroll | Pastikan ada explicit height (h-screen/h-full) |
| 8 | Supabase RLS error | Cek policy, gunakan service role untuk admin ops |

---

## Checklist Sebelum Selesai

- [ ] Semua route di sidebar sudah ada implementasinya
- [ ] Tampilan mobile sudah responsive (card view)
- [ ] Data sudah fetch dari database (tidak hardcoded)
- [ ] Warna sudah sesuai brand (Biru + Kuning)
- [ ] Tidak ada hydration mismatch
- [ ] Service worker cache name sudah diupdate jika perlu
- [ ] Scroll area sudah bisa di-scroll
- [ ] Icon yang digunakan sudah ada di bundle (cek Sidebar.tsx)
