import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { loginFn } from '~/server/auth'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import LaBelleLogo from '~/components/ui/LaBelleLogo'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useServerFn(loginFn)

  const mutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => login({ data }),
    onSuccess: async (result) => {
      if (result.error) return
      await router.invalidate()
      router.navigate({ to: result.user.role === 'admin' ? '/' : '/minha-agenda' })
    },
  })

  return (
    <div className="min-h-dvh page-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card/95 rounded-3xl border border-border/60 shadow-[0_18px_50px_-30px_hsl(var(--foreground)/0.5)] p-7">
        <div className="flex justify-center mb-7">
          <LaBelleLogo size="lg" />
        </div>
        <div className="text-center mb-7">
          <h1 className="font-heading text-[1.75rem] leading-none tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-2">Acesse a gestão do La Belle Studio</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ email, password })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-muted-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {mutation.data?.error ? (
            <p className="text-sm text-destructive">{mutation.data.message}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
