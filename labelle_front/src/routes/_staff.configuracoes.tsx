import { createFileRoute, redirect } from '@tanstack/react-router'
import SettingsPage from '~/pages/Settings'

export const Route = createFileRoute('/_staff/configuracoes')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: SettingsPage,
})
