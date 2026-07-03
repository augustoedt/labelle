import { createFileRoute, redirect } from '@tanstack/react-router'
import AppLayout from '~/components/layout/AppLayout'
import DashboardPage from '~/pages/Dashboard'
import ClientApp from '~/pages/ClientApp'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user?.role === 'profissional') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: RootIndex,
})

function RootIndex() {
  const { user } = Route.useRouteContext()

  if (user?.role === 'admin') {
    return (
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    )
  }

  return <ClientApp />
}
