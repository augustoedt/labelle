import { createFileRoute, redirect } from '@tanstack/react-router'
import MinhaAgendaPage from '~/pages/MinhaAgenda'

export const Route = createFileRoute('/_staff/minha-agenda')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'profissional') {
      throw redirect({ to: '/' })
    }
  },
  component: MinhaAgendaPage,
})
