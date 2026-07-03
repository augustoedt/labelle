import { createFileRoute, redirect } from '@tanstack/react-router'
import ProfissionalLayout from '~/components/layout/ProfissionalLayout'

export const Route = createFileRoute('/_professional')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'profissional') {
      throw redirect({ to: '/' })
    }
  },
  component: ProfissionalLayout,
})
