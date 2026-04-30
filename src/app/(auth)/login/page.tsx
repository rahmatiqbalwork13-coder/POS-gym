'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => login(formData),
    null
  )

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Koperasi Gym POS</h1>
          <p className="text-sm text-muted-foreground mt-1">Masuk ke akun Anda</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="kasir@koperasi.com"
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-center text-muted-foreground">
          Gunakan Google Chrome atau Microsoft Edge untuk fitur printer.
        </p>
      </div>
    </div>
  )
}
