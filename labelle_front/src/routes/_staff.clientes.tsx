import { createFileRoute } from '@tanstack/react-router'
import ClientsPage from '~/pages/Clients'

export const Route = createFileRoute('/_staff/clientes')({
  component: ClientsPage,
})
