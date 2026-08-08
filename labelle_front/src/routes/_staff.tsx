import { createFileRoute, redirect } from '@tanstack/react-router'
import AppLayout from '~/components/layout/AppLayout'

export const Route = createFileRoute('/_staff')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (!['admin', 'profissional'].includes(context.user.role)) {
      throw redirect({ to: '/' })
    }
  },
  component: AppLayout,
})
