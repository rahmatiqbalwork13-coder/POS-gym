# CODINGBYCLAUDE.md
Catatan bug, root cause, dan fix yang ditemukan selama development POS Koperasi Gym.
Dibuat agar AI lain (atau developer) dapat belajar dari kesalahan yang sama.

---

## 1. Tailwind v4 — `@apply border-border` Error

**Konteks:** Upgrade dari Tailwind v3 ke v4.

**Error:**
```
CssSyntaxError: Cannot apply unknown utility class 'border-border'
```

**Root Cause:**
Tailwind v4 tidak menggunakan `tailwind.config.js` dan direktif `@tailwind`. Konfigurasi
dilakukan sepenuhnya di CSS via `@import "tailwindcss"` dan blok `@theme`. Custom color
yang didefinisikan lewat CSS variable (`--border`, `--primary`, dll.) tidak otomatis
menjadi utility class sampai didaftarkan di `@theme`.

**Fix:**
1. Hapus `tailwind.config.js` (konflik dengan v4)
2. Ganti `@tailwind base/components/utilities` dengan `@import "tailwindcss"` di `globals.css`
3. Daftarkan semua custom color di blok `@theme { --color-border: ...; }` agar bisa dipakai sebagai `border-border`, `bg-primary`, dll.
4. Ganti `@apply border-border` dengan `border-color: hsl(var(--border))` langsung

---

## 2. Next.js 16 — `middleware.ts` Diganti `proxy.ts`

**Konteks:** Next.js 16.x (App Router).

**Root Cause:**
Next.js 16 mengganti nama file `middleware.ts` menjadi `proxy.ts`. Jika masih pakai
`middleware.ts`, route protection tidak berjalan.

**Fix:**
Rename ke `src/proxy.ts`. Export fungsi dengan nama `proxy` (bukan `middleware`).
Config matcher tetap sama:
```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 3. Supabase SSR — Cookie Pattern Deprecated

**Konteks:** `@supabase/ssr` versi terbaru.

**Root Cause:**
Method `get/set/remove` cookie sudah deprecated. Wajib pakai `getAll/setAll`.

**Fix:**
```ts
// ❌ Lama (deprecated)
cookies: { get(name) {...}, set(name, value, options) {...}, remove(name, options) {...} }

