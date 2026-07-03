import { useSession } from '@tanstack/react-start/server'

export type SessionUser = {
  id: string
  email: string
  role: 'admin' | 'profissional' | 'user'
}

type AppSessionData = {
  token: string
  user: SessionUser
}

export function useAppSession() {
  return useSession<AppSessionData>({
    password:
      process.env.SESSION_SECRET ||
      'labelle-dev-session-secret-change-before-shipping-to-prod-32chars',
  })
}
