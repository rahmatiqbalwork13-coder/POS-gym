'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types'

interface UserRow {
  id: string
  full_name: string | null
  email: string
  role: Role
  active: boolean
}

const ROLES: Role[] = ['admin', 'ketua', 'staff']
const ROLE_LABELS: Record<Role, string> = { admin: 'Super Admin', ketua: 'Ketua', staff: 'Staff Kasir' }

interface FormState {
  id?: string
  email: string
  password: string
  full_name: string
  role: Role
}

const EMPTY: FormState = { email: '', password: '', full_name: '', role: 'staff' }

export function UsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Pengguna</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="size-4" /> Tambah Pengguna
        </Button>
      </div>

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{form.id ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
              <button onClick={() => setForm(null)}><X className="size-4 text-muted-foreground" /></button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-3">
              {[
                ['Nama Lengkap', 'full_name', 'text', 'Andi Santoso'],
                ...(!form.id ? [['Email', 'email', 'email', 'kasir@koperasi.com']] : []),
                ...(!form.id ? [['Password', 'password', 'password', '••••••••']] : []),
              ].map(([label, key, type, placeholder]) => (
                <div key={key as string} className="space-y-1.5">
                  <label className="text-sm font-medium">{label as string}</label>
                  <input
                    type={type as string}
                    value={(form as Record<string, string>)[key as string]}
                    onChange={e => setForm(f => f ? { ...f, [key as string]: e.target.value } : f)}
                    placeholder={placeholder as string}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => f ? { ...f, role: e.target.value as Role } : f)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
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

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat data...</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada pengguna.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" />
                      </button>
                      {u.active && (
                        <button onClick={() => handleDeactivate(u.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs">
                          Nonaktifkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