// ✅ Baru
cookies: {
  getAll() { return request.cookies.getAll() },
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    )
  }
}
```

---

## 4. TypeScript — Dynamic FormState Cast Error

**Konteks:** `UsersClient.tsx` form field dengan dynamic key access.

**Error:**
```
Conversion of type 'FormState' to type 'Record<string, string>' may be a mistake
```

**Root Cause:**
Mencoba cast `FormState` ke `Record<string, string>` untuk akses dinamis (`form[fieldName]`)
— TypeScript menolak karena type tidak compatible.

**Fix:**
Hapus dynamic form array. Gunakan input field explicit per field (Nama, Email, Password).
Tidak ada casting, tidak ada dynamic key access. Lebih aman dan lebih readable.

---

## 5. Vercel — Deploy Masih Build Commit Lama

**Konteks:** Setelah push fix ke GitHub.

**Root Cause:**
Tombol "Redeploy" di Vercel men-deploy commit yang SAMA (bukan commit terbaru).
Perubahan baru di GitHub tidak otomatis ter-deploy lewat tombol Redeploy.

**Fix:**
Tunggu auto-deploy triggered by GitHub push. Atau pergi ke Vercel Dashboard →
tab "Deployments" → pilih commit terbaru → deploy dari situ.
Jangan pakai tombol Redeploy pada deployment lama.

---

## 6. Turbopack — "Module Factory Not Available" untuk Icon Baru

**Konteks:** Next.js 16 dengan Turbopack dev server.

**Error:**
```
Module [project]/node_modules/lucide-react/dist/esm/icons/chevron-left.mjs
was instantiated because it was required from Sidebar.tsx, but the module
factory is not available.
```

**Root Cause:**
Turbopack me-lazy-compile icon dari lucide-react. Ketika icon baru diimport
untuk pertama kali, Turbopack belum punya "factory"-nya di cache. Halaman jadi
crash atau tampil blank tanpa error message yang jelas.

**Contoh icon yang menyebabkan masalah:** `ChevronLeft`, `KeyRound`, `Eye`, `EyeOff`

**Fix:**
- Jangan menambah icon baru ke client component yang sudah berjalan — gunakan icon
  yang sudah diimport di file lain dalam bundle yang sama (shared layout = Sidebar.tsx)
- Icon yang AMAN (ada di Sidebar = shared chunk): `X`, `Menu`, `Users`, `Package`,
  `BarChart3`, `LogOut`, `Wallet`, `ClipboardList`, `ShoppingCart`
- Jika terpaksa tambah icon baru: hard refresh browser (Ctrl+Shift+R) atau restart
  dev server (`npm run dev`)

---

## 7. Sidebar — Burger Menu Tidak Bisa Diklik

**Konteks:** Mobile sidebar dengan toggle button di header.

**Root Cause:**
`<aside>` memiliki dua class position yang konflik: `sticky top-0` (base) dan
`fixed left-0 top-0` (juga base, tanpa prefix lg). Tailwind v4 menghasilkan `.sticky`
SETELAH `.fixed` di CSS file, sehingga `position: sticky` menang di mobile.

Dengan `position: sticky`, `<aside>` tetap berada dalam flow layout meskipun secara
visual ter-translate off-screen via `-translate-x-full`. Elemen di `z-50` ini menimpa
`<header>` di `z-40`, sehingga burger button tidak bisa diklik.

**Fix:**
- Hapus `sticky top-0` dari base classes
- Gunakan `fixed` HANYA untuk mobile: `"fixed left-0 top-0 z-[55] w-72"`
- Override ke `relative` di desktop: `"lg:relative lg:top-auto lg:translate-x-0 lg:z-auto"`
- Beri mobile header z-index tertinggi: `z-[60]`
- Beri explicit width mobile: `w-72` (agar `-translate-x-full` bekerja prediktabel)

---

## 8. Layout — Halaman Tidak Bisa Di-scroll

**Konteks:** Admin dan POS layout dengan sidebar.

**Root Cause:**
`<main className="flex-1 overflow-hidden ...">` menggunakan `overflow-hidden`,
yang men-clip semua konten yang melebihi viewport. Konten ada tapi tidak bisa diakses.

**Fix:**
Ganti ke `overflow-y-auto`:
```tsx
<main className="flex-1 overflow-y-auto bg-background pt-16 lg:pt-0">
```
Outer flex container tetap `overflow-hidden` untuk mencegah horizontal scroll.

---

## 9. Proxy.ts — Role `superadmin` Diblokir

**Konteks:** Route protection di `proxy.ts`.

**Root Cause:**
```ts
// Kode lama — hanya izinkan string exact 'admin'
if (isAdminOnly && role !== 'admin') {
  return NextResponse.redirect(...)
}
```
User dengan role `superadmin` diblokir karena `'superadmin' !== 'admin'`.

**Fix:**
Gunakan lookup table yang eksplisit:
```ts
const ROUTE_ROLES = [
  { prefix: '/users',   allowed: ['superadmin', 'admin'] },
  { prefix: '/items',   allowed: ['superadmin', 'admin', 'staff'] },
  // dst.
]
const matched = ROUTE_ROLES.find(r => pathname.startsWith(r.prefix))
if (matched && !matched.allowed.includes(role)) redirect(...)
```

---

## 10. Supabase — CHECK Constraint Tidak Mencakup Role Baru

**Konteks:** Menambah role `superadmin` ke sistem.

**Error:**
```
ERROR: 23514: new row for relation "profiles" violates check constraint "profiles_role_check"
```

**Root Cause:**
Migration awal mendefinisikan:
```sql
role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'ketua', 'staff'))
```
`'superadmin'` tidak ada dalam list, sehingga UPDATE atau INSERT dengan role baru ditolak.

**Fix:**
```sql
-- Hapus constraint lama
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Tambah constraint baru yang mencakup semua role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'ketua', 'staff'));
```
Lakukan sebelum UPDATE role user.

---

## 11. API Route — `verifyAdmin()` Tidak Mencakup `superadmin`

**Konteks:** `/api/users/route.ts` dan `/api/items/route.ts`.

**Root Cause:**
Helper function ditulis dengan hardcode string:
```ts
return profile?.role === 'admin' ? user : null
```
Superadmin dapat role yang berbeda tapi fungsionalitas sama (atau lebih), sehingga
terkena 403 Forbidden di semua endpoint yang dilindungi.

**Fix:**
```ts
const ALLOWED_ROLES = ['superadmin', 'admin']
return ALLOWED_ROLES.includes(profile?.role) ? { id: user.id, role } : null
```
Atau untuk endpoint dengan akses bertingkat (staff juga boleh):
```ts
const WRITE_ROLES = ['superadmin', 'admin', 'staff']
```

---

## 12. `manifest.json` — PWA Manifest Tidak Ada

**Konteks:** PWA setup di `layout.tsx`.

**Error di browser console:**
```
manifest.json:1 Manifest: Line: 1, column: 1, Syntax error.
```

**Root Cause:**
`layout.tsx` me-referensikan `manifest: '/manifest.json'` di metadata, tapi file
`public/manifest.json` tidak ada. Browser mendapat response HTML 404 dan gagal
parse sebagai JSON.

**Fix:**
Buat file `public/manifest.json` dengan konten yang valid. File `.bak` yang ada
bisa digunakan — cukup rename atau copy isinya.

---

## 13. Turbopack — Halaman Blank Tanpa Error (Icon Baru di Client Component)

**Konteks:** `UsersClient.tsx` setelah menambah `KeyRound`, `Eye`, `EyeOff`.

**Gejala:**
Halaman tampil sebagai gradient background kosong, tanpa pesan error sama sekali.
Berbeda dengan kasus ChevronLeft yang menampilkan error overlay — kali ini React
menelan exception di client component dan render kosong.

**Root Cause:**
Sama seperti kasus #6 (ChevronLeft) — Turbopack belum compile icon baru ke bundle.
Bedanya, client component ini tidak memunculkan error overlay, hanya render blank.

**Peraturan ketat untuk icon lucide-react di Turbopack:**
- Icon yang AMAN (ada di `Sidebar.tsx` = shared layout chunk, selalu di-bundle): 
  `X, Menu, Users, Package, BarChart3, LogOut, Wallet, ClipboardList, ShoppingCart, Dumbbell`
- Icon yang ada di `Sidebar.tsx` + halaman yang sama: AMAN
- Icon BARU yang tidak ada di bundle manapun: BERBAHAYA → halaman blank

**Fix:**
- Ganti `KeyRound` → `ShieldCheck` (sudah di bundle)
- Ganti `Eye`/`EyeOff` → gunakan checkbox HTML biasa untuk toggle password visibility
- Jika HARUS tambah icon baru: restart dev server (`npm run dev`) dulu sebelum test

---

## 14. Tampilan Sidebar Pucat / Warna Tidak Vibrant

**Konteks:** Sidebar menggunakan `bg-card/80` (putih semi-transparan), background
menggunakan gradient mesh dengan opacity terlalu rendah.

**Gejala:**
- Sidebar terlihat putih/abu, tidak ada identitas brand
- Background halaman terlihat sangat pucat (hampir putih)
- Gradient warna biru-kuning brand hampir tidak terlihat

**Root Cause:**
1. `--sidebar` CSS variable diset ke `0 0% 100%` (putih), tapi `Sidebar.tsx` tidak
   pakai `bg-sidebar` — malah pakai `bg-card/80`. Jadi sidebar var tidak berpengaruh.
2. `body::before` gradient mesh opacity `0.6` × warna opacity `0.35` = efektif hanya `0.21`
3. `--background: 220 30% 97%` terlalu terang (97% lightness)

**Fix:**
1. Ubah `--sidebar` ke dark navy brand: `224 60% 14%` 
2. Update semua `--sidebar-*` vars (foreground, accent, border, primary/gold)
3. Di `Sidebar.tsx`, ganti `bg-card/80 backdrop-blur-xl` → `bg-sidebar`
4. Ganti semua warna hardcoded (`text-muted-foreground`, `border-border/50`, dll.)
   di dalam aside menjadi `text-sidebar-foreground/75`, `border-sidebar-border`, dst.
5. Tingkatkan `body::before opacity: 0.6` → `1.0`
6. Tingkatkan color opacity di gradient-mesh: `0.35` → `0.55`, `0.28` → `0.50`
7. Darken background sedikit: `220 30% 97%` → `220 40% 96%`

**Lesson:**
Selalu pakai CSS variable sidebar (`bg-sidebar`, `text-sidebar-foreground`, dll.)
bukan generic card/muted vars — agar sidebar bisa di-theme secara independen.

---

## 15. Superadmin Hanya Melihat Data Sendiri di Tabel Profiles

**Konteks:** `GET /api/users` — superadmin hanya mendapat 1 baris (data sendiri) padahal ada banyak user.

**Root Cause — dua lapisan masalah:**

1. **`createServiceClient` pakai `createServerClient` dari `@supabase/ssr`.**
   `@supabase/ssr` selalu membaca cookie session JWT dan menyertakannya di request.
   Meskipun service role key dipass sebagai `supabaseKey`, ketika ada cookie session aktif,
   library lebih memilih JWT dari cookie. Akibatnya RLS tetap diterapkan dengan konteks
   user yang sedang login — bukan service role yang bypass RLS.

2. **RLS policy `profiles_read_own` hanya mengizinkan `get_my_role() = 'admin'`.**
   Superadmin punya role `'superadmin'` di DB, bukan `'admin'`, sehingga policy menolak
   akses baca ke profil user lain. User hanya bisa baca baris miliknya sendiri.

**Fix:**

**A. `src/lib/supabase/server.ts`** — ganti `createServiceClient` agar pakai
`createClient` dari `@supabase/supabase-js` langsung (bukan `createServerClient` dari `@supabase/ssr`):
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```
Client ini tidak pernah melihat cookie — selalu pakai service role key → RLS bypass total.
Fungsi sekarang synchronous; semua `await createServiceClient()` di API routes tetap valid
(await pada non-Promise value langsung return value-nya).

