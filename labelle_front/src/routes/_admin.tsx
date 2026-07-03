import { createFileRoute, redirect } from '@tanstack/react-router'
import AppLayout from '~/components/layout/AppLayout'

export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: AppLayout,
})
