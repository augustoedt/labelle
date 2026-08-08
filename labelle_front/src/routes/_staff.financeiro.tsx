import { createFileRoute, redirect } from '@tanstack/react-router'
import FinancePage from '~/pages/Finance'

export const Route = createFileRoute('/_staff/financeiro')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: FinancePage,
})