**B. `supabase/migrations/006_fix_rls_for_superadmin.sql`** — update semua policy RLS
yang hardcode `= 'admin'` agar juga izinkan `'superadmin'`:
```sql
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('admin', 'superadmin'));
```
Dan policy tulis, items, transactions, dll. — jalankan di Supabase SQL Editor.

**Pelajaran:**
- Jangan pakai `createServerClient` dari `@supabase/ssr` untuk admin operations.
  `@supabase/ssr` dirancang untuk user-facing operations dengan cookie-based auth.
- Untuk operasi yang butuh bypass RLS, selalu pakai `createClient` dari `@supabase/supabase-js`
  dengan service role key dan `auth: { autoRefreshToken: false, persistSession: false }`.
- Setiap kali menambah role baru, update SEMUA policy RLS yang hardcode nama role lama.

---

## 16. Hapus Produk Diam-diam Gagal (Silent Delete Failure)

**Konteks:** Superadmin klik Hapus di halaman Produk, konfirmasi OK, tapi produk tidak terhapus dan tidak ada pesan error.

**Root Cause — dua lapisan:**

1. **Client tidak mengecek response.**
   ```ts
   // ❌ Kode lama — response diabaikan
   const handleDelete = async (id: string) => {
     if (!confirm('Hapus barang ini?')) return
     await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
     loadItems()  // dipanggil meskipun delete gagal
   }
   ```
   Apapun yang dikembalikan API (200, 403, 500), client selalu memanggil `loadItems()`.
   Hasilnya: data tidak berubah, tidak ada pesan error — seolah tidak terjadi apa-apa.

