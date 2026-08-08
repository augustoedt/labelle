import { createFileRoute, redirect } from '@tanstack/react-router'
import ReportsPage from '~/pages/Reports'

export const Route = createFileRoute('/_staff/relatorios')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: ReportsPage,
})
