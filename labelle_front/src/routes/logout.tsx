import { redirect, createFileRoute } from '@tanstack/react-router'
import { logoutFn } from '~/server/auth'

export const Route = createFileRoute('/logout')({
  preload: false,
  loader: async () => {
    await logoutFn()
    throw redirect({ href: '/' })
  },
})