2. **Foreign Key Constraint PostgreSQL (kode 23503).**
   Tabel `transaction_items` memiliki kolom `item_id UUID REFERENCES items(id)` tanpa
   `ON DELETE CASCADE`. Produk yang sudah pernah digunakan dalam transaksi **tidak bisa**
   dihapus — PostgreSQL menolak dengan FK violation. API mengembalikan error tapi client
   mengabaikannya (lihat poin 1).

**Fix:**

**`ItemsClient.tsx`** — cek `res.ok` dan tampilkan error:
```ts
const handleDelete = async (id: string, name: string) => {
  if (!confirm(`Hapus barang "${name}"?`)) return
  const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    alert(data.error || 'Gagal menghapus barang.')
    return
  }
  loadItems()
}
```

**`/api/items/route.ts`** — tangkap FK violation dan beri pesan yang dapat dipahami user:
```ts
if (error) {
  const msg = error.code === '23503'
    ? 'Produk tidak bisa dihapus karena sudah digunakan dalam transaksi...'
    : error.message
  return NextResponse.json({ error: msg }, { status: 500 })
}
```

**Pelajaran:**
- Selalu `await` dan cek `res.ok` pada setiap fetch mutasi (DELETE/POST/PUT).
  Jangan panggil reload/state-update sebelum memastikan operasi berhasil.
