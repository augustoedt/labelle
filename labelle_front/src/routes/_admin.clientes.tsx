import { createFileRoute } from '@tanstack/react-router'
import ClientsPage from '~/pages/Clients'

export const Route = createFileRoute('/_admin/clientes')({
  component: ClientsPage,
})
