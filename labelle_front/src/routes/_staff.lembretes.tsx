import { createFileRoute, redirect } from '@tanstack/react-router'
import RemindersPage from '~/pages/Reminders'

export const Route = createFileRoute('/_staff/lembretes')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: RemindersPage,
})