- Postgres FK violation = kode error `23503`. Deteksi ini dan terjemahkan ke
  pesan yang ramah untuk user.
- Produk yang sudah ada di transaksi sebaiknya tidak dihapus (merusak history laporan).
  Pertimbangkan fitur "arsip/nonaktifkan" sebagai alternatif hard delete.

---

## Pola Umum yang Perlu Diperhatikan

| # | Pola | Catatan |
|---|---|---|
| 1 | Selalu cek apakah icon lucide baru sudah ada di bundle sebelum import | Turbopack lazy-compile per icon; halaman bisa blank tanpa error |
| 2 | Jangan pakai `sticky` dan `fixed` di class yang sama tanpa breakpoint prefix | CSS specificity tidak bergantung pada urutan di HTML, tapi di stylesheet |
| 3 | Gunakan `overflow-y-auto` bukan `overflow-hidden` untuk area konten yang perlu scroll | |
| 4 | Setiap kali tambah role baru ke sistem, update: (1) DB constraint, (2) proxy.ts, (3) semua `verifyAdmin()` helper di API routes, (4) Sidebar NAV_ITEMS, (5) page-level `requireRole()`, (6) RLS policies di DB | |
| 5 | Supabase password tidak bisa dibaca — hanya bisa di-reset | bcrypt hash, satu arah |
| 6 | Vercel "Redeploy" button = deploy commit yang sama, bukan commit terbaru | |
| 7 | Gunakan CSS variable sidebar (`bg-sidebar`, `text-sidebar-foreground`) bukan card vars di dalam `<aside>` | Agar sidebar bisa di-theme independen dari konten utama |
| 8 | Saat menambah role baru ke sistem: checklist 6 titik — DB constraint, proxy.ts, API verifyAdmin, Sidebar NAV_ITEMS, page requireRole, RLS policies | Lewatin satu → 403 atau redirect tak terduga |
| 9 | Untuk admin operations yang butuh bypass RLS: pakai `createClient` dari `@supabase/supabase-js` bukan `createServerClient` dari `@supabase/ssr` | `@supabase/ssr` selalu menyertakan cookie session JWT yang membuat RLS tetap aktif |
| 10 | Setiap fetch mutasi (DELETE/POST/PUT): selalu `await`, cek `res.ok`, tampilkan error sebelum reload | Silent fail = UX buruk dan debugging sulit |
