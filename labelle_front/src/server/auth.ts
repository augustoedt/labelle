import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '~/utils/session'
import { ensureInternalNetworking } from './api'

const API_BASE = process.env.LABELLE_API_URL || 'http://localhost:4000'

export const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  return session.data.user || null
})

export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    await ensureInternalNetworking()

    let res: Response
    try {
      res = await fetch(`${API_BASE}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (err: any) {
      console.error('loginFn fetch to backend failed:', err?.cause || err)
      return { error: true, message: 'Não foi possível conectar ao servidor' }
    }

    const json = await res.json()

    if (!res.ok) {
      return { error: true, message: json.error || 'Email ou senha inválidos' }
    }

    const session = await useAppSession()
    await session.update({ token: json.token, user: json.user })

    return { error: false, user: json.user }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
})
