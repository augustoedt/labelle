import { createFileRoute, redirect } from '@tanstack/react-router'
import AgendaPage from '~/pages/Agenda'

export const Route = createFileRoute('/_staff/agenda')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: AgendaPage,
})
