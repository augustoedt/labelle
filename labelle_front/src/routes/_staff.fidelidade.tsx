import { createFileRoute, redirect } from '@tanstack/react-router'
import LoyaltyPage from '~/pages/Loyalty'

export const Route = createFileRoute('/_staff/fidelidade')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: LoyaltyPage,
})
