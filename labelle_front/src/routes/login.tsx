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
    <div className="fixed inset-0 page-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <LaBelleLogo size="lg" />
        </div>
        <h1 className="font-heading text-2xl text-center mb-6">Entrar</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ email, password })
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
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
