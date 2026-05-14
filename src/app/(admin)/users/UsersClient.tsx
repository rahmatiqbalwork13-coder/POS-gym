'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, X, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types'

interface UserRow {
  id: string
  full_name: string | null
  email: string
  role: Role
  active: boolean
}

const ROLES: Role[] = ['superadmin', 'admin', 'ketua', 'staff']
const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  ketua: 'Ketua',
  staff: 'Staff Kasir',
}
const ROLE_COLORS: Record<Role, string> = {
  superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ketua: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  staff: 'bg-muted text-muted-foreground',
}

interface FormState {
  id?: string
  email: string
  password: string
  full_name: string
  role: Role
}

interface PasswordForm {
  userId: string
  userName: string
  password: string
  confirm: string
  showPassword: boolean
}

const EMPTY: FormState = { email: '', password: '', full_name: '', role: 'staff' }

export function UsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentRole, setCurrentRole] = useState<Role | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [passwordForm, setPasswordForm] = useState<PasswordForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSuperadmin = currentRole === 'superadmin'

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  const loadCurrentUser = async () => {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const data = await res.json()
      setCurrentRole(data.role)
      setCurrentUserId(data.id)
    }
  }

  useEffect(() => {
    loadCurrentUser()
    load()
  }, [])

  const openCreate = () => { setError(null); setForm(EMPTY) }
  const openEdit = (u: UserRow) => {
    setError(null)
    setForm({ id: u.id, email: u.email, password: '', full_name: u.full_name ?? '', role: u.role })
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true); setError(null)

    const res = await fetch('/api/users', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSaving(false); setForm(null); load()
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Nonaktifkan akun ini? User tidak akan bisa login.')) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    load()
  }

  const openPasswordForm = (u: UserRow) => {
    setPwError(null)
    setPwSuccess(null)
    setPasswordForm({ userId: u.id, userName: u.full_name || u.email, password: '', confirm: '', showPassword: false })
  }

  const handleChangePassword = async () => {
    if (!passwordForm) return
    setPwError(null)
    setPwSuccess(null)

    if (!passwordForm.password) { setPwError('Password tidak boleh kosong.'); return }
    if (passwordForm.password.length < 6) { setPwError('Password minimal 6 karakter.'); return }
    if (passwordForm.password !== passwordForm.confirm) { setPwError('Konfirmasi password tidak cocok.'); return }

    setPwSaving(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: passwordForm.userId, password: passwordForm.password }),
    })
    const data = await res.json()
    setPwSaving(false)

    if (!res.ok) { setPwError(data.error || 'Gagal mengganti password.'); return }
    setPwSuccess(`Password "${passwordForm.userName}" berhasil diganti.`)
    setPasswordForm(f => f ? { ...f, password: '', confirm: '' } : f)
  }

  const handleDeletePermanent = async (u: UserRow) => {
    if (!confirm(
      `HAPUS PERMANEN akun "${u.full_name || u.email}"?\n\n` +
      `Semua data profil akan dihapus permanen dan tidak bisa dipulihkan.\n\n` +
      `Ketik OK untuk konfirmasi.`
    )) return

    const res = await fetch(`/api/users?id=${u.id}&permanent=true`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Gagal menghapus user')
    }
    load()
  }

  // Role options shown in form dropdown, based on current user's role
  const availableRoles: Role[] = isSuperadmin
    ? ['superadmin', 'admin', 'ketua', 'staff']
    : ['admin', 'ketua', 'staff']

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h1 className="text-lg lg:text-xl font-semibold">Pengguna</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 w-full sm:w-auto">
          <Plus className="size-4" /> Tambah Pengguna
        </Button>
      </div>

      {isSuperadmin && (
        <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 w-fit">
          <ShieldCheck className="size-3.5 shrink-0" />
          Mode Superadmin — hapus permanen & assign semua role tersedia
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{form.id ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
              <button type="button" onClick={() => setForm(null)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => f ? { ...f, full_name: e.target.value } : f)}
                  placeholder="Andi Santoso"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>

              {!form.id && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => f ? { ...f, email: e.target.value } : f)}
                      placeholder="kasir@koperasi.com"
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => f ? { ...f, password: e.target.value } : f)}
                      placeholder="••••••••"
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => f ? { ...f, role: e.target.value as Role } : f)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Ganti Password</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{passwordForm.userName}</p>
              </div>
              <button type="button" onClick={() => setPasswordForm(null)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Password yang sudah ada tidak bisa dilihat karena disimpan terenkripsi. Kamu bisa menetapkan password baru di sini.
            </div>

            {pwError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">{pwSuccess}</p>}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password Baru</label>
                <input
                  type={passwordForm.showPassword ? 'text' : 'password'}
                  value={passwordForm.password}
                  onChange={e => setPasswordForm(f => f ? { ...f, password: e.target.value } : f)}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Konfirmasi Password</label>
                <input
                  type={passwordForm.showPassword ? 'text' : 'password'}
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm(f => f ? { ...f, confirm: e.target.value } : f)}
                  placeholder="Ulangi password baru"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={passwordForm.showPassword}
                  onChange={e => setPasswordForm(f => f ? { ...f, showPassword: e.target.checked } : f)}
                  className="rounded border-input"
                />
                Tampilkan password
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setPasswordForm(null)}>Tutup</Button>
              <Button onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? 'Menyimpan...' : 'Simpan Password'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Memuat data...</span>
        </div>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="lg:hidden space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="size-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada pengguna.</p>
              </div>
            ) : users.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.full_name || '(tanpa nama)'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {u.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {isSuperadmin && (
                      <button
                        type="button"
                        onClick={() => openPasswordForm(u)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        title="Ganti password"
                      >
                        <ShieldCheck className="size-4" />
                      </button>
                    )}
                    {u.active && !isSuperadmin && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(u.id)}
                        className="p-1.5 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600 text-xs"
                        title="Nonaktifkan"
                      >
                        Nonaktifkan
                      </button>
                    )}
                    {isSuperadmin && (
                      <button
                        type="button"
                        onClick={() => handleDeletePermanent(u)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Hapus permanen"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden lg:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Nama', 'Email', 'Role', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada pengguna.</td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.full_name || '(tanpa nama)'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {u.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {isSuperadmin && (
                          <button
                            type="button"
                            onClick={() => openPasswordForm(u)}
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            title="Ganti password"
                          >
                            <ShieldCheck className="size-3.5" />
                          </button>
                        )}
                        {u.active && !isSuperadmin && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(u.id)}
                            className="p-1.5 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600 text-xs whitespace-nowrap"
                          >
                            Nonaktifkan
                          </button>
                        )}
                        {isSuperadmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePermanent(u)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Hapus permanen"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
