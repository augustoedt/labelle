import { createFileRoute } from '@tanstack/react-router'
import ServicesPage from '~/pages/Services'

export const Route = createFileRoute('/_staff/servicos')({
  component: ServicesPage,
})
