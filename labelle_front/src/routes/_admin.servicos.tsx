import { createFileRoute } from '@tanstack/react-router'
import ServicesPage from '~/pages/Services'

export const Route = createFileRoute('/_admin/servicos')({
  component: ServicesPage,
})
