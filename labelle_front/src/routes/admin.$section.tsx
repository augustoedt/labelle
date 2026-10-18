import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import Agenda from '~/pages/Agenda'
import Clients from '~/pages/Clients'
import Services from '~/pages/Services'
import Products from '~/pages/Products'
import Professionals from '~/pages/Professionals'
import Finance from '~/pages/Finance'
import Reports from '~/pages/Reports'
import Promotions from '~/pages/Promotions'
import Loyalty from '~/pages/Loyalty'
import Reminders from '~/pages/Reminders'
import Settings from '~/pages/Settings'
import More from '~/pages/More'
import { validateStaffSearch } from '~/lib/staffRoutes'

const pages: Record<string, ComponentType> = {
  agenda: Agenda, clientes: Clients, servicos: Services, produtos: Products,
  profissionais: Professionals, financeiro: Finance, relatorios: Reports,
  promocoes: Promotions, fidelidade: Loyalty, lembretes: Reminders,
  configuracoes: Settings, mais: More,
}
export const Route = createFileRoute('/admin/$section')({
  validateSearch: validateStaffSearch,
  beforeLoad: ({ params, location }) => {
    const search = location.search as Record<string, unknown>
    if (params.section === 'clientes' && search.q) {
      throw redirect({ to: '/admin/$section', params, search: { ...search, q: undefined } as never, replace: true })
    }
  },
  component: () => {
    const { section } = Route.useParams()
    const Page = pages[section]
    if (!Page) throw notFound()
    return <Page />
  },
})
