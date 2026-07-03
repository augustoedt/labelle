import { createFileRoute } from '@tanstack/react-router'
import AgendaPage from '~/pages/Agenda'

export const Route = createFileRoute('/_admin/agenda')({
  component: AgendaPage,
})
