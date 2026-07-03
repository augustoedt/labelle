import { createFileRoute } from '@tanstack/react-router'
import MinhaAgendaPage from '~/pages/MinhaAgenda'

export const Route = createFileRoute('/_professional/minha-agenda')({
  component: MinhaAgendaPage,
})
