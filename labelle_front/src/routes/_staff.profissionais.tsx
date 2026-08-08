import { createFileRoute, redirect } from '@tanstack/react-router'
import ProfessionalsPage from '~/pages/Professionals'

export const Route = createFileRoute('/_staff/profissionais')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: ProfessionalsPage,
})
