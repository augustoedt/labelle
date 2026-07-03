import { createFileRoute } from '@tanstack/react-router'
import ClientApp from '~/pages/ClientApp'

export const Route = createFileRoute('/app')({
  component: ClientApp,
})
