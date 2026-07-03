import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '~/utils/session'

const API_BASE = process.env.LABELLE_API_URL || 'http://localhost:4000'

export const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  return session.data.user || null
})

export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${API_BASE}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

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
