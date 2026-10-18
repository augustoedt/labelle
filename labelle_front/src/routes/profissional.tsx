import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AppLayout from '~/components/layout/AppLayout'
import { roleHome, safeStaffReturnTo } from '~/lib/staffRoutes'
export const Route = createFileRoute('/profissional')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/login', search: { returnTo: safeStaffReturnTo(location.href, 'profissional') || '/profissional/agenda' } as never })
    if (context.user.role !== 'profissional') throw redirect({ to: roleHome(context.user.role) as never })
  },
  component: () => <AppLayout><Outlet /></AppLayout>,
})
