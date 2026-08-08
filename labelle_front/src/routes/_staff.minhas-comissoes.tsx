import { createFileRoute, redirect } from '@tanstack/react-router'
import MinhasComissoesPage from '~/pages/MinhasComissoes'

export const Route = createFileRoute('/_staff/minhas-comissoes')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'profissional') {
      throw redirect({ to: '/' })
    }
  },
  component: MinhasComissoesPage,
})
